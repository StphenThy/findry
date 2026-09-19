/**
 * `npm run migrate:one-role` — enforce "one email = one account = one role"
 * on an existing database (accounts that picked up a second role through the
 * old /auth/add-role flow).
 *
 * For every user with two roles:
 *   - if the extra role's profile is unused (employer with no jobs, or seeker
 *     with no applications and onboarding not finished) → the profile and the
 *     role are removed;
 *   - otherwise the extra role is split into its own account. The new email is
 *     `<local>+<role>@<domain>` (or a name from SPLIT_EMAILS below), with the
 *     same password hash, and the profile + its messages are re-pointed to it.
 *
 * Pass --dry-run to only print what would happen.
 */
import { connectDB, disconnectDB } from '../db';
import { Application, EmployerProfile, Job, Message, SeekerProfile, User } from '../models';
import type { Role } from '../types';

/** Explicit new emails for known accounts (seeded demo data). */
const SPLIT_EMAILS: Record<string, Partial<Record<Role, string>>> = {
  'demo@findry.demo': { employer: 'hr@sprout.demo' },
};

/** Which role the account keeps under its original email. Default: the first role it registered with. */
const KEEP: Record<string, Role> = {
  'demo@findry.demo': 'seeker',
};

const dry = process.argv.includes('--dry-run');
const log = (msg: string) => console.log(`[one-role]${dry ? ' (dry-run)' : ''} ${msg}`);

(async () => {
  const { inMemory } = await connectDB();
  if (inMemory) {
    console.warn('[one-role] MONGODB_URI is empty — nothing to migrate in an in-memory DB.');
    await disconnectDB();
    process.exit(1);
  }

  const users = await User.find({ 'roles.1': { $exists: true } });
  if (users.length === 0) log('every account already has exactly one role — nothing to do');

  for (const u of users) {
    const keep: Role = KEEP[u.email] ?? u.roles[0];
    const extra = u.roles.find((r) => r !== keep) as Role | undefined;
    if (!extra) continue;

    const profile = extra === 'employer' ? await EmployerProfile.findOne({ userId: u._id }) : await SeekerProfile.findOne({ userId: u._id });
    if (!profile) {
      log(`${u.email}: has role "${extra}" but no profile → dropping the role`);
      if (!dry) {
        u.roles = [keep];
        u.lastRole = keep;
        await u.save();
      }
      continue;
    }

    const used = extra === 'employer' ? (await Job.countDocuments({ employerId: profile._id })) > 0 : (await Application.countDocuments({ seekerId: profile._id })) > 0 || !!(profile as { onboardingComplete?: boolean }).onboardingComplete;

    if (!used) {
      log(`${u.email}: "${extra}" profile is unused → deleting it, keeping "${keep}"`);
      if (!dry) {
        await profile.deleteOne();
        u.roles = [keep];
        u.lastRole = keep;
        await u.save();
      }
      continue;
    }

    // Split the used profile into its own account.
    const [local, domain] = u.email.split('@');
    const newEmail = SPLIT_EMAILS[u.email]?.[extra] ?? `${local}+${extra}@${domain}`;
    if (await User.findOne({ email: newEmail })) {
      log(`${u.email}: wanted to move "${extra}" to ${newEmail} but that email already exists — skipping (resolve manually)`);
      continue;
    }
    const contactName = extra === 'employer' ? `${(profile as { companyName?: string }).companyName ?? 'Company'} HR` : u.name;
    log(`${u.email}: "${extra}" profile is in use → moving it to a new account ${newEmail} (same password)`);
    if (dry) continue;

    const nu = await User.create({ email: newEmail, name: contactName, passwordHash: u.passwordHash, roles: [extra], lastRole: extra, avatarUrl: extra === 'seeker' ? u.avatarUrl : undefined });
    profile.userId = nu._id;
    await profile.save();

    // Re-point message participants for conversations that belong to the moved profile.
    const appIds = extra === 'employer' ? (await Application.find({ employerId: profile._id }).select('_id')).map((a) => a._id) : (await Application.find({ seekerId: profile._id }).select('_id')).map((a) => a._id);
    if (appIds.length) {
      const from = await Message.updateMany({ applicationId: { $in: appIds }, fromUserId: u._id }, { $set: { fromUserId: nu._id } });
      const to = await Message.updateMany({ applicationId: { $in: appIds }, toUserId: u._id }, { $set: { toUserId: nu._id } });
      log(`  re-pointed ${from.modifiedCount + to.modifiedCount} message refs across ${appIds.length} application(s)`);
    }

    u.roles = [keep];
    u.lastRole = keep;
    await u.save();
  }

  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

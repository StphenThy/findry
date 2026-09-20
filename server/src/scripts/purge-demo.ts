/**
 * `npm run purge-demo` — remove every seeded demo account (`*.demo` emails)
 * and everything that hangs off them: profiles, jobs, applications, messages.
 * Real user accounts are untouched. Pass --dry-run to only print counts.
 */
import { connectDB, disconnectDB } from '../db';
import { Application, EmployerProfile, Job, Message, SeekerProfile, User } from '../models';

const dry = process.argv.includes('--dry-run');

(async () => {
  const { inMemory } = await connectDB();
  if (inMemory) {
    console.warn('[purge-demo] MONGODB_URI is empty — nothing to purge in an in-memory DB.');
    await disconnectDB();
    process.exit(1);
  }
  const users = await User.find({ email: /.demo$/i }).select('_id email');
  const userIds = users.map((u) => u._id);
  const employers = await EmployerProfile.find({ userId: { $in: userIds } }).select('_id');
  const seekers = await SeekerProfile.find({ userId: { $in: userIds } }).select('_id');
  const employerIds = employers.map((e) => e._id);
  const seekerIds = seekers.map((s) => s._id);
  const jobs = await Job.find({ employerId: { $in: employerIds } }).select('_id');
  const jobIds = jobs.map((j) => j._id);
  const apps = await Application.find({ $or: [{ employerId: { $in: employerIds } }, { seekerId: { $in: seekerIds } }, { jobId: { $in: jobIds } }] }).select('_id');
  const appIds = apps.map((a) => a._id);
  const messages = await Message.countDocuments({ $or: [{ applicationId: { $in: appIds } }, { fromUserId: { $in: userIds } }, { toUserId: { $in: userIds } }] });

  console.log(`[purge-demo]${dry ? ' (dry-run)' : ''} ${users.length} users, ${employers.length} employers, ${seekers.length} seekers, ${jobs.length} jobs, ${apps.length} applications, ${messages} messages`);
  for (const u of users) console.log('  ' + u.email);
  if (!dry) {
    await Message.deleteMany({ $or: [{ applicationId: { $in: appIds } }, { fromUserId: { $in: userIds } }, { toUserId: { $in: userIds } }] });
    await Application.deleteMany({ _id: { $in: appIds } });
    await Job.deleteMany({ _id: { $in: jobIds } });
    await EmployerProfile.deleteMany({ _id: { $in: employerIds } });
    await SeekerProfile.deleteMany({ _id: { $in: seekerIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    console.log('[purge-demo] done');
  }
  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

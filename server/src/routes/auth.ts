import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config, isProd } from '../config';
import { requireAuth, signToken, wrap } from '../middleware/auth';
import { LOCKOUT, authLimiter, resetLimiter } from '../middleware/security';
import { EmployerProfile, SeekerProfile, User } from '../models';
import type { IUser } from '../models';
import { mailConfigured, sendMail } from '../services/mail';
import type { Role } from '../types';

export const authRouter = Router();

const roleSchema = z.enum(['seeker', 'employer']);

/** Password policy shared by signup, reset and change-password. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain at least one letter and one number');

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: passwordSchema,
  role: roleSchema,
  // employer-only extras collected on the tailored signup form
  companyName: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(80).optional(),
});

async function profileStatus(userId: unknown) {
  const [seeker, employer] = await Promise.all([
    SeekerProfile.findOne({ userId }).select('onboardingComplete'),
    EmployerProfile.findOne({ userId }).select('onboardingComplete companyName'),
  ]);
  return {
    seekerOnboarded: !!seeker?.onboardingComplete,
    employerOnboarded: !!employer?.onboardingComplete,
    companyName: employer?.companyName ?? '',
  };
}

function publicUser(user: IUser) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    roles: user.roles,
    lastRole: user.lastRole,
    avatarUrl: user.avatarUrl,
  };
}

const roleLabel = (r: string) => (r === 'seeker' ? 'Job Seeker' : 'Employer');
const aRole = (r: string) => (r === 'seeker' ? 'a Job Seeker' : 'an Employer');

/**
 * POST /api/auth/signup
 * One email = one account = one role. If the email already exists we return
 * 409 with the role it is registered under so the client can point the user
 * to the right sign-in (or a different email for the other role).
 */
authRouter.post(
  '/signup',
  authLimiter,
  wrap(async (req, res) => {
    const body = signupSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email });
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
        code: 'ACCOUNT_EXISTS',
        existingRoles: existing.roles,
        requestedRole: body.role,
        hint: existing.roles.includes(body.role)
          ? `This email is already registered as ${aRole(body.role)} account. Sign in instead.`
          : `This email is registered as ${aRole(existing.roles[0])} account. To use Findry as ${aRole(body.role)}, create an account with a different email.`,
      });
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      email: body.email,
      name: body.name,
      passwordHash,
      roles: [body.role],
      lastRole: body.role,
    });
    if (body.role === 'seeker') await SeekerProfile.create({ userId: user._id });
    else
      await EmployerProfile.create({
        userId: user._id,
        companyName: body.companyName ?? '',
        industry: body.industry ?? '',
      });

    res.status(201).json({
      token: signToken(user._id, user.tokenVersion),
      user: publicUser(user),
      profiles: await profileStatus(user._id),
    });
  }),
);

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  /** Portal the user is signing in to. The account must be registered under it. */
  role: roleSchema.optional(),
});

authRouter.post(
  '/login',
  authLimiter,
  wrap(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email });

    // Account lockout: after LOCKOUT.maxFailures wrong passwords the account pauses for LOCKOUT.minutes.
    if (user?.lockUntil && user.lockUntil > new Date()) {
      const mins = Math.max(1, Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000));
      return res.status(423).json({ error: `Too many failed attempts. This account is locked for ${mins} more minute${mins === 1 ? '' : 's'}.`, code: 'ACCOUNT_LOCKED' });
    }
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      if (user) {
        user.failedLogins = (user.failedLogins ?? 0) + 1;
        if (user.failedLogins >= LOCKOUT.maxFailures) {
          user.lockUntil = new Date(Date.now() + LOCKOUT.minutes * 60000);
          user.failedLogins = 0;
        }
        await user.save();
      }
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (user.failedLogins || user.lockUntil) {
      user.failedLogins = 0;
      user.lockUntil = undefined;
    }
    // Role lock: a Job Seeker account cannot open the Employer portal and vice versa.
    if (body.role && !user.roles.includes(body.role)) {
      return res.status(403).json({
        error: `This email is registered as ${aRole(user.roles[0])} account. Sign in as ${aRole(user.roles[0])}, or create ${aRole(body.role)} account with a different email.`,
        code: 'ROLE_MISMATCH',
        registeredRoles: user.roles,
        requestedRole: body.role,
      });
    }
    if (body.role) user.lastRole = body.role;
    if (user.isModified()) await user.save();
    res.json({ token: signToken(user._id, user.tokenVersion), user: publicUser(user), profiles: await profileStatus(user._id) });
  }),
);

/* ── Password reset ──────────────────────────────────────────────────── */

/**
 * POST /api/auth/forgot-password { email }
 * Always answers 200 so the endpoint can't be used to check whether an email
 * is registered. When the account exists we store a hashed one-time token
 * (valid 1 hour) and email the link — or print it when mail isn't configured.
 */
authRouter.post(
  '/forgot-password',
  resetLimiter,
  wrap(async (req, res) => {
    const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);
    const user = await User.findOne({ email });
    let devResetUrl: string | undefined;
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = sha256(token);
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const base = config.clientUrls[0] ?? 'http://localhost:5173';
      const url = `${base}/reset-password?token=${token}`;
      await sendMail(
        user.email,
        'Reset your Findry password',
        `Hi ${user.name},\n\nSomeone asked to reset the password for your Findry account. If that was you, open this link within the next hour:\n\n${url}\n\nIf you didn't request this, you can ignore this email — your password won't change.`,
        `<p>Hi ${user.name},</p><p>Someone asked to reset the password for your Findry account. If that was you, click the link below within the next hour:</p><p><a href="${url}">Reset my password</a></p><p>If you didn't request this, you can ignore this email — your password won't change.</p>`,
      );
      if (!mailConfigured && !isProd) devResetUrl = url;
    }
    res.json({ ok: true, ...(devResetUrl ? { devResetUrl } : {}) });
  }),
);

/** POST /api/auth/reset-password { token, password } — one-time token, then every old session is signed out. */
authRouter.post(
  '/reset-password',
  authLimiter,
  wrap(async (req, res) => {
    const { token, password } = z.object({ token: z.string().min(20), password: passwordSchema }).parse(req.body);
    const user = await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.', code: 'RESET_INVALID' });
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.failedLogins = 0;
    user.lockUntil = undefined;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    res.json({ ok: true, role: user.roles[0] });
  }),
);

/* ── Account settings ────────────────────────────────────────────────── */

/** PATCH /api/auth/me { name?, email? } — edit the account itself (profiles have their own routes). */
authRouter.patch(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    const body = z.object({ name: z.string().trim().min(2).max(80).optional(), email: z.string().trim().email().optional() }).parse(req.body);
    const user = req.user!;
    if (body.email && body.email.toLowerCase() !== user.email) {
      if (await User.findOne({ email: body.email.toLowerCase() })) return res.status(409).json({ error: 'That email is already in use by another account.' });
      user.email = body.email.toLowerCase();
    }
    if (body.name) user.name = body.name;
    await user.save();
    res.json({ user: publicUser(user), profiles: await profileStatus(user._id) });
  }),
);

/**
 * POST /api/auth/change-password { currentPassword, newPassword }
 * Bumps tokenVersion (signing out every other device) and returns a fresh
 * token so the current session keeps working.
 */
authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }).parse(req.body);
    const user = req.user!;
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ error: 'Current password is incorrect.' });
    if (await bcrypt.compare(newPassword, user.passwordHash)) return res.status(400).json({ error: 'New password must be different from the current one.' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    res.json({ ok: true, token: signToken(user._id, user.tokenVersion) });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  wrap(async (req, res) => {
    res.json({ user: publicUser(req.user!), profiles: await profileStatus(req.user!._id) });
  }),
);

/** POST /api/auth/switch-role { role } — remembers the active portal. */
authRouter.post(
  '/switch-role',
  requireAuth,
  wrap(async (req, res) => {
    const { role } = z.object({ role: roleSchema }).parse(req.body);
    const user = req.user!;
    if (!user.roles.includes(role)) {
      return res.status(403).json({ error: `No ${role} profile on this account`, code: 'ROLE_MISSING', role });
    }
    user.lastRole = role;
    await user.save();
    res.json({ user: publicUser(user), profiles: await profileStatus(user._id) });
  }),
);

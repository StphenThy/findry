import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from '../config';

/**
 * HTTP hardening. CSP is left off because the API may also serve the built
 * React app (SERVE_CLIENT) which loads Google Fonts; every other helmet
 * default applies (nosniff, frameguard, HSTS, referrer policy, no X-Powered-By).
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: config.serveClient ? 'same-origin' : 'cross-origin' },
});

const tooMany = (what: string) => ({ error: `Too many ${what}. Please wait a few minutes and try again.`, code: 'RATE_LIMITED' });

/**
 * Whole-API ceiling per IP — generous enough for normal browsing (the Messages
 * page polls every 8-15 s, and a whole office can sit behind one IP), low
 * enough to blunt scraping. Health checks from the host never count.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  skip: (req) => req.path === '/health',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('requests'),
});

/** Credential endpoints: login, signup, password reset. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count
  message: tooMany('sign-in attempts'),
});

/** Forgot-password is unauthenticated and sends mail — keep it tight. */
export const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('password reset requests'),
});

/**
 * Account lockout after repeated failed logins (see routes/auth). Kept short:
 * anyone who knows an email can trigger it, so a long lock is a denial of service
 * against the real owner. The per-IP authLimiter does the heavy lifting.
 */
export const LOCKOUT = { maxFailures: 5, minutes: 5 };

/* ── Per-user limits on AI-backed endpoints ─────────────────────────────── */
const perUser = (limit: number, windowMs: number, what: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `u:${String(req.user._id)}` : `ip:${req.ip}`),
    validate: { keyGeneratorIpFallback: false },
    message: { error: `You've reached the limit for ${what}. Please try again later.`, code: 'AI_LIMIT' },
  });

/** Resume uploads run the AI parser — 10 per user per day is plenty. */
export const resumeParseLimiter = perUser(10, 24 * 60 * 60 * 1000, 'resume uploads today');
/** "Suggest skills" on the job form. */
export const suggestSkillsLimiter = perUser(20, 60 * 60 * 1000, 'skill suggestions this hour');
/** "How to improve this match" advice. */
export const gapAdviceLimiter = perUser(30, 60 * 60 * 1000, 'match advice this hour');

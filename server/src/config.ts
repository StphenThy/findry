import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// First run convenience: create server/.env from the example so `npm run dev` just works.
const envPath = path.resolve(__dirname, '..', '.env');
const examplePath = path.resolve(__dirname, '..', '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('[config] created server/.env from .env.example');
}
dotenv.config({ path: envPath });

const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === '' ? fallback : v.toLowerCase() === 'true';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientUrls: (process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  serveClient: bool(process.env.SERVE_CLIENT, false),

  mongoUri: process.env.MONGODB_URI?.trim() || '',
  seedOnStart: bool(process.env.SEED_ON_START, true),

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  aiProvider: (process.env.AI_PROVIDER || 'auto') as 'auto' | 'gemini' | 'local' | 'mock',
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  // Budget for real Gemini calls. Beyond these the local engine answers instead (never an error).
  ai: {
    dailyLimit: Number(process.env.AI_DAILY_CALL_LIMIT ?? 200),
    perMinuteLimit: Number(process.env.AI_PER_MINUTE_LIMIT ?? 8),
    cooldownMinutes: Number(process.env.AI_COOLDOWN_MINUTES ?? 15),
  },

  uploadDir: path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 8) * 1024 * 1024,

  // Outgoing mail (password resets). Leave SMTP_HOST empty to log links to the console instead.
  smtp: {
    host: process.env.SMTP_HOST?.trim() || '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Findry <no-reply@findry.local>',
  },
};

export const isProd = config.nodeEnv === 'production';

// Never run production on the placeholder secret — every session token would be forgeable.
if (isProd && (!process.env.JWT_SECRET || config.jwtSecret === 'dev-secret-change-me' || config.jwtSecret.length < 32)) {
  throw new Error('[config] JWT_SECRET must be set to a random string of at least 32 characters in production');
}
if (!isProd && config.jwtSecret === 'dev-secret-change-me') console.warn('[config] JWT_SECRET is the dev placeholder — set a real one in server/.env before deploying');

import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ZodError } from 'zod';
import { config, isProd } from './config';
import { connectDB } from './db';
import { applicationsRouter } from './routes/applications';
import { apiLimiter, securityHeaders } from './middleware/security';
import { authRouter } from './routes/auth';
import { employerRouter } from './routes/employer';
import { jobsRouter } from './routes/jobs';
import { messagesRouter } from './routes/messages';
import { seekerRouter } from './routes/seeker';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seed } from './seed';
import { getAI } from './services/ai';
import { aiUsageStatus } from './services/ai/guard';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render / Railway sit behind a proxy
  app.use(securityHeaders);
  app.use('/api', apiLimiter);

  app.use(
    cors({
      origin: (origin, cb) => {
        // allow same-origin / curl (no Origin header) and any configured client URL
        if (!origin || config.clientUrls.includes(origin) || config.clientUrls.includes('*')) return cb(null, true);
        cb(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', async (_req, res) =>
    res.json({ ok: true, env: config.nodeEnv, ai: getAI().name, aiUsage: await aiUsageStatus(), db: config.mongoUri ? 'atlas' : 'memory', time: new Date().toISOString() }),
  );
  if (!isProd) app.get('/api/demo-accounts', (_req, res) => res.json({ password: DEMO_PASSWORD, accounts: DEMO_ACCOUNTS }));

  app.use('/api/auth', authRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/seeker', seekerRouter);
  app.use('/api/employer', employerRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/messages', messagesRouter);

  // Single-server deploy: serve the built React app and let React Router handle deep links.
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  if (config.serveClient && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    console.log('[web] serving client from', clientDist);
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Central error handler — Zod validation → 400, multer → 400, everything else → 500
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
    }
    const e = err as { name?: string; message?: string; code?: string | number; status?: number };
    if (e.name === 'MulterError' || /resumes are accepted/.test(e.message ?? '')) return res.status(400).json({ error: e.message });
    if (e.code === 11000) return res.status(409).json({ error: 'Already exists' });
    if (e.message?.startsWith('Origin ')) return res.status(403).json({ error: e.message });
    console.error(err);
    res.status(e.status ?? 500).json({ error: isProd ? 'Something went wrong' : e.message ?? 'Server error' });
  });

  return app;
}

async function main() {
  const { inMemory } = await connectDB();
  if (config.seedOnStart) {
    const r = await seed();
    if (!r.skipped) {
      console.log(`[seed] demo data loaded (password: ${DEMO_PASSWORD})`);
      for (const a of DEMO_ACCOUNTS) console.log(`       ${a.email.padEnd(22)} ${a.role}`);
    }
  }
  getAI();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[web] Findry API listening on http://localhost:${config.port}  (db: ${inMemory ? 'in-memory' : 'mongodb'})`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}

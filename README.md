# Findry

AI-powered job matching for the Philippine tech market. Two fully separate portals — **Job Seeker** and **Employer** — that only meet at the point of application.

- Explainable match scores: `skills × 45% + experience × 30% + education × 25%`, with a full "why you match" breakdown and colour-coded skill matrix.
- AI resume parsing (Google Gemini free tier, or a built-in dictionary parser with no API key) → confirm/edit → live matches.
- Transparent ₱ salaries with TRAIN-law net estimates, PH benefits (13th month, HMO, SSS/PhilHealth/Pag-IBIG).
- Applications Kanban (Submitted → Viewed → Interview → Offer), employer reading receipts, in-app messaging.
- Employer post-job wizard with AI skill suggestions, weight matrix, salary benchmark and a live talent-pool simulation.
- Dual-profile safeguard: one email can hold both roles; a second sign-up prompts "add a profile", never a duplicate.
- Ghost mode, LinkedIn light-touch verification, response-time badges, high-contrast / larger-text toggles.

## Stack (MERN)

| Layer    | Tech                                                                     |
| -------- | ------------------------------------------------------------------------ |
| Client   | React 18 · Vite · TypeScript · Tailwind CSS (Stitch design tokens) · React Router |
| Server   | Node 20+ · Express · TypeScript · Mongoose · JWT + bcrypt · Zod · Multer |
| Database | MongoDB Atlas (free M0) — or an automatic in-memory MongoDB for local demos |
| AI       | `AIProvider` interface → `gemini` (free tier) · `local` (no keys) · `mock` (demo fixture) |

```
Findry/
├── client/   React app  (npm run dev → http://localhost:5173)
├── server/   Express API (npm run dev → http://localhost:4000)
├── render.yaml, DEPLOY.md
└── package.json  (npm workspaces: `npm run dev` starts both)
```

## Quick start

```bash
npm install          # installs both workspaces
npm run dev          # server :4000 + client :5173
```

That's it. With no `MONGODB_URI` set, the server starts an **in-memory MongoDB** (one-time ~600 MB binary download) and seeds demo data on every boot.

Open http://localhost:5173 and sign in with any demo account (password `password123`):

| Email               | What you get                                                                 |
| ------------------- | ---------------------------------------------------------------------------- |
| `maria@findry.demo` | Job seeker — Maria Santos, full pipeline (submitted → interview → offer)     |
| `hr@maya.demo`      | Employer — Maya, 4 live jobs, 9 ranked candidates                            |
| `demo@findry.demo`  | **Both roles** — seeker (Rafael Cruz) + employer (Sprout): try "Switch portal" |

Or sign up fresh as a seeker and upload any PDF/DOCX/TXT resume to see the parser.

### Configuration

Copy `server/.env.example` → `server/.env` (done automatically on first run if missing) and set:

| Var              | Default | Notes                                                                              |
| ---------------- | ------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`    | _(empty)_ | Atlas connection string. Empty = in-memory DB (data lost on restart).            |
| `AI_PROVIDER`    | `auto`  | `auto` → Gemini if a key is set, else `local`. Also `gemini`, `local`, `mock`.     |
| `GEMINI_API_KEY` | _(empty)_ | Free key from https://aistudio.google.com — resume parsing, skill suggestions, gap advice. |
| `JWT_SECRET`     | dev value | Change in production.                                                             |
| `CLIENT_URL`     | `http://localhost:5173` | Comma-separated allowed origins for CORS.                             |
| `SERVE_CLIENT`   | `false` | `true` = Express also serves `client/dist` (single-server deploy).                 |

Client: `client/.env.example` → `VITE_API_URL` (leave empty in dev; the Vite proxy forwards `/api`).

### Scripts

| Command                          | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `npm run dev`                    | Both apps with hot reload                      |
| `npm run build`                  | Compile server (`server/dist`) + client (`client/dist`) |
| `npm start`                      | Run the compiled server                        |
| `npm run seed` / `-- --force`    | Seed (or reset) an Atlas database with demo data |
| `npm run typecheck`              | TypeScript check for both workspaces           |

## How matching works

`server/src/services/matching/score.ts` — deterministic and reproducible:

1. **Skills (45%)** — required-skill overlap weighted by the job's core/ecosystem split (default 70/30); every skill is normalised through a curated alias dictionary (`React` = `ReactJS` = `react.js`).
2. **Experience (30%)** — years vs the job's minimum, full marks at 100%+, partial credit below.
3. **Education (25%)** — degree on file vs requirement; only a knockout if the employer says so.

The breakdown (matched / missing skills, each component's score and weight) is returned with every match so both portals can show it. The LLM is never in the scoring path — it only parses resumes, suggests skills for a post, and writes "how to close the gap" advice, and every LLM call falls back to the local engine on error.

## API overview

```
POST /api/auth/signup | login | add-role | switch-role      GET /api/auth/me
GET  /api/jobs, /api/jobs/stats, /api/jobs/:id               (public)
GET/PUT /api/seeker/profile      POST /api/seeker/resume    (multipart "resume")
GET  /api/seeker/matches?q&location&workSetup&industry&salaryMin&sort
GET  /api/seeker/jobs/:id        POST /api/seeker/jobs/:id/gap-advice
POST /api/seeker/saved/:jobId    GET /api/seeker/saved | dashboard
GET/PUT /api/employer/profile    GET /api/employer/dashboard | analytics | simulate
GET/POST /api/employer/jobs      GET/PUT/DELETE /api/employer/jobs/:id
POST /api/employer/ai/suggest-skills
POST /api/applications           GET /api/applications/mine | pipeline | :id
PATCH /api/applications/:id/status   POST /api/applications/:id/withdraw
GET  /api/messages/conversations?as=seeker|employer   GET/POST /api/messages/:applicationId
```

## Deploying

See [DEPLOY.md](DEPLOY.md) — MongoDB Atlas + Render (API) + Vercel (client), all on free tiers.

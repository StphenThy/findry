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

1. **Skills (45%)** — required-skill overlap weighted by the job's core/ecosystem split (default 70/30); every skill is normalised through a curated alias dictionary (`React` = `ReactJS` = `react.js`).
2. **Experience (30%)** — years vs the job's minimum, full marks at 100%+, partial credit below.
3. **Education (25%)** — degree on file vs requirement; only a knockout if the employer says so.

The breakdown (matched / missing skills, each component's score and weight) is returned with every match so both portals can show it. The LLM is never in the scoring path — it only parses resumes, suggests skills for a post, and writes "how to close the gap" advice, and every LLM call falls back to the local engine on error.


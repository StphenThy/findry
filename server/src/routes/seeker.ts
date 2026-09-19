import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import { Types } from 'mongoose';
import path from 'path';
import { z } from 'zod';
import { config } from '../config';
import { requireAuth, requireRole, wrap } from '../middleware/auth';
import { gapAdviceLimiter, resumeParseLimiter } from '../middleware/security';
import { Application, EmployerProfile, Job, computeCompletion } from '../models';
import type { IEmployerProfile } from '../models';
import { getAI } from '../services/ai';
import { computeMatch } from '../services/matching/score';
import { normalizeSkills } from '../services/matching/skills';
import { ACCEPTED_MIME, extensionOk, extractText } from '../services/resume/extractText';
import { jobView } from './helpers';

export const seekerRouter = Router();
seekerRouter.use(requireAuth, requireRole('seeker'));

fs.mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_MIME.has(file.mimetype) || extensionOk(file.originalname)) cb(null, true);
    else cb(new Error('Only PDF, DOCX or TXT resumes are accepted'));
  },
});

function profileView(p: NonNullable<Parameters<typeof computeCompletion>[0]>) {
  const completion = computeCompletion(p);
  return { ...p.toJSON(), id: String(p._id), completion };
}

/* ── Profile ─────────────────────────────────────────────────────────── */

seekerRouter.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ profile: profileView(req.seeker!), user: { name: req.user!.name, email: req.user!.email } });
  }),
);

const profileUpdateSchema = z.object({
  headline: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  workSetup: z.array(z.enum(['hybrid', 'remote', 'onsite'])).optional(),
  yearsExperience: z.number().min(0).max(50).optional(),
  skills: z.array(z.string().max(60)).max(80).optional(),
  experience: z.array(z.record(z.unknown())).max(20).optional(),
  education: z.array(z.record(z.unknown())).max(10).optional(),
  summary: z.string().max(2000).optional(),
  highlights: z.array(z.string().max(300)).max(10).optional(),
  links: z.object({ linkedin: z.string().max(200).optional(), github: z.string().max(200).optional(), portfolio: z.string().max(200).optional() }).optional(),
  salaryMin: z.number().min(0).optional().nullable(),
  salaryTarget: z.number().min(0).optional().nullable(),
  noticeDays: z.number().min(0).max(180).optional(),
  preferredIndustries: z.array(z.string()).optional(),
  ghostMode: z.boolean().optional(),
  hiddenCompanies: z.array(z.string()).optional(),
  onboardingComplete: z.boolean().optional(),
  name: z.string().min(2).max(80).optional(),
});

seekerRouter.put(
  '/profile',
  wrap(async (req, res) => {
    const body = profileUpdateSchema.parse(req.body);
    const p = req.seeker!;
    const { name, ...rest } = body;
    if (rest.skills) rest.skills = normalizeSkills(rest.skills);
    Object.assign(p, rest);
    // "verified" link = looks like a real LinkedIn profile URL (light-touch validation, no OAuth)
    p.linkedinVerified = /linkedin\.com\/in\/[a-z0-9_-]{3,}/i.test(p.links?.linkedin || '');
    await p.save();
    if (name && name !== req.user!.name) {
      req.user!.name = name;
      await req.user!.save();
    }
    res.json({ profile: profileView(p) });
  }),
);

/* ── Resume upload + AI parse ────────────────────────────────────────── */

seekerRouter.post(
  '/resume',
  resumeParseLimiter,
  upload.single('resume'),
  wrap(async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded (field name must be "resume")' });
    const buffer = fs.readFileSync(file.path);
    let rawText: string;
    try {
      rawText = await extractText(buffer, file.mimetype, file.originalname);
    } catch (err) {
      fs.unlink(file.path, () => {});
      return res.status(422).json({ error: (err as Error).message });
    }
    const ai = getAI();
    const t0 = Date.now();
    const parsed = await ai.parseResume(rawText);
    const parseMs = Date.now() - t0;

    const p = req.seeker!;
    p.resumes.push({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      rawText,
      parserUsed: ai.name,
      confidence: parsed.confidence,
    });
    // Pre-fill anything that is still empty; the review screen lets the seeker confirm/edit.
    if (parsed.skills?.length) p.skills = normalizeSkills([...parsed.skills, ...p.skills]);
    if (parsed.experience?.length) p.experience = parsed.experience;
    if (parsed.education?.length) p.education = parsed.education;
    if (parsed.yearsExperience) p.yearsExperience = parsed.yearsExperience;
    if (parsed.headline && !p.headline) p.headline = parsed.headline;
    if (parsed.location && !p.location) p.location = parsed.location;
    if (parsed.summary && !p.summary) p.summary = parsed.summary;
    if (parsed.highlights?.length) p.highlights = parsed.highlights;
    if (parsed.links) p.links = { ...p.links, ...Object.fromEntries(Object.entries(parsed.links).filter(([, v]) => v)) };
    p.linkedinVerified = /linkedin\.com\/in\/[a-z0-9_-]{3,}/i.test(p.links?.linkedin || '');
    await p.save();
    if (parsed.fullName && req.user!.name.toLowerCase() === req.user!.email.split('@')[0].toLowerCase()) {
      req.user!.name = parsed.fullName;
      await req.user!.save();
    }

    res.json({ parsed, parser: ai.name, parseMs, profile: profileView(p) });
  }),
);

/* ── Matches / feed ──────────────────────────────────────────────────── */

const feedQuery = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  workSetup: z.enum(['hybrid', 'remote', 'onsite']).optional(),
  industry: z.string().optional(),
  salaryMin: z.coerce.number().optional(),
  sort: z.enum(['match', 'newest', 'salary']).default('match'),
  limit: z.coerce.number().min(1).max(100).default(30),
});

seekerRouter.get(
  '/matches',
  wrap(async (req, res) => {
    const q = feedQuery.parse(req.query);
    const p = req.seeker!;
    const filter: Record<string, unknown> = { status: 'active' };
    if (q.workSetup) filter.workSetup = q.workSetup;
    if (q.industry) filter.industry = new RegExp(q.industry, 'i');
    if (q.location) filter.location = new RegExp(q.location, 'i');
    if (q.salaryMin) filter.salaryMax = { $gte: q.salaryMin };
    if (q.q) filter.$text = { $search: q.q };

    const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(200);
    const employerIds = [...new Set(jobs.map((j) => String(j.employerId)))];
    const employers = await EmployerProfile.find({ _id: { $in: employerIds } });
    const byId = new Map(employers.map((e) => [String(e._id), e]));
    const applied = new Set(
      (await Application.find({ seekerId: p._id }).select('jobId')).map((a) => String(a.jobId)),
    );
    const saved = new Set(p.savedJobs.map(String));
    const hidden = new Set(p.hiddenCompanies.map((c) => c.toLowerCase()));

    let list = jobs
      .filter((j) => {
        const e = byId.get(String(j.employerId));
        // Ghost mode: never surface (or be surfaced to) hidden companies
        return !(p.ghostMode && e && hidden.has(e.companyName.toLowerCase()));
      })
      .map((j) => ({
        ...jobView(j, byId.get(String(j.employerId)), p),
        applied: applied.has(String(j._id)),
        saved: saved.has(String(j._id)),
      }));

    if (q.sort === 'match') list.sort((a, b) => (b.match!.score - a.match!.score) || (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
    else if (q.sort === 'salary') list.sort((a, b) => (b.salaryMax as number) - (a.salaryMax as number));
    list = list.slice(0, q.limit);

    const completion = computeCompletion(p);
    res.json({
      jobs: list,
      total: list.length,
      profileCompletion: completion,
      emptyHint:
        list.length === 0
          ? completion.percent < 60
            ? 'No matches yet — complete your profile to improve results.'
            : 'No jobs match these filters yet. Try widening your location or salary range.'
          : undefined,
    });
  }),
);

seekerRouter.get(
  '/jobs/:id',
  wrap(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Job not found' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const employer = await EmployerProfile.findById(job.employerId);
    const p = req.seeker!;
    await Job.updateOne({ _id: job._id }, { $inc: { views: 1 } });
    const application = await Application.findOne({ jobId: job._id, seekerId: p._id });

    // "Similar jobs" carousel: same industry or overlapping required skills
    const others = await Job.find({ _id: { $ne: job._id }, status: 'active' }).limit(100);
    const similar = others
      .map((o) => {
        const overlap = o.requiredSkills.filter((s) => job.requiredSkills.includes(s)).length;
        const sameIndustry = o.industry && o.industry === job.industry ? 1 : 0;
        return { o, rank: overlap * 2 + sameIndustry };
      })
      .filter((x) => x.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 4);
    const simEmployers = await EmployerProfile.find({ _id: { $in: similar.map((s) => s.o.employerId) } });
    const simMap = new Map(simEmployers.map((e) => [String(e._id), e]));

    res.json({
      job: {
        ...jobView(job, employer, p),
        applied: !!application,
        applicationId: application ? String(application._id) : undefined,
        applicationStatus: application?.status,
        saved: p.savedJobs.some((id) => String(id) === String(job._id)),
      },
      similar: similar.map((s) => jobView(s.o, simMap.get(String(s.o.employerId)), p)),
    });
  }),
);

/** How to improve this match: AI (or local) advice for the missing skills. */
seekerRouter.post(
  '/jobs/:id/gap-advice',
  gapAdviceLimiter,
  wrap(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const p = req.seeker!;
    const match = computeMatch(p, job);
    const missing = [...match.skills.requiredMissing, ...match.skills.preferredMissing];
    const advice = await getAI().gapAdvice({ jobTitle: job.title, missingSkills: missing, seekerHeadline: p.headline });
    // Projected score if the seeker learned the missing *required* skills
    const projected = computeMatch({ ...p.toObject(), skills: [...p.skills, ...match.skills.requiredMissing, ...match.skills.preferredMissing] }, job);
    res.json({ match, advice, projectedScore: projected.score, provider: getAI().name });
  }),
);

/* ── Saved jobs ──────────────────────────────────────────────────────── */

seekerRouter.get(
  '/saved',
  wrap(async (req, res) => {
    const p = req.seeker!;
    const jobs = await Job.find({ _id: { $in: p.savedJobs } });
    const employers = await EmployerProfile.find({ _id: { $in: jobs.map((j) => j.employerId) } });
    const byId = new Map(employers.map((e) => [String(e._id), e]));
    res.json({ jobs: jobs.map((j) => ({ ...jobView(j, byId.get(String(j.employerId)), p), saved: true })) });
  }),
);

seekerRouter.post(
  '/saved/:jobId',
  wrap(async (req, res) => {
    const p = req.seeker!;
    const id = req.params.jobId;
    if (!Types.ObjectId.isValid(id) || !(await Job.exists({ _id: id }))) return res.status(404).json({ error: 'Job not found' });
    const has = p.savedJobs.some((s) => String(s) === id);
    if (has) p.savedJobs = p.savedJobs.filter((s) => String(s) !== id);
    else p.savedJobs.push(new Types.ObjectId(id));
    await p.save();
    res.json({ saved: !has, savedJobs: p.savedJobs.map(String) });
  }),
);

/* ── Dashboard summary ───────────────────────────────────────────────── */

seekerRouter.get(
  '/dashboard',
  wrap(async (req, res) => {
    const p = req.seeker!;
    const apps = await Application.find({ seekerId: p._id });
    const counts = { submitted: 0, viewed: 0, interview: 0, offer: 0, rejected: 0 };
    for (const a of apps) counts[a.status]++;
    const activeJobs = await Job.find({ status: 'active' }).limit(300);
    const scores = activeJobs.map((j) => computeMatch(p, j).score);
    const strong = scores.filter((s) => s >= 80).length;
    const salaries = activeJobs.filter((j) => computeMatch(p, j).score >= 80).map((j) => (j.salaryMin + j.salaryMax) / 2);
    const medianMatchSalary = salaries.length ? salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)] : null;
    res.json({
      completion: computeCompletion(p),
      applications: { total: apps.length, ...counts, active: apps.length - counts.rejected },
      matches: { total: activeJobs.length, strong },
      medianMatchSalary,
    });
  }),
);

export type { IEmployerProfile };

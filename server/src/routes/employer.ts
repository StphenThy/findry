import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, wrap } from '../middleware/auth';
import { requireObjectId } from '../middleware/objectId';
import { suggestSkillsLimiter } from '../middleware/security';
import { Application, Job, SeekerProfile } from '../models';
import { getAI } from '../services/ai';
import { computeMatch } from '../services/matching/score';
import { normalizeSkills } from '../services/matching/skills';
import { employerSummary, jobView } from './helpers';

export const employerRouter = Router();
employerRouter.use(requireAuth, requireRole('employer'));

/* ── Company profile ─────────────────────────────────────────────────── */

employerRouter.get(
  '/profile',
  wrap(async (req, res) => {
    res.json({ profile: employerSummary(req.employer!), onboardingComplete: req.employer!.onboardingComplete });
  }),
);

const profileSchema = z.object({
  companyName: z.string().trim().min(2).max(120).optional(),
  industry: z.string().max(80).optional(),
  size: z.string().max(20).optional(),
  location: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().max(500).optional(),
  onboardingComplete: z.boolean().optional(),
});

employerRouter.put(
  '/profile',
  wrap(async (req, res) => {
    const body = profileSchema.parse(req.body);
    const e = req.employer!;
    Object.assign(e, body);
    if (body.companyName) e.monogram = ''; // regenerate in pre-save
    // Light-touch verification: a company website that resolves as a plausible domain earns the badge.
    if (body.website !== undefined) {
      e.verified = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}/i.test(body.website);
      e.verificationLabel = e.verified ? 'Verified Employer' : undefined;
    }
    await e.save();
    res.json({ profile: employerSummary(e), onboardingComplete: e.onboardingComplete });
  }),
);

/* ── Jobs (CRUD) ─────────────────────────────────────────────────────── */

const jobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  department: z.string().max(120).optional(),
  description: z.string().max(8000).default(''),
  responsibilities: z.array(z.string().max(400)).max(15).default([]),
  location: z.string().max(120).default(''),
  workSetup: z.enum(['hybrid', 'remote', 'onsite']).default('hybrid'),
  employmentType: z.enum(['full-time', 'contract', 'part-time', 'internship']).default('full-time'),
  industry: z.string().max(80).default(''),
  salaryMin: z.number().min(0).default(0),
  salaryMax: z.number().min(0).default(0),
  requiredSkills: z.array(z.string().max(60)).max(30).default([]),
  preferredSkills: z.array(z.string().max(60)).max(30).default([]),
  minYears: z.number().min(0).max(30).default(0),
  educationRequired: z.boolean().default(false),
  benefits: z.array(z.string().max(160)).max(20).default([]),
  screeningQuestion: z.string().max(600).optional(),
  coreWeight: z.number().min(0).max(100).default(70),
  autoScreenMinYears: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'closed']).default('active'),
});
const salaryOrderOk = (b: { salaryMin?: number; salaryMax?: number }) => b.salaryMin === undefined || b.salaryMax === undefined || b.salaryMax === 0 || b.salaryMax >= b.salaryMin;

employerRouter.get(
  '/jobs',
  wrap(async (req, res) => {
    const jobs = await Job.find({ employerId: req.employer!._id }).sort({ createdAt: -1 });
    const apps = await Application.find({ employerId: req.employer!._id }).select('jobId status matchScore createdAt');
    const stats = new Map<string, { applicants: number; newToday: number; avgMatch: number; interview: number }>();
    for (const j of jobs) stats.set(String(j._id), { applicants: 0, newToday: 0, avgMatch: 0, interview: 0 });
    const sums = new Map<string, number>();
    const dayAgo = Date.now() - 86_400_000;
    for (const a of apps) {
      const s = stats.get(String(a.jobId));
      if (!s) continue;
      s.applicants++;
      if (a.createdAt.getTime() > dayAgo) s.newToday++;
      if (a.status === 'interview') s.interview++;
      sums.set(String(a.jobId), (sums.get(String(a.jobId)) ?? 0) + a.matchScore);
    }
    for (const [id, s] of stats) s.avgMatch = s.applicants ? Math.round((sums.get(id) ?? 0) / s.applicants) : 0;
    res.json({ jobs: jobs.map((j) => ({ ...jobView(j, req.employer!), stats: stats.get(String(j._id)) })) });
  }),
);

employerRouter.post(
  '/jobs',
  wrap(async (req, res) => {
    const body = jobSchema.parse(req.body);
    if (!salaryOrderOk(body)) return res.status(400).json({ error: 'Maximum salary must be at least the minimum salary.' });
    const job = await Job.create({
      ...body,
      requiredSkills: normalizeSkills(body.requiredSkills),
      preferredSkills: normalizeSkills(body.preferredSkills).filter((s) => !normalizeSkills(body.requiredSkills).includes(s)),
      employerId: req.employer!._id,
    });
    res.status(201).json({ job: jobView(job, req.employer!) });
  }),
);

employerRouter.get(
  '/jobs/:id',
  requireObjectId('id'),
  wrap(async (req, res) => {
    const job = await Job.findOne({ _id: req.params.id, employerId: req.employer!._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job: jobView(job, req.employer!) });
  }),
);

employerRouter.put(
  '/jobs/:id',
  requireObjectId('id'),
  wrap(async (req, res) => {
    const body = jobSchema.partial().parse(req.body);
    const job = await Job.findOne({ _id: req.params.id, employerId: req.employer!._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (!salaryOrderOk({ salaryMin: body.salaryMin ?? job.salaryMin, salaryMax: body.salaryMax ?? job.salaryMax })) return res.status(400).json({ error: 'Maximum salary must be at least the minimum salary.' });
    if (body.requiredSkills) body.requiredSkills = normalizeSkills(body.requiredSkills);
    if (body.preferredSkills) body.preferredSkills = normalizeSkills(body.preferredSkills);
    Object.assign(job, body);
    await job.save();
    res.json({ job: jobView(job, req.employer!) });
  }),
);

employerRouter.delete(
  '/jobs/:id',
  requireObjectId('id'),
  wrap(async (req, res) => {
    const job = await Job.findOneAndDelete({ _id: req.params.id, employerId: req.employer!._id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    await Application.deleteMany({ jobId: job._id });
    res.json({ ok: true });
  }),
);

/**
 * GET /api/employer/simulate?requiredSkills=a,b&preferredSkills=c&minYears=5
 * Live "talent pool simulation" for the post-job wizard: how many seekers in
 * the database would score ≥80 / ≥90 against this draft requisition.
 */
employerRouter.get(
  '/simulate',
  wrap(async (req, res) => {
    const split = (v: unknown) => (typeof v === 'string' && v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
    const draft = {
      requiredSkills: split(req.query.requiredSkills),
      preferredSkills: split(req.query.preferredSkills),
      minYears: Number(req.query.minYears ?? 0) || 0,
      educationRequired: req.query.educationRequired === 'true',
      coreWeight: Number(req.query.coreWeight ?? 70) || 70,
    };
    const company = req.employer!.companyName.toLowerCase();
    const seekers = (await SeekerProfile.find({ onboardingComplete: true }).limit(500)).filter(
      // Ghost mode: seekers who hid themselves from this company are invisible to it
      (s) => !(s.ghostMode && s.hiddenCompanies.some((c) => c.toLowerCase() === company)),
    );
    let high = 0;
    let strong = 0;
    let top: { seekerId: string; score: number } | null = null;
    for (const s of seekers) {
      const m = computeMatch(s, draft);
      if (m.score >= 90) high++;
      else if (m.score >= 80) strong++;
      if (!top || m.score > top.score) top = { seekerId: String(s._id), score: m.score };
    }
    let topProfile = null;
    if (top) {
      const s = seekers.find((x) => String(x._id) === top!.seekerId)!;
      const { User } = await import('../models');
      const u = await User.findById(s.userId).select('name');
      topProfile = { name: u?.name ?? 'Candidate', headline: s.headline, score: top.score, salaryTarget: s.salaryTarget, skills: s.skills.slice(0, 4), lastCompany: s.experience[0]?.company };
    }
    res.json({ total: high + strong, high, strong, pool: seekers.length, top: topProfile });
  }),
);

/** POST /api/employer/ai/suggest-skills { title, description } */
employerRouter.post(
  '/ai/suggest-skills',
  suggestSkillsLimiter,
  wrap(async (req, res) => {
    const { title, description } = z.object({ title: z.string().min(2), description: z.string().optional() }).parse(req.body);
    const suggestion = await getAI().suggestSkills(title, description);
    res.json({ ...suggestion, provider: getAI().name });
  }),
);

/* ── Dashboard + analytics ───────────────────────────────────────────── */

employerRouter.get(
  '/dashboard',
  wrap(async (req, res) => {
    const e = req.employer!;
    const jobs = await Job.find({ employerId: e._id });
    const active = jobs.filter((j) => j.status === 'active');
    const apps = await Application.find({ employerId: e._id });
    const dayAgo = Date.now() - 86_400_000;
    const newToday = apps.filter((a) => a.createdAt.getTime() > dayAgo).length;
    const avgMatch = apps.length ? Math.round(apps.reduce((s, a) => s + a.matchScore, 0) / apps.length) : 0;
    const screened = apps.filter((a) => a.status !== 'submitted').length;
    const byStatus = { submitted: 0, viewed: 0, interview: 0, offer: 0, rejected: 0 };
    for (const a of apps) byStatus[a.status]++;
    // time-to-fill proxy: days from job creation to first offer
    const fills: number[] = [];
    for (const j of jobs) {
      const firstOffer = apps.filter((a) => String(a.jobId) === String(j._id) && a.status === 'offer').sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[0];
      if (firstOffer) fills.push((firstOffer.updatedAt.getTime() - j.createdAt.getTime()) / 86_400_000);
    }
    const avgTimeToFill = fills.length ? Math.round(fills.reduce((a, b) => a + b, 0) / fills.length) : null;
    res.json({
      company: employerSummary(e),
      activeJobs: active.length,
      activeTitles: active.map((j) => j.title),
      totalApplicants: apps.length,
      newToday,
      screened,
      avgMatch,
      byStatus,
      avgTimeToFill,
      totalViews: jobs.reduce((s, j) => s + j.views, 0),
    });
  }),
);

employerRouter.get(
  '/analytics',
  wrap(async (req, res) => {
    const e = req.employer!;
    const jobs = await Job.find({ employerId: e._id }).sort({ createdAt: -1 });
    const apps = await Application.find({ employerId: e._id });
    const perJob = jobs.map((j) => {
      const ja = apps.filter((a) => String(a.jobId) === String(j._id));
      const avg = ja.length ? Math.round(ja.reduce((s, a) => s + a.matchScore, 0) / ja.length) : 0;
      const offer = ja.find((a) => a.status === 'offer');
      return {
        id: String(j._id),
        title: j.title,
        status: j.status,
        views: j.views,
        applications: ja.length,
        conversion: j.views ? Math.round((ja.length / j.views) * 100) : 0,
        avgMatch: avg,
        interview: ja.filter((a) => a.status === 'interview').length,
        offers: ja.filter((a) => a.status === 'offer').length,
        daysOpen: Math.floor((Date.now() - j.createdAt.getTime()) / 86_400_000),
        timeToFill: offer ? Math.round((offer.updatedAt.getTime() - j.createdAt.getTime()) / 86_400_000) : null,
      };
    });
    // 14-day applications series for a small chart
    const series: Array<{ day: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d.getTime() + 86_400_000);
      series.push({ day: d.toISOString().slice(5, 10), count: apps.filter((a) => a.createdAt >= d && a.createdAt < next).length });
    }
    // match distribution buckets
    const buckets = { '90+': 0, '80-89': 0, '65-79': 0, '<65': 0 };
    for (const a of apps) {
      if (a.matchScore >= 90) buckets['90+']++;
      else if (a.matchScore >= 80) buckets['80-89']++;
      else if (a.matchScore >= 65) buckets['65-79']++;
      else buckets['<65']++;
    }
    res.json({ perJob, series, buckets, totals: { views: jobs.reduce((s, j) => s + j.views, 0), applications: apps.length } });
  }),
);


import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole, wrap } from '../middleware/auth';
import { Application, EmployerProfile, Job, SeekerProfile, User } from '../models';
import type { IApplication, IEmployerProfile, IJob, ISeekerProfile } from '../models';
import { computeMatch } from '../services/matching/score';
import { APPLICATION_STATUSES } from '../types';
import type { ApplicationStatus } from '../types';
import { employerSummary } from './helpers';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

function jobSummary(j: IJob | null | undefined) {
  if (!j) return null;
  return {
    id: String(j._id),
    title: j.title,
    location: j.location,
    workSetup: j.workSetup,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    requiredSkills: j.requiredSkills,
    preferredSkills: j.preferredSkills,
    minYears: j.minYears,
    benefits: j.benefits,
    screeningQuestion: j.screeningQuestion,
    status: j.status,
    createdAt: j.createdAt,
  };
}

async function candidateSummary(s: ISeekerProfile | null | undefined, full = false) {
  if (!s) return null;
  const u = await User.findById(s.userId).select('name email avatarUrl');
  const base = {
    id: String(s._id),
    userId: String(s.userId),
    name: u?.name ?? 'Candidate',
    avatarUrl: u?.avatarUrl,
    headline: s.headline,
    location: s.location,
    yearsExperience: s.yearsExperience,
    skills: s.skills,
    salaryTarget: s.salaryTarget,
    noticeDays: s.noticeDays,
    workSetup: s.workSetup,
    linkedinVerified: s.linkedinVerified,
    lastCompany: s.experience[0]?.company,
  };
  if (!full) return base;
  return {
    ...base,
    email: u?.email,
    summary: s.summary,
    highlights: s.highlights,
    experience: s.experience,
    education: s.education,
    links: s.links,
    resume: s.resumes.length
      ? { originalName: s.resumes[s.resumes.length - 1].originalName, uploadedAt: s.resumes[s.resumes.length - 1].uploadedAt, parserUsed: s.resumes[s.resumes.length - 1].parserUsed }
      : null,
  };
}

function appView(a: IApplication) {
  return {
    id: String(a._id),
    status: a.status,
    matchScore: a.matchScore,
    matchBreakdown: a.matchBreakdown,
    screeningAnswer: a.screeningAnswer,
    coverNote: a.coverNote,
    employerNote: a.employerNote,
    interviewAt: a.interviewAt,
    interviewNote: a.interviewNote,
    offerSalary: a.offerSalary,
    offerExpiresAt: a.offerExpiresAt,
    offerPerks: a.offerPerks,
    timeline: a.timeline,
    viewedAt: a.viewedAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/* ── Seeker: apply + list ────────────────────────────────────────────── */

applicationsRouter.post(
  '/',
  requireRole('seeker'),
  wrap(async (req, res) => {
    const { jobId, screeningAnswer, coverNote } = z
      .object({ jobId: z.string(), screeningAnswer: z.string().max(3000).optional(), coverNote: z.string().max(2000).optional() })
      .parse(req.body);
    if (!Types.ObjectId.isValid(jobId)) return res.status(404).json({ error: 'Job not found' });
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'active') return res.status(404).json({ error: 'This job is no longer accepting applications' });
    const p = req.seeker!;
    if (await Application.exists({ jobId: job._id, seekerId: p._id })) {
      return res.status(409).json({ error: 'You already applied to this job' });
    }
    const match = computeMatch(p, job);
    // Employer's auto-screen rule (knockout on minimum years)
    const knocked = job.autoScreenMinYears && job.minYears > 0 && p.yearsExperience < job.minYears;
    const status = knocked ? 'rejected' : 'submitted';
    const timeline: Array<{ status: ApplicationStatus; at: Date; note?: string }> = [
      { status: 'submitted', at: new Date(), note: 'Application submitted via Findry 1-click apply' },
    ];
    if (knocked) timeline.push({ status: 'rejected', at: new Date(), note: `Auto-screened: role requires ${job.minYears}+ years verified experience` });
    const app = await Application.create({
      jobId: job._id,
      seekerId: p._id,
      employerId: job.employerId,
      status,
      matchScore: match.score,
      matchBreakdown: match,
      screeningAnswer,
      coverNote,
      timeline,
    });
    res.status(201).json({ application: appView(app), job: jobSummary(job) });
  }),
);

applicationsRouter.get(
  '/mine',
  requireRole('seeker'),
  wrap(async (req, res) => {
    const apps = await Application.find({ seekerId: req.seeker!._id }).sort({ updatedAt: -1 });
    const jobs = await Job.find({ _id: { $in: apps.map((a) => a.jobId) } });
    const employers = await EmployerProfile.find({ _id: { $in: apps.map((a) => a.employerId) } });
    const jm = new Map(jobs.map((j) => [String(j._id), j]));
    const em = new Map(employers.map((e) => [String(e._id), e]));
    res.json({
      applications: apps.map((a) => ({
        ...appView(a),
        job: jobSummary(jm.get(String(a.jobId))),
        employer: employerSummary(em.get(String(a.employerId))),
      })),
    });
  }),
);

/* ── Employer: list per job / pipeline ───────────────────────────────── */

applicationsRouter.get(
  '/pipeline',
  requireRole('employer'),
  wrap(async (req, res) => {
    const e = req.employer!;
    const filter: Record<string, unknown> = { employerId: e._id };
    if (typeof req.query.jobId === 'string' && Types.ObjectId.isValid(req.query.jobId)) filter.jobId = req.query.jobId;
    if (typeof req.query.status === 'string' && APPLICATION_STATUSES.includes(req.query.status as never)) filter.status = req.query.status;
    const apps = await Application.find(filter).sort({ matchScore: -1, createdAt: -1 });
    const seekers = await SeekerProfile.find({ _id: { $in: apps.map((a) => a.seekerId) } });
    const sm = new Map(seekers.map((s) => [String(s._id), s]));
    const jobs = await Job.find({ employerId: e._id }).select('title location');
    const jm = new Map(jobs.map((j) => [String(j._id), j]));
    const list = [];
    for (const a of apps) {
      const s = sm.get(String(a.seekerId));
      // Ghost mode: hide candidates from companies they've blocked (privacy isolation)
      if (s?.ghostMode && s.hiddenCompanies.some((c) => c.toLowerCase() === e.companyName.toLowerCase())) continue;
      list.push({ ...appView(a), candidate: await candidateSummary(s), job: jm.get(String(a.jobId)) ? { id: String(a.jobId), title: jm.get(String(a.jobId))!.title } : null });
    }
    res.json({ applications: list, jobs: jobs.map((j) => ({ id: String(j._id), title: j.title })) });
  }),
);

/* ── Either party: detail ────────────────────────────────────────────── */

applicationsRouter.get(
  '/:id',
  wrap(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const a = await Application.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    const user = req.user!;
    const [seeker, employer, job] = await Promise.all([
      SeekerProfile.findById(a.seekerId),
      EmployerProfile.findById(a.employerId),
      Job.findById(a.jobId),
    ]);
    const isSeeker = seeker && String(seeker.userId) === String(user._id);
    const isEmployer = employer && String(employer.userId) === String(user._id);
    if (!isSeeker && !isEmployer) return res.status(403).json({ error: 'Not your application' });

    // Employer opening the dossier = "viewed" (seeker sees the reading receipt)
    if (isEmployer && a.status === 'submitted') {
      a.status = 'viewed';
      a.viewedAt = new Date();
      a.timeline.push({ status: 'viewed', at: new Date(), note: 'Hiring team opened your profile' });
      await a.save();
    }
    // Live re-score so the employer sees the freshest breakdown (snapshot kept for ranking)
    const live = seeker && job ? computeMatch(seeker, job) : a.matchBreakdown;
    res.json({
      application: { ...appView(a), liveMatch: live },
      job: jobSummary(job),
      employer: employerSummary(employer),
      candidate: await candidateSummary(seeker, !!isEmployer),
      viewer: isEmployer ? 'employer' : 'seeker',
    });
  }),
);

/* ── Employer: move status ───────────────────────────────────────────── */

const statusSchema = z.object({
  status: z.enum(['submitted', 'viewed', 'interview', 'offer', 'rejected']),
  note: z.string().max(1000).optional(),
  interviewAt: z.string().datetime().optional(),
  interviewNote: z.string().max(500).optional(),
  offerSalary: z.number().min(0).optional(),
  offerExpiresAt: z.string().datetime().optional(),
  offerPerks: z.array(z.string().max(120)).max(10).optional(),
});

applicationsRouter.patch(
  '/:id/status',
  requireRole('employer'),
  wrap(async (req, res) => {
    const body = statusSchema.parse(req.body);
    const a = await Application.findOne({ _id: req.params.id, employerId: req.employer!._id });
    if (!a) return res.status(404).json({ error: 'Not found' });
    a.status = body.status;
    if (body.note) a.employerNote = body.note;
    if (body.interviewAt) a.interviewAt = new Date(body.interviewAt);
    if (body.interviewNote) a.interviewNote = body.interviewNote;
    if (body.offerSalary !== undefined) a.offerSalary = body.offerSalary;
    if (body.offerExpiresAt) a.offerExpiresAt = new Date(body.offerExpiresAt);
    if (body.offerPerks) a.offerPerks = body.offerPerks;
    a.timeline.push({ status: body.status, at: new Date(), note: body.note });
    await a.save();
    // Update employer response-time badge (median hours to first non-submitted status)
    const e = req.employer!;
    const responded = await Application.find({ employerId: e._id, viewedAt: { $exists: true } }).select('createdAt viewedAt');
    if (responded.length) {
      const hrs = responded.map((r) => (r.viewedAt!.getTime() - r.createdAt.getTime()) / 3_600_000).sort((x, y) => x - y);
      e.avgResponseHours = Math.max(1, Math.round(hrs[Math.floor(hrs.length / 2)]));
      await e.save();
    }
    res.json({ application: appView(a) });
  }),
);

/* ── Seeker: respond to an offer / withdraw ──────────────────────────── */

applicationsRouter.post(
  '/:id/withdraw',
  requireRole('seeker'),
  wrap(async (req, res) => {
    const a = await Application.findOne({ _id: req.params.id, seekerId: req.seeker!._id });
    if (!a) return res.status(404).json({ error: 'Not found' });
    a.status = 'rejected';
    a.timeline.push({ status: 'rejected', at: new Date(), note: 'Withdrawn by candidate' });
    await a.save();
    res.json({ application: appView(a) });
  }),
);

export type { IEmployerProfile };

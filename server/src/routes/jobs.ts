import { Router } from 'express';
import { Types } from 'mongoose';
import { EmployerProfile, Job } from '../models';
import { jobView } from './helpers';

/** Public (unauthenticated) job listings — used by the landing page counter and SEO-ish browsing. */
export const jobsRouter = Router();

jobsRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const filter: Record<string, unknown> = { status: 'active' };
  if (q) filter.$text = { $search: q };
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(50);
  const employers = await EmployerProfile.find({ _id: { $in: jobs.map((j) => j.employerId) } });
  const byId = new Map(employers.map((e) => [String(e._id), e]));
  const total = await Job.countDocuments({ status: 'active' });
  res.json({ jobs: jobs.map((j) => jobView(j, byId.get(String(j.employerId)))), total });
});

jobsRouter.get('/stats', async (_req, res) => {
  const active = await Job.countDocuments({ status: 'active' });
  const jobs = await Job.find({ status: 'active' }).select('salaryMin salaryMax');
  const mids = jobs.map((j) => (j.salaryMin + j.salaryMax) / 2).sort((a, b) => a - b);
  const employers = await EmployerProfile.countDocuments({ onboardingComplete: true });
  res.json({ activeJobs: active, medianSalary: mids.length ? mids[Math.floor(mids.length / 2)] : 0, employers });
});

jobsRouter.get('/:id', async (req, res) => {
  if (!Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: 'Job not found' });
  const job = await Job.findOne({ _id: req.params.id, status: 'active' });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const employer = await EmployerProfile.findById(job.employerId);
  res.json({ job: jobView(job, employer) });
});

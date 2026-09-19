import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { requireAuth, wrap } from '../middleware/auth';
import { Application, EmployerProfile, Job, Message, SeekerProfile, User } from '../models';

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

/** Resolve the two user ids on an application and check the caller is one of them. */
async function parties(applicationId: string, callerUserId: string) {
  if (!Types.ObjectId.isValid(applicationId)) return null;
  const a = await Application.findById(applicationId);
  if (!a) return null;
  const [s, e] = await Promise.all([SeekerProfile.findById(a.seekerId), EmployerProfile.findById(a.employerId)]);
  if (!s || !e) return null;
  const seekerUser = String(s.userId);
  const employerUser = String(e.userId);
  if (callerUserId !== seekerUser && callerUserId !== employerUser) return null;
  return { app: a, seeker: s, employer: e, seekerUser, employerUser, other: callerUserId === seekerUser ? employerUser : seekerUser };
}

/**
 * GET /api/messages/conversations?as=seeker|employer
 * One conversation per application the caller is part of, newest first.
 */
messagesRouter.get(
  '/conversations',
  wrap(async (req, res) => {
    const user = req.user!;
    const as = req.query.as === 'employer' ? 'employer' : 'seeker';
    let apps;
    if (as === 'employer') {
      const e = await EmployerProfile.findOne({ userId: user._id });
      if (!e) return res.json({ conversations: [] });
      // Employers can only message candidates who applied and were not rejected
      apps = await Application.find({ employerId: e._id, status: { $ne: 'rejected' } }).sort({ updatedAt: -1 });
    } else {
      const s = await SeekerProfile.findOne({ userId: user._id });
      if (!s) return res.json({ conversations: [] });
      apps = await Application.find({ seekerId: s._id }).sort({ updatedAt: -1 });
    }
    const out = [];
    for (const a of apps) {
      const [job, s, e] = await Promise.all([Job.findById(a.jobId).select('title'), SeekerProfile.findById(a.seekerId).select('userId headline'), EmployerProfile.findById(a.employerId).select('companyName monogram userId')]);
      const otherUserId = as === 'employer' ? s?.userId : e?.userId;
      const other = otherUserId ? await User.findById(otherUserId).select('name avatarUrl') : null;
      const last = await Message.findOne({ applicationId: a._id }).sort({ createdAt: -1 });
      const unread = await Message.countDocuments({ applicationId: a._id, toUserId: user._id, readAt: { $exists: false } });
      out.push({
        applicationId: String(a._id),
        status: a.status,
        matchScore: a.matchScore,
        jobTitle: job?.title ?? '',
        counterpart: as === 'employer'
          ? { name: other?.name ?? 'Candidate', subtitle: s?.headline ?? '', avatarUrl: other?.avatarUrl }
          : { name: e?.companyName ?? 'Employer', subtitle: other?.name ?? '', monogram: e?.monogram },
        lastMessage: last ? { body: last.body, at: last.createdAt, mine: String(last.fromUserId) === String(user._id) } : null,
        unread,
        updatedAt: last?.createdAt ?? a.updatedAt,
      });
    }
    out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ conversations: out });
  }),
);

messagesRouter.get(
  '/:applicationId',
  wrap(async (req, res) => {
    const ctx = await parties(req.params.applicationId, String(req.user!._id));
    if (!ctx) return res.status(404).json({ error: 'Conversation not found' });
    const messages = await Message.find({ applicationId: ctx.app._id }).sort({ createdAt: 1 });
    await Message.updateMany({ applicationId: ctx.app._id, toUserId: req.user!._id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    const job = await Job.findById(ctx.app.jobId).select('title');
    const otherUser = await User.findById(ctx.other).select('name avatarUrl');
    res.json({
      applicationId: String(ctx.app._id),
      jobTitle: job?.title,
      status: ctx.app.status,
      counterpart: { id: ctx.other, name: otherUser?.name, avatarUrl: otherUser?.avatarUrl, company: ctx.employer.companyName },
      messages: messages.map((m) => ({ id: String(m._id), body: m.body, at: m.createdAt, mine: String(m.fromUserId) === String(req.user!._id), readAt: m.readAt })),
    });
  }),
);

messagesRouter.post(
  '/:applicationId',
  wrap(async (req, res) => {
    const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
    const ctx = await parties(req.params.applicationId, String(req.user!._id));
    if (!ctx) return res.status(404).json({ error: 'Conversation not found' });
    const isEmployer = String(req.user!._id) === ctx.employerUser;
    if (isEmployer && ctx.app.status === 'rejected') return res.status(403).json({ error: 'Cannot message a rejected candidate' });
    const m = await Message.create({ applicationId: ctx.app._id, fromUserId: req.user!._id, toUserId: ctx.other, body });
    res.status(201).json({ message: { id: String(m._id), body: m.body, at: m.createdAt, mine: true } });
  }),
);

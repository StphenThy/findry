import { Schema, model, Document, Types } from 'mongoose';
import type { ApplicationStatus, MatchBreakdown } from '../types';

export interface ITimelineEvent {
  status: ApplicationStatus;
  at: Date;
  note?: string;
}

export interface IApplication extends Document<Types.ObjectId> {
  jobId: Types.ObjectId;
  seekerId: Types.ObjectId; // SeekerProfile
  employerId: Types.ObjectId; // EmployerProfile
  status: ApplicationStatus;
  /** Snapshot of the match at apply-time so the employer sees a stable number. */
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  screeningAnswer?: string;
  coverNote?: string;
  employerNote?: string;
  /** Interview details set by the employer when moving to "interview". */
  interviewAt?: Date;
  interviewNote?: string;
  /** Offer details set by employer when moving to "offer". */
  offerSalary?: number;
  offerExpiresAt?: Date;
  offerPerks?: string[];
  timeline: ITimelineEvent[];
  viewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    seekerId: { type: Schema.Types.ObjectId, ref: 'SeekerProfile', required: true, index: true },
    employerId: { type: Schema.Types.ObjectId, ref: 'EmployerProfile', required: true, index: true },
    status: {
      type: String,
      enum: ['submitted', 'viewed', 'interview', 'offer', 'rejected'],
      default: 'submitted',
      index: true,
    },
    matchScore: { type: Number, default: 0 },
    matchBreakdown: { type: Object, default: {} },
    screeningAnswer: String,
    coverNote: String,
    employerNote: String,
    interviewAt: Date,
    interviewNote: String,
    offerSalary: Number,
    offerExpiresAt: Date,
    offerPerks: { type: [String], default: [] },
    timeline: { type: [{ status: String, at: Date, note: String }], default: [] },
    viewedAt: Date,
  },
  { timestamps: true },
);

// One application per seeker per job.
ApplicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true });

ApplicationSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    delete ret.__v;
    return ret;
  },
});

export const Application = model<IApplication>('Application', ApplicationSchema);

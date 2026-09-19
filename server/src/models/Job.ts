import { Schema, model, Document, Types } from 'mongoose';
import type { EmploymentType, JobStatus, WorkSetup } from '../types';

export interface IJob extends Document<Types.ObjectId> {
  employerId: Types.ObjectId; // EmployerProfile
  title: string;
  department?: string;
  description: string;
  responsibilities: string[];
  location: string;
  workSetup: WorkSetup;
  employmentType: EmploymentType;
  industry: string;
  salaryMin: number; // PHP gross / month
  salaryMax: number;
  requiredSkills: string[];
  preferredSkills: string[];
  minYears: number;
  educationRequired: boolean;
  benefits: string[];
  screeningQuestion?: string;
  /** Skills-vs-ecosystem weight split from the post-job wizard (0-100 = % on required). */
  coreWeight: number;
  autoScreenMinYears: boolean;
  status: JobStatus;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    employerId: { type: Schema.Types.ObjectId, ref: 'EmployerProfile', required: true, index: true },
    title: { type: String, required: true, trim: true },
    department: String,
    description: { type: String, default: '' },
    responsibilities: { type: [String], default: [] },
    location: { type: String, default: '' },
    workSetup: { type: String, enum: ['hybrid', 'remote', 'onsite'], default: 'hybrid' },
    employmentType: {
      type: String,
      enum: ['full-time', 'contract', 'part-time', 'internship'],
      default: 'full-time',
    },
    industry: { type: String, default: '' },
    salaryMin: { type: Number, default: 0 },
    salaryMax: { type: Number, default: 0 },
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    minYears: { type: Number, default: 0 },
    educationRequired: { type: Boolean, default: false },
    benefits: { type: [String], default: [] },
    screeningQuestion: String,
    coreWeight: { type: Number, default: 70 },
    autoScreenMinYears: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'active', index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);

JobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text', preferredSkills: 'text' });

JobSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    delete ret.__v;
    return ret;
  },
});

export const Job = model<IJob>('Job', JobSchema);

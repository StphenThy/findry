import { Schema, model, Document, Types } from 'mongoose';
import type { EducationEntry, ExperienceEntry, WorkSetup } from '../types';

export interface IResumeVersion {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  rawText: string;
  parserUsed: string; // gemini | local | mock
  confidence: number;
}

export interface ISeekerProfile extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  headline: string;
  location: string;
  workSetup: WorkSetup[];
  yearsExperience: number;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  summary?: string;
  highlights: string[];
  links: { linkedin?: string; github?: string; portfolio?: string };
  linkedinVerified: boolean;
  salaryMin?: number; // PHP / month, walk-away floor
  salaryTarget?: number; // PHP / month
  noticeDays: number;
  preferredIndustries: string[];
  ghostMode: boolean;
  hiddenCompanies: string[];
  savedJobs: Types.ObjectId[];
  resumes: IResumeVersion[];
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeVersionSchema = new Schema<IResumeVersion>(
  {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    rawText: { type: String, default: '' },
    parserUsed: { type: String, default: 'local' },
    confidence: { type: Number, default: 0 },
  },
  { _id: true },
);

const SeekerProfileSchema = new Schema<ISeekerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    headline: { type: String, default: '' },
    location: { type: String, default: '' },
    workSetup: { type: [String], enum: ['hybrid', 'remote', 'onsite'], default: ['hybrid', 'remote'] },
    yearsExperience: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    experience: { type: [Object], default: [] },
    education: { type: [Object], default: [] },
    summary: String,
    highlights: { type: [String], default: [] },
    links: { type: Object, default: {} },
    linkedinVerified: { type: Boolean, default: false },
    salaryMin: Number,
    salaryTarget: Number,
    noticeDays: { type: Number, default: 30 },
    preferredIndustries: { type: [String], default: [] },
    ghostMode: { type: Boolean, default: false },
    hiddenCompanies: { type: [String], default: [] },
    savedJobs: { type: [Schema.Types.ObjectId], ref: 'Job', default: [] },
    resumes: { type: [ResumeVersionSchema], default: [] },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/**
 * Profile completion % drives the onboarding nudge ("Your profile is 60% complete").
 * Weighted so that the things that most improve matching count the most.
 */
export function computeCompletion(p: ISeekerProfile): { percent: number; missing: string[] } {
  const checks: Array<[string, boolean, number]> = [
    ['Upload a resume', p.resumes.length > 0, 20],
    ['Add at least 5 skills', p.skills.length >= 5, 20],
    ['Add work experience', p.experience.length > 0, 15],
    ['Add education', p.education.length > 0, 10],
    ['Write a headline', !!p.headline, 5],
    ['Set your location', !!p.location, 5],
    ['Set a target salary', !!p.salaryTarget, 10],
    ['Link LinkedIn or portfolio', !!(p.links?.linkedin || p.links?.portfolio || p.links?.github), 10],
    ['Verify LinkedIn', p.linkedinVerified, 5],
  ];
  const percent = checks.reduce((acc, [, ok, w]) => acc + (ok ? w : 0), 0);
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  return { percent, missing };
}

SeekerProfileSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    // never leak raw resume text in list responses
    if (Array.isArray(ret.resumes)) {
      ret.resumes = (ret.resumes as IResumeVersion[]).map((r) => ({
        ...r,
        rawText: undefined,
      }));
    }
    delete ret.__v;
    return ret;
  },
});

export const SeekerProfile = model<ISeekerProfile>('SeekerProfile', SeekerProfileSchema);

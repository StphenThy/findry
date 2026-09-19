import { Schema, model, Document, Types } from 'mongoose';

export interface IEmployerProfile extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  companyName: string;
  industry: string;
  size: string; // "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
  location: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  /** Two-letter monogram used when no logo is uploaded (e.g. "GC"). */
  monogram: string;
  verified: boolean;
  /** DOLE PEA / SEC style badge text shown on job posts. */
  verificationLabel?: string;
  /** Rolling median time-to-first-status-change, in hours. */
  avgResponseHours?: number;
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployerProfileSchema = new Schema<IEmployerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    companyName: { type: String, default: '' },
    industry: { type: String, default: '' },
    size: { type: String, default: '' },
    location: { type: String, default: '' },
    website: String,
    description: String,
    logoUrl: String,
    monogram: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    verificationLabel: String,
    avgResponseHours: Number,
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

EmployerProfileSchema.pre('save', function (next) {
  if (!this.monogram && this.companyName) {
    const words = this.companyName.replace(/[^a-zA-Z ]/g, '').split(/\s+/).filter(Boolean);
    this.monogram = (words.length >= 2
      ? words[0][0] + words[1][0]
      : this.companyName.slice(0, 2)
    ).toUpperCase();
  }
  next();
});

EmployerProfileSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    delete ret.__v;
    return ret;
  },
});

export const EmployerProfile = model<IEmployerProfile>('EmployerProfile', EmployerProfileSchema);

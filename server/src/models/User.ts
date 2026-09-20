import { Schema, model, Document, Types } from 'mongoose';
import type { Role } from '../types';

export interface IUser extends Document<Types.ObjectId> {
  email: string;
  passwordHash: string;
  name: string;
  /** Exactly one role per account (one email = one account = one role). Kept as an array for schema compatibility. */
  roles: Role[];
  /** Last portal the user was in; used to pick a landing page after login. */
  lastRole?: Role;
  avatarUrl?: string;
  /** Bumped on password change/reset — tokens carrying an older version are rejected. */
  tokenVersion: number;
  /** Brute-force protection: consecutive failed logins and the lock expiry they trigger. */
  failedLogins: number;
  lockUntil?: Date;
  /** sha256 of the one-time password-reset token, and when it stops being valid. */
  resetTokenHash?: string;
  resetTokenExpires?: Date;
  /** false = signed up but has not entered the emailed code yet. Missing (older accounts) counts as verified. */
  emailVerified?: boolean;
  /** sha256 of the 6-digit verification code, its expiry, and how many wrong guesses it has taken. */
  verifyCodeHash?: string;
  verifyCodeExpires?: Date;
  verifyAttempts?: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    roles: { type: [String], enum: ['seeker', 'employer'], default: [] },
    lastRole: { type: String, enum: ['seeker', 'employer'] },
    avatarUrl: String,
    tokenVersion: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lockUntil: Date,
    resetTokenHash: String,
    resetTokenExpires: Date,
    emailVerified: Boolean,
    verifyCodeHash: String,
    verifyCodeExpires: Date,
    verifyAttempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UserSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    delete ret.passwordHash;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    delete ret.failedLogins;
    delete ret.lockUntil;
    delete ret.tokenVersion;
    delete ret.verifyCodeHash;
    delete ret.verifyCodeExpires;
    delete ret.verifyAttempts;
    delete ret.__v;
    return ret;
  },
});

export const User = model<IUser>('User', UserSchema);

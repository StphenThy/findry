import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config';
import { EmployerProfile, SeekerProfile, User } from '../models';
import type { IEmployerProfile, ISeekerProfile, IUser } from '../models';
import type { Role } from '../types';

export interface JwtPayload {
  sub: string; // user id
  /** Matches User.tokenVersion; a password change bumps it and invalidates older tokens. */
  v: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    seeker?: ISeekerProfile;
    employer?: IEmployerProfile;
  }
}

export function signToken(userId: Types.ObjectId | string, tokenVersion = 0): string {
  return jwt.sign({ sub: String(userId), v: tokenVersion } satisfies JwtPayload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Attaches req.user when a valid Bearer token is present; 401 otherwise. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Not signed in' });
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    if ((payload.v ?? 0) !== (user.tokenVersion ?? 0)) return res.status(401).json({ error: 'Your password changed — please sign in again' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

/**
 * Ensures the user holds the role AND loads the matching profile onto the
 * request. Profiles are created lazily on first entry so onboarding can be
 * resumed at any point.
 */
export function requireRole(role: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    if (!user.roles.includes(role)) {
      return res.status(403).json({
        error: `This account has no ${role} profile yet`,
        code: 'ROLE_MISSING',
        role,
      });
    }
    if (role === 'seeker') {
      req.seeker =
        (await SeekerProfile.findOne({ userId: user._id })) ??
        (await SeekerProfile.create({ userId: user._id }));
    } else {
      req.employer =
        (await EmployerProfile.findOne({ userId: user._id })) ??
        (await EmployerProfile.create({ userId: user._id }));
    }
    if (user.lastRole !== role) {
      user.lastRole = role;
      await user.save();
    }
    next();
  };
}

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

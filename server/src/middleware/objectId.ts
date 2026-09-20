import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

/**
 * 404 early when a route param is not a valid ObjectId. Without this Mongoose
 * throws a CastError, which surfaces as a 500 (and leaks model names in dev).
 */
export function requireObjectId(...params: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const p of params) {
      if (!Types.ObjectId.isValid(req.params[p])) return res.status(404).json({ error: 'Not found' });
    }
    next();
  };
}

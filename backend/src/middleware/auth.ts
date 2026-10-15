import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@a3/contracts';
import { config } from '../config';
import { AppError } from '../utils/app-error';

export interface Actor {
  userId: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

interface AccessClaims {
  sub: string;
  role: UserRole;
}

/** Requires a valid Bearer access token (docs/SECURITY.md §1). */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('UNAUTHENTICATED', 401, 'Please log in.'));
  try {
    const claims = jwt.verify(header.slice(7), config().JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessClaims;
    req.actor = { userId: claims.sub, role: claims.role };
    next();
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    next(new AppError(expired ? 'TOKEN_EXPIRED' : 'UNAUTHENTICATED', 401, expired ? 'Session expired.' : 'Please log in.'));
  }
};

/** Role gate — always used after `authenticate`. Services still check ownership/assignment. */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.actor || !roles.includes(req.actor.role)) return next(AppError.forbidden());
    next();
  };

export const actorOf = (req: Express.Request): Actor => {
  if (!req.actor) throw new AppError('UNAUTHENTICATED', 401, 'Please log in.');
  return req.actor;
};

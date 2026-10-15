import { rateLimit } from 'express-rate-limit';
import type { ApiErrorBody } from '@a3/contracts';

const limited: ApiErrorBody = {
  success: false,
  error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a moment and try again.' },
};

/** Login, register, password reset (docs/SECURITY.md §5). Disabled in tests. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limited,
  skip: () => process.env.NODE_ENV === 'test',
});

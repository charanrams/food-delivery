import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ApiSuccess, PageMeta } from '@a3/contracts';

export const ok = <T>(res: Response, data: T, status = 200, meta?: PageMeta) => {
  const body: ApiSuccess<T> = { success: true, data, ...(meta && { meta }) };
  res.status(status).json(body);
};

/** Express 5 forwards rejected promises itself; this just keeps handler typing tidy. */
export const handler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void): RequestHandler =>
  (req, res, next) =>
    fn(req, res, next);

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Indian mobile numbers → E.164 (+91XXXXXXXXXX). */
export const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return `+91${local}`;
};

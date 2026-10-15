import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError, z } from 'zod';
import type { ApiErrorBody } from '@a3/contracts';
import { AppError } from '../utils/app-error';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found.'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = String(req.id ?? '');
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = new AppError('VALIDATION_ERROR', 400, 'Some fields are invalid.', z.flattenError(err));
  } else if (err instanceof mongoose.Error.CastError) {
    appError = AppError.notFound();
  } else if (isDuplicateKey(err)) {
    appError = AppError.conflict('ALREADY_EXISTS', 'This record already exists.');
  } else if (err?.type === 'entity.parse.failed') {
    appError = new AppError('VALIDATION_ERROR', 400, 'Request body is not valid JSON.');
  } else {
    req.log?.error({ err }, 'unhandled error');
    appError = new AppError('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }

  const body: ApiErrorBody = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
      ...(appError.status >= 500 && { requestId }),
    },
  };
  res.status(appError.status).json(body);
};

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

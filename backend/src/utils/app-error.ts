import type { ErrorCode } from '@a3/contracts';

/** Thrown by services; formatted by the error middleware (docs/ERROR_HANDLING.md). */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(message = 'Resource not found.', code: ErrorCode = 'NOT_FOUND') {
    return new AppError(code, 404, message);
  }

  static forbidden(message = 'You are not allowed to do this.') {
    return new AppError('FORBIDDEN', 403, message);
  }

  static conflict(code: ErrorCode, message: string) {
    return new AppError(code, 409, message);
  }
}

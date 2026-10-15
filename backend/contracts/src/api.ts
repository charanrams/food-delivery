// API envelope + error codes. See docs/API.md and docs/ERROR_HANDLING.md.

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'NOT_ASSIGNED',
  'NOT_FOUND',
  'ADDRESS_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'PRODUCT_NOT_FOUND',
  'ALREADY_EXISTS',
  'INVALID_ORDER_TRANSITION',
  'PRODUCT_UNAVAILABLE',
  'KITCHEN_CLOSED',
  'PARTNER_BUSY',
  'IDEMPOTENCY_CONFLICT',
  'OTP_EXPIRED',
  'OTP_INVALID',
  'OTP_LOCKED',
  'ADDRESS_NOT_SERVICEABLE',
  'COUPON_INVALID',
  'RATE_LIMITED',
  'PAYMENT_PROVIDER_ERROR',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface HealthDto {
  status: 'ok';
  uptimeSeconds: number;
  version: string;
}

export interface ReadinessDto {
  status: 'ready' | 'not_ready';
  database: 'connected' | 'disconnected';
}

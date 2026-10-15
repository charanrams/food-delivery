import { pino } from 'pino';

// Structured JSON logs; secrets and personal data are redacted (docs/OBSERVABILITY.md).
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.refreshToken',
  '*.otp',
  '*.otpHash',
  '*.phone',
  '*.line1',
  '*.line2',
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  base: { service: 'a3-kitchen-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

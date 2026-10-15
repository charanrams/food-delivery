import type { CorsOptions } from 'cors';
import type { Env } from './env';

// Dev-only: Flutter web picks a random localhost port, and phones/emulators on the LAN
// call the API by IP. Native apps send no Origin header at all, so CORS never blocks them.
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

export function corsOptions(env: Pick<Env, 'CORS_ORIGINS' | 'NODE_ENV'>): CorsOptions {
  const dev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  return {
    origin: (origin, cb) => {
      // No Origin = native mobile app, curl, server-to-server → nothing for CORS to enforce.
      if (!origin || env.CORS_ORIGINS.includes(origin) || (dev && DEV_ORIGIN.test(origin))) return cb(null, true);
      cb(null, false); // browser gets no CORS headers and blocks the response
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  };
}

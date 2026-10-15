import { z } from 'zod';

// Validated once at boot; the server refuses to start with bad config (docs/ENVIRONMENT.md).
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    MONGODB_URI: z.string().trim().optional().transform((v) => v || undefined),
    JWT_ACCESS_SECRET: z.string().min(32).default('dev-access-secret-not-for-production-use'),
    JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-not-for-production-use'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('30d'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:5174')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
    PAYMENT_MODE: z.enum(['TEST', 'LIVE']).default('TEST'),
    RAZORPAY_KEY_ID: z.string().trim().optional().transform((v) => v || undefined),
    RAZORPAY_KEY_SECRET: z.string().trim().optional().transform((v) => v || undefined),
    RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional().transform((v) => v || undefined),
    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    // Phone OTP: no SMS provider yet. When on, the code is always DUMMY_OTP_CODE and nothing is sent.
    OTP_DUMMY: z.enum(['true', 'false']).optional(),
    DUMMY_OTP_CODE: z.string().regex(/^\d{6}$/).default('123456'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CLOUDINARY_CLOUD_NAME: z.string().trim().optional().transform((v) => v || undefined),
    CLOUDINARY_API_KEY: z.string().trim().optional().transform((v) => v || undefined),
    CLOUDINARY_API_SECRET: z.string().trim().optional().transform((v) => v || undefined),
    SMTP_HOST: z.string().trim().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    SMTP_USER: z.string().trim().optional().transform((v) => v || undefined),
    SMTP_PASS: z.string().trim().optional().transform((v) => v?.replace(/\s+/g, '') || undefined),
    MAIL_FROM: z.string().trim().optional().transform((v) => v || undefined),
    APP_URL: z.string().trim().default('http://localhost:5173'),
  })
  .superRefine((env, ctx) => {
    const deployed = env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
    if (!deployed) return;
    if (!env.MONGODB_URI) {
      ctx.addIssue({ code: 'custom', path: ['MONGODB_URI'], message: 'required outside development' });
    }
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'required outside development' });
    }
    for (const key of ['SMTP_USER', 'SMTP_PASS'] as const) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'required outside development' });
    }
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (env[key].startsWith('dev-')) {
        ctx.addIssue({ code: 'custom', path: [key], message: 'set a real secret outside development' });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

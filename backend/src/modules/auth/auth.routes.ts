import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AuthResponseDto } from '@a3/contracts';
import { config } from '../../config';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rate-limit';
import { ok } from '../../utils/http';
import {
  checkIdentifier,
  durationMs,
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  resetPassword,
  sendPhoneOtp,
  signupWithPhone,
  startRegistration,
  verifyPhoneOtp,
} from './auth.service';

const COOKIE = 'a3_rt';
const phone = z.string().trim().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
const password = z.string().min(8, 'Use at least 8 characters').max(128);

const email = z.email('Enter a valid email address').max(120);
const otp = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');
const registerStartBody = z.object({ name: z.string().trim().min(2).max(80), phone, email });
const registerBody = registerStartBody.extend({ password, otp });
const forgotBody = z.object({ email });
const resetBody = z.object({ email, otp, password });
// Email or mobile number + password; the role comes back from the server, never from the client.
const loginBody = z.object({ identifier: z.string().trim().min(3).max(120), password: z.string().min(1).max(128) });
const tokenBody = z.object({ refreshToken: z.string().min(20).max(200).optional() }).optional();

/** Mobile apps keep the refresh token in secure storage; browsers get an HttpOnly cookie. */
const isMobile = (req: Request) => req.get('x-client') === 'mobile';

function respond(req: Request, res: Response, result: Required<AuthResponseDto>, status = 200) {
  if (isMobile(req)) return ok(res, result, status);
  res.cookie(COOKIE, result.refreshToken, {
    httpOnly: true,
    secure: config().NODE_ENV !== 'development' && config().NODE_ENV !== 'test',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: durationMs(config().REFRESH_TOKEN_TTL),
  });
  ok(res, { user: result.user, accessToken: result.accessToken }, status);
}

const tokenFrom = (req: Request): string | undefined =>
  isMobile(req) ? (req.body as { refreshToken?: string } | undefined)?.refreshToken : req.cookies?.[COOKIE];

export const authRouter = Router();

authRouter.post('/register/otp', authLimiter, validate({ body: registerStartBody }), async (req, res) => {
  await startRegistration(req.body);
  ok(res, { sent: true });
});

authRouter.post('/password/forgot', authLimiter, validate({ body: forgotBody }), async (req, res) => {
  await forgotPassword(req.body.email);
  ok(res, { sent: true });
});

authRouter.post('/password/reset', authLimiter, validate({ body: resetBody }), async (req, res) => {
  await resetPassword(req.body);
  ok(res, { reset: true });
});

authRouter.post('/register', authLimiter, validate({ body: registerBody }), async (req, res) => {
  respond(req, res, await register(req.body, req.get('user-agent')), 201);
});

authRouter.post('/login', authLimiter, validate({ body: loginBody }), async (req, res) => {
  respond(req, res, await login(req.body, req.get('user-agent')));
});

// One-field login (driveflow pattern) — see auth.service.checkIdentifier.
authRouter.post('/check', authLimiter, validate({ body: z.object({ identifier: z.string().trim().min(3).max(120) }) }), async (req, res) => {
  ok(res, await checkIdentifier(req.body.identifier));
});

// Phone OTP (dummy until an SMS provider is configured) — used for login and sign-up.
const phoneBody = z.object({ phone });
authRouter.post('/phone/otp', authLimiter, validate({ body: phoneBody }), async (req, res) => {
  ok(res, await sendPhoneOtp(req.body.phone));
});
authRouter.post('/phone/verify', authLimiter, validate({ body: phoneBody.extend({ otp }) }), async (req, res) => {
  respond(req, res, await verifyPhoneOtp(req.body, req.get('user-agent')));
});

const signupBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  phone,
  password,
});
authRouter.post('/signup', authLimiter, validate({ body: signupBody }), async (req, res) => {
  respond(req, res, await signupWithPhone(req.body, req.get('user-agent')), 201);
});

authRouter.post('/refresh', validate({ body: tokenBody }), async (req, res) => {
  respond(req, res, await refresh(tokenFrom(req), req.get('user-agent')));
});

authRouter.post('/logout', validate({ body: tokenBody }), async (req, res) => {
  await logout(tokenFrom(req));
  res.clearCookie(COOKIE, { path: '/api/v1/auth' });
  ok(res, { loggedOut: true });
});

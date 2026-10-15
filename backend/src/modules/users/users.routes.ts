import { Router } from 'express';
import { z } from 'zod';
import { Address, RefreshSession, User } from '../../models';
import { actorOf, authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { normalizePhone, ok } from '../../utils/http';
import { toUserDto } from '../auth/auth.service';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/me', async (req, res) => {
  const user = await User.findById(actorOf(req).userId);
  if (!user) throw AppError.notFound('Account not found.');
  ok(res, toUserDto(user));
});

const profileBody = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
    email: z.string().email('Enter a valid email address').max(120).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .optional(),
  })
  .strict();

usersRouter.patch('/me', validate({ body: profileBody }), async (req, res) => {
  const userId = actorOf(req).userId;
  const updates: Record<string, unknown> = {};

  if (req.body.name) updates.name = req.body.name.trim();

  if (req.body.email) {
    const email = req.body.email.toLowerCase().trim();
    const clash = await User.exists({ email, _id: { $ne: userId } });
    if (clash) throw AppError.conflict('ALREADY_EXISTS', 'An account with this email already exists.');
    updates.email = email;
  }

  if (req.body.phone) {
    const phone = normalizePhone(req.body.phone);
    const clash = await User.exists({ phone, _id: { $ne: userId } });
    if (clash) throw AppError.conflict('ALREADY_EXISTS', 'An account with this phone number already exists.');
    updates.phone = phone;
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
  if (!user) throw AppError.notFound('Account not found.');
  ok(res, toUserDto(user));
});

usersRouter.delete('/me', async (req, res) => {
  const userId = actorOf(req).userId;
  await Promise.all([
    User.findByIdAndDelete(userId),
    Address.deleteMany({ userId }),
    RefreshSession.deleteMany({ userId }),
  ]);
  ok(res, { deleted: true, message: 'Account successfully deleted.' });
});

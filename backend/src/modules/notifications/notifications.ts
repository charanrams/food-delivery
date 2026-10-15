import { Router } from 'express';
import type { Types } from 'mongoose';
import type { NotificationDto } from '@a3/contracts';
import { Notification } from '../../models';
import { actorOf, authenticate } from '../../middleware/auth';
import { logger } from '../../utils/logger';
import { ok } from '../../utils/http';

type Id = string | Types.ObjectId;

/**
 * Persist an in-app notification (docs/ARCHITECTURE.md §9: persist before delivery).
 * Never throws — a failed notification must not undo an order transition.
 */
export async function notify(userId: Id, n: { type: string; title: string; message: string; orderId?: Id }): Promise<void> {
  try {
    await Notification.create({ userId, ...n });
  } catch (err) {
    logger.error({ err, type: n.type }, 'notification failed');
  }
}

const toDto = (n: { _id: unknown; type: string; title: string; message: string; orderId?: unknown; readAt?: Date | null; createdAt?: Date }): NotificationDto => ({
  id: String(n._id),
  type: n.type,
  title: n.title,
  message: n.message,
  ...(n.orderId ? { orderId: String(n.orderId) } : {}),
  ...(n.readAt ? { readAt: n.readAt.toISOString() } : {}),
  createdAt: (n.createdAt ?? new Date()).toISOString(),
});

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get('/', async (req, res) => {
  const userId = actorOf(req).userId;
  const [items, unread] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ userId, readAt: null }),
  ]);
  ok(res, { items: items.map(toDto), unread });
});

notificationsRouter.post('/read-all', async (req, res) => {
  await Notification.updateMany({ userId: actorOf(req).userId, readAt: null }, { readAt: new Date() });
  ok(res, { ok: true });
});

notificationsRouter.delete('/:id', async (req, res) => {
  await Notification.deleteOne({ _id: String(req.params.id), userId: actorOf(req).userId });
  ok(res, { ok: true });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  await Notification.updateOne({ _id: String(req.params.id), userId: actorOf(req).userId }, { readAt: new Date() });
  ok(res, { ok: true });
});

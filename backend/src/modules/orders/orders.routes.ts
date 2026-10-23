import { Router } from 'express';
import { z } from 'zod';
import { PAYMENT_METHODS } from '@a3/contracts';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as orders from './orders.service';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParams = z.object({ id: objectId });
const items = z
  .array(z.object({ productId: objectId, variantId: objectId.optional(), quantity: z.number().int().min(1).max(20) }))
  .min(1, 'Your cart is empty.')
  .max(30);
const checkoutBody = z.object({ items, addressId: objectId, paymentMethod: z.enum(PAYMENT_METHODS) });
const reasonBody = z.object({ reason: z.string().trim().max(300).optional() }).optional();

// ---------- Customer: /orders ----------
export const customerOrdersRouter = Router();
customerOrdersRouter.use(authenticate, requireRole('CUSTOMER'));

/** Server-priced preview for the checkout screen (nothing is created). */
customerOrdersRouter.post('/quote', validate({ body: z.object({ items }) }), async (req, res) => {
  ok(res, await orders.quote(req.body.items));
});

customerOrdersRouter.post('/checkout', validate({ body: checkoutBody }), async (req, res) => {
  const key = req.get('idempotency-key')?.slice(0, 80);
  const { order, created } = await orders.checkout(actorOf(req), req.body, key);
  ok(res, order, created ? 201 : 200);
});

customerOrdersRouter.get('/', async (req, res) => {
  ok(res, await orders.listForCustomer(actorOf(req)));
});

customerOrdersRouter.get('/:id', validate({ params: idParams }), async (req, res) => {
  ok(res, await orders.getForCustomer(actorOf(req), String(req.params.id)));
});

customerOrdersRouter.post('/:id/cancel', validate({ params: idParams, body: reasonBody }), async (req, res) => {
  const actor = actorOf(req);
  await orders.customerCancel(actor, String(req.params.id), req.body?.reason);
  ok(res, await orders.getForCustomer(actor, String(req.params.id)));
});

// ---------- Admin: /admin/orders ----------
export const adminOrdersRouter = Router();
adminOrdersRouter.use(authenticate, requireRole('ADMIN'));

const adminQuery = z.object({
  status: z.enum(['ACTIVE', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED', 'CANCELLED']).optional(),
  search: z.string().trim().max(40).optional(),
  customerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  partnerId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

adminOrdersRouter.get('/summary', async (_req, res) => {
  ok(res, await orders.adminSummary());
});

adminOrdersRouter.get('/eligible-partners', async (_req, res) => {
  ok(res, await orders.eligiblePartners());
});

adminOrdersRouter.get('/', validate({ query: adminQuery }), async (_req, res) => {
  const { items: rows, meta } = await orders.listForAdmin(res.locals.query);
  ok(res, rows, 200, meta);
});

adminOrdersRouter.get('/:id', validate({ params: idParams }), async (req, res) => {
  ok(res, await orders.getForAdmin(String(req.params.id)));
});

// Action endpoints — never a generic "set status" (docs/API.md).
adminOrdersRouter.post(
  '/:id/:action',
  validate({
    params: z.object({ id: objectId, action: z.enum(['accept', 'reject', 'prepare', 'ready', 'cancel', 'assign', 'unassign', 'override-delivery']) }),
    body: z.object({ reason: z.string().trim().max(300).optional(), partnerId: objectId.optional() }).optional(),
  }),
  async (req, res) => {
    await orders.adminAction(actorOf(req), String(req.params.id), String(req.params.action), req.body ?? {});
    ok(res, await orders.getForAdmin(String(req.params.id)));
  },
);

// ---------- Delivery partner: /delivery ----------
export const deliveryRouter = Router();
deliveryRouter.use(authenticate, requireRole('DELIVERY_PARTNER'));

deliveryRouter.get('/me', async (req, res) => {
  ok(res, await orders.partnerProfile(actorOf(req)));
});

deliveryRouter.patch('/availability', validate({ body: z.object({ availability: z.enum(['ONLINE', 'OFFLINE']) }) }), async (req, res) => {
  ok(res, await orders.setAvailability(actorOf(req), req.body.availability));
});

deliveryRouter.get('/orders', async (req, res) => {
  ok(res, await orders.listForPartner(actorOf(req), 'active'));
});

deliveryRouter.get('/history', async (req, res) => {
  ok(res, await orders.listForPartner(actorOf(req), 'history'));
});

deliveryRouter.get('/earnings', async (req, res) => {
  ok(res, await orders.partnerEarnings(actorOf(req)));
});

deliveryRouter.get('/orders/:id', validate({ params: idParams }), async (req, res) => {
  ok(res, await orders.getForPartner(actorOf(req), String(req.params.id)));
});

deliveryRouter.post(
  '/orders/:id/:action',
  validate({
    params: z.object({ id: objectId, action: z.enum(['accept', 'decline', 'pickup', 'out-for-delivery', 'regenerate-otp', 'verify-otp']) }),
    body: z
      .object({ reason: z.string().trim().max(300).optional(), otp: z.string().trim().max(6).optional(), cashCollected: z.boolean().optional() })
      .optional(),
  }),
  async (req, res) => {
    const actor = actorOf(req);
    await orders.partnerAction(actor, String(req.params.id), String(req.params.action), req.body ?? {});
    // After a decline the order is no longer ours — answer with the active list instead.
    if (req.params.action === 'decline') return ok(res, { declined: true });
    ok(res, await orders.getForPartner(actor, String(req.params.id)));
  },
);

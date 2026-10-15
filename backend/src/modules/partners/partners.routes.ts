import { Router } from 'express';
import { z } from 'zod';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as partners from './partners.service';

const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
const partnerBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email('Enter a valid email address').max(120),
  phone: z.string().trim().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  vehicleType: z.string().trim().max(40).optional(),
  vehicleNumber: z.string().trim().max(20).optional(),
});
const updateBody = partnerBody.partial().extend({ status: z.enum(['ACTIVE', 'SUSPENDED']).optional() });

/** Admin · Delivery partners — accounts are only ever created here (never self-registered). */
export const partnersRouter = Router();
partnersRouter.use(authenticate, requireRole('ADMIN'));

partnersRouter.get('/', validate({ query: z.object({ search: z.string().max(60).optional() }) }), async (_req, res) => {
  ok(res, await partners.listPartners(res.locals.query.search));
});
partnersRouter.post('/', validate({ body: partnerBody }), async (req, res) => {
  ok(res, await partners.createPartner(actorOf(req), req.body), 201);
});
partnersRouter.patch('/:id', validate({ params: idParams, body: updateBody }), async (req, res) => {
  ok(res, await partners.updatePartner(actorOf(req), String(req.params.id), req.body));
});
partnersRouter.post('/:id/resend-credentials', validate({ params: idParams }), async (req, res) => {
  ok(res, await partners.resendCredentials(actorOf(req), String(req.params.id)));
});
partnersRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  await partners.deletePartner(actorOf(req), String(req.params.id));
  ok(res, { deleted: true });
});

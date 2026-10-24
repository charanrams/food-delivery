import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env';
import { useConfig } from './config';
import { corsOptions } from './config/cors';
import { logger } from './utils/logger';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { adminCatalogRouter, publicCatalogRouter } from './modules/catalog/catalog.routes';
import { uploadsRouter } from './modules/uploads/uploads.routes';
import { partnersRouter } from './modules/partners/partners.routes';
import { addressesRouter } from './modules/addresses/addresses';
import { geoRouter } from './modules/geo/geo';
import { adminOfferSectionsRouter, adminSpecialsRouter, publicSpecialsRouter } from './modules/specials/specials';
import { adminBannersRouter, publicBannersRouter } from './modules/banners/banners';
import { paymentsRouter } from './modules/payments/payments';
import { notificationsRouter } from './modules/notifications/notifications';
import { adminInsightsRouter } from './modules/admin/admin.routes';
import { adminOrdersRouter, customerOrdersRouter, deliveryRouter } from './modules/orders/orders.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

export function createApp(env: Env) {
  useConfig(env);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Nginx in staging/production

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: false,
    }),
  );
  app.use(helmet());
  app.use(cors(corsOptions(env)));
  // Keep the raw bytes for webhook signature checks (Razorpay signs the exact body).
  app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => void ((req as typeof req & { rawBody?: Buffer }).rawBody = buf) }));
  app.use(cookieParser());

  app.use(healthRouter);

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use(publicCatalogRouter);
  api.use('/admin', adminCatalogRouter);
  api.use('/admin/uploads', uploadsRouter);
  api.use('/admin/delivery-partners', partnersRouter);
  api.use('/admin/orders', adminOrdersRouter);
  api.use('/admin', adminInsightsRouter);
  api.use('/addresses', addressesRouter);
  api.use('/geo', geoRouter);
  api.use(publicSpecialsRouter);
  api.use('/admin/specials', adminSpecialsRouter);
  api.use('/admin/offer-sections', adminOfferSectionsRouter);
  api.use(publicBannersRouter);
  api.use('/admin/banners', adminBannersRouter);
  api.use('/orders', customerOrdersRouter);
  api.use('/delivery', deliveryRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/payments', paymentsRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

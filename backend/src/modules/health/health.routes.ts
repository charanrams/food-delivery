import { Router } from 'express';
import type { ApiSuccess, HealthDto, ReadinessDto } from '@a3/contracts';
import { isDatabaseConnected } from '../../config/db';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const body: ApiSuccess<HealthDto> = {
    success: true,
    data: { status: 'ok', uptimeSeconds: Math.round(process.uptime()), version: '0.1.0' },
  };
  res.json(body);
});

healthRouter.get('/health/ready', (_req, res) => {
  const connected = isDatabaseConnected();
  const body: ApiSuccess<ReadinessDto> = {
    success: true,
    data: {
      status: connected ? 'ready' : 'not_ready',
      database: connected ? 'connected' : 'disconnected',
    },
  };
  res.status(connected ? 200 : 503).json(body);
});

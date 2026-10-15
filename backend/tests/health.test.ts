import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Order, syncIndexes } from '../src/models';

const env = loadEnv({ NODE_ENV: 'test' });
const app = createApp(env);

describe('health', () => {
  it('reports liveness without a database', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('reports not ready when the database is down', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.data.database).toBe('disconnected');
  });

  it('returns the standard error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });
});

describe('with database', () => {
  beforeAll(async () => {
    await connectDatabase(env);
    await syncIndexes();
  });
  afterAll(disconnectDatabase);

  it('reports ready', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'ready', database: 'connected' });
  });

  it('rejects non-integer paise on orders', async () => {
    const order = new Order({ totalPaise: 10.5 });
    const err = await order.validate().catch((e: { errors: Record<string, Error> }) => e);
    expect(err?.errors.totalPaise?.message).toMatch(/integer paise/);
  });
});

describe('env', () => {
  it('refuses production without MONGODB_URI or real secrets', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/MONGODB_URI/);
  });
});

describe('cors', () => {
  const prod = createApp(loadEnv({ NODE_ENV: 'test', CORS_ORIGINS: 'https://a3kitchen.in' }));

  it('allows native mobile requests (no Origin header)', async () => {
    const res = await request(prod).get('/health');
    expect(res.status).toBe(200);
  });

  it('answers the preflight for Flutter web on a random localhost port, including X-Client', async () => {
    const res = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:61234')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-client,authorization');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:61234');
    expect(res.headers['access-control-allow-headers']).toMatch(/x-client/i);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('allows a phone on the LAN in development', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://192.168.1.25:8080');
    expect(res.headers['access-control-allow-origin']).toBe('http://192.168.1.25:8080');
  });

  it('does not allow unknown public origins', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

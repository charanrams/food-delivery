import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import type { Env } from './env';
import { logger } from '../utils/logger';

export let usingMemoryServer = false;
let memoryServer: { stop: () => Promise<boolean> } | undefined;

/**
 * Connects to MongoDB. Without MONGODB_URI (development/test only) it starts an
 * in-memory replica set so transactions work without a local install (DECISIONS 017).
 */
export async function connectDatabase(env: Pick<Env, 'MONGODB_URI' | 'NODE_ENV'>): Promise<void> {
  let uri = env.MONGODB_URI;
  if (!uri) {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    // Development keeps data on disk (backend/.data/mongo) so accounts survive `tsx watch` restarts;
    // tests stay throwaway. Fixed port: the replica-set config stores host:port, so it must match on reopen.
    const persist = env.NODE_ENV === 'development';
    const dbPath = resolve(process.cwd(), '.data/mongo');
    if (persist) mkdirSync(dbPath, { recursive: true });
    const replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: persist ? 'wiredTiger' : 'ephemeralForTest' },
      instanceOpts: persist ? [{ dbPath, port: 27117, storageEngine: 'wiredTiger' }] : undefined,
    });
    memoryServer = { stop: () => replSet.stop({ doCleanup: !persist }) };
    usingMemoryServer = true;
    uri = replSet.getUri('a3kitchen');
    logger.warn(persist ? `MONGODB_URI not set — using local dev MongoDB at ${dbPath} (data persists)` : 'MONGODB_URI not set — using in-memory MongoDB');
  }
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri);
    console.log(`[Database] MongoDB connected successfully to '${mongoose.connection.name}'`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Database] MongoDB connection failed: ${msg}`);
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  await memoryServer?.stop();
  memoryServer = undefined;
}

export const isDatabaseConnected = (): boolean => mongoose.connection.readyState === 1;

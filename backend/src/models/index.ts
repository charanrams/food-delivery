import mongoose from 'mongoose';

export * from './identity.models';
export * from './catalog.models';
export * from './order.models';
export * from './platform.models';

/** Builds indexes declared on every model (run at boot; review query plans before prod). */
export async function syncIndexes(): Promise<void> {
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

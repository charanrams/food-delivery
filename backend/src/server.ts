import { loadEnv } from './config/env';
import { connectDatabase, disconnectDatabase, usingMemoryServer } from './config/db';
import { seedDemoData } from './scripts/seed-data';
import { ensureCategoryRows, ensurePopularSection, ensureTodaySpecialsSection } from './modules/specials/specials';
import { seedDemoActivity } from './scripts/seed-activity';
import { createApp } from './app';
import { logger } from './utils/logger';
import { syncIndexes } from './models';

async function main() {
  const env = loadEnv();
  await connectDatabase(env);
  await syncIndexes();
  // In-memory dev DB starts empty on every boot — seed it so the apps have data.
  if (usingMemoryServer) {
    await seedDemoData();
    await seedDemoActivity();
  }
  await ensureTodaySpecialsSection();
  await ensurePopularSection();
  await ensureCategoryRows();

  const app = createApp(env);
  const server = app.listen(env.PORT, () => {
    console.log(`[Server] A3 Kitchen API started successfully on port ${env.PORT} (http://localhost:${env.PORT})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[Server] Shutting down (${signal})...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[Server] Failed to start on port: ${msg}`);
  process.exit(1);
});

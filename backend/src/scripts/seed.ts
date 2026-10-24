import { loadEnv } from '../config/env';
import { useConfig } from '../config';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { syncIndexes } from '../models';
import { seedDemoData } from './seed-data';
import { seedDemoActivity } from './seed-activity';
import { seedBanners } from './seed-banners';

// `npm run seed -w backend` — seeds an empty dev/staging database.
const env = loadEnv();
if (env.NODE_ENV === 'production') throw new Error('Refusing to seed production.');
useConfig(env);
await connectDatabase(env);
await syncIndexes();
await seedDemoData();
await seedDemoActivity();
await seedBanners();
await disconnectDatabase();

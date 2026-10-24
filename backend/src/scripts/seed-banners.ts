import { loadEnv } from '../config/env';
import { useConfig } from '../config';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Banner } from '../models';
import { logger } from '../utils/logger';
import photos from './photos.json' with { type: 'json' };

// `npm run seed:banners -w backend` — adds the Home carousel banners. Safe to re-run and safe on
// production: a banner whose title already exists is left alone (admin edits are kept).
const PHOTOS = photos as Record<string, string>;

const BANNERS = [
  {
    title: 'Andhra Meals',
    highlight: 'Full Thali',
    subtitle: 'Rice, dal, two curries, rasam, curd, papad and pickle.',
    buttonText: 'Order Thali',
    linkType: 'product',
    linkValue: 'andhra-veg-meals',
    photo: 'andhra-veg-meals',
  },
  {
    title: 'Fiery & Slow-Cooked',
    highlight: 'Gongura Mutton',
    subtitle: 'Tangy sorrel leaves and tender mutton, Andhra style.',
    buttonText: 'Explore Curries',
    linkType: 'category',
    linkValue: 'curries',
    photo: 'gongura-mutton-curry',
  },
  {
    title: 'Fresh from the Tawa',
    highlight: 'Tiffins All Day',
    subtitle: 'Crisp ghee dosa, idli and vada with fresh chutneys.',
    buttonText: 'See Tiffins',
    linkType: 'category',
    linkValue: 'tiffins',
    photo: 'hero',
  },
  {
    title: 'Sweet Endings',
    highlight: 'Gulab Jamun',
    subtitle: 'Soft, warm and soaked in rose-cardamom syrup.',
    buttonText: 'Add Dessert',
    linkType: 'category',
    linkValue: 'desserts',
    photo: 'gulab-jamun',
  },
] as const;

export async function seedBanners() {
  const existing = new Set((await Banner.find().select('title').lean()).map((b) => b.title));
  let order = existing.size;
  for (const { photo, ...b } of BANNERS) {
    if (existing.has(b.title)) {
      logger.info(`banners: "${b.title}" already there, skipped`);
      continue;
    }
    const image = PHOTOS[photo];
    if (!image) {
      logger.warn(`banners: no photo "${photo}" in photos.json, skipped "${b.title}"`);
      continue;
    }
    await Banner.create({ ...b, image, isActive: true, sortOrder: order++ });
    logger.info(`banners: added "${b.title}"`);
  }
}

// Run directly (not when the main seed imports it).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed-banners.ts')) {
  const env = loadEnv();
  useConfig(env);
  await connectDatabase(env);
  await seedBanners();
  await disconnectDatabase();
}

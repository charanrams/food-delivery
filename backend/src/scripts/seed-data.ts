import { Category, DeliveryPartnerProfile, Product, Settings, User } from '../models';
import { hashPassword } from '../modules/auth/auth.service';
import { slugify } from '../utils/http';
import { logger } from '../utils/logger';
import { CATEGORY_PHOTO } from '@a3/contracts';
import photos from './photos.json' with { type: 'json' };

// Development/staging seed (docs/DATABASE.md §12). Never run against production.
// Staff accounts are seeded here because self-registration only ever creates customers.
export const SEED_PASSWORD = process.env.SEED_PASSWORD || 'A3kitchen@123';
export const SEED_ACCOUNTS = [
  { name: 'A3 Kitchen Admin', email: 'admin@a3kitchen.in', phone: '+919000000001', role: 'ADMIN' as const },
  { name: 'Suresh R.', email: 'delivery@a3kitchen.in', phone: '+919000000002', role: 'DELIVERY_PARTNER' as const },
  { name: 'Ravi Kumar', email: 'customer@a3kitchen.in', phone: '+919000000003', role: 'CUSTOMER' as const },
  { name: 'Charan', email: 'ramanakulamcharan@gmail.com', phone: '+916305804155', role: 'CUSTOMER' as const },
];

const PHOTOS = photos as Record<string, string>;
const CATEGORIES = ['Biryani & Rice', 'Curries', 'Meals & Thalis', 'Tiffins', 'Breads', 'Desserts'];

const PRODUCTS: [string, string, string, number, boolean, number, [string, number][]?][] = [
  ['Biryani & Rice', 'Chicken Dum Biryani', 'Slow-cooked basmati layered with tender chicken and house masala, finished on dum. Served with raita.', 24900, false, 25, [['Half', 14900], ['Full', 24900], ['Family pack · serves 3–4', 59900]]],
  ['Biryani & Rice', 'Paneer Tikka Biryani', 'Smoky paneer tikka layered with fragrant rice.', 23900, true, 25],
  ['Curries', 'Paneer Butter Masala', 'Soft paneer in a rich tomato-cashew gravy.', 21900, true, 20],
  ['Curries', 'Gongura Mutton Curry', 'Tangy sorrel-leaf curry with slow-cooked mutton.', 32900, false, 30],
  ['Curries', 'Palak Paneer', 'Paneer cubes in a smooth spiced spinach gravy.', 20900, true, 20],
  ['Meals & Thalis', 'Andhra Veg Meals', 'Rice, dal, two curries, rasam, curd and pickle.', 17900, true, 15],
  ['Tiffins', 'Ghee Masala Dosa', 'Crisp dosa, potato masala, chutney and sambar.', 9900, true, 12],
  ['Breads', 'Butter Naan', 'Soft tandoor naan brushed with butter.', 4900, true, 8],
  ['Desserts', 'Gulab Jamun', 'Two warm, syrup-soaked milk dumplings.', 6900, true, 5],
];

export async function seedDemoData(): Promise<void> {
  if (await User.exists({})) return; // idempotent: only seeds an empty database

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const users = await User.insertMany(SEED_ACCOUNTS.map((a) => ({ ...a, passwordHash })));
  const partner = users.find((u) => u.role === 'DELIVERY_PARTNER')!;
  await DeliveryPartnerProfile.create({ userId: partner._id, availability: 'OFFLINE' });

  const cats = await Category.insertMany(
    CATEGORIES.map((name, i) => {
      const slug = slugify(name);
      const photo = PHOTOS[CATEGORY_PHOTO[slug] ?? ''];
      return { name, slug, sortOrder: i, ...(photo && { imageUrl: photo }) };
    }),
  );
  const catId = new Map(cats.map((c) => [c.name, c._id]));
  await Product.insertMany(
    PRODUCTS.map(([cat, name, description, pricePaise, isVegetarian, preparationTimeMinutes, variants]) => {
      const slug = slugify(name);
      return {
        categoryId: catId.get(cat),
        name,
        slug,
        description,
        images: PHOTOS[slug] ? [PHOTOS[slug]] : [],
        pricePaise,
        isVegetarian,
        preparationTimeMinutes,
        isAvailable: name !== 'Gongura Mutton Curry',
        variants: variants?.map(([n, p]) => ({ name: n, pricePaise: p })) ?? [],
      };
    }),
  );

  await Settings.updateOne(
    { _id: 'kitchen' },
    {
      $setOnInsert: {
        isAcceptingOrders: true,
        kitchenHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '11:00', close: '22:30' })),
        deliveryFeePaise: 3900,
        freeDeliveryAbovePaise: 49900,
        taxRateBps: 500,
        serviceablePostalCodes: ['500072', '500081', '500085', '500032'],
      },
    },
    { upsert: true },
  );

  logger.info({ accounts: SEED_ACCOUNTS.map((a) => `${a.role}: ${a.email}`) }, 'seeded accounts and menu (password: SEED_PASSWORD)');
}

/** Hero image for the storefront (served via the settings/public endpoint later). */
export const HERO_PHOTO = PHOTOS.hero;

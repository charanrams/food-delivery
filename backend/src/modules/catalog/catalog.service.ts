import { isValidObjectId, type QueryFilter, type Types } from 'mongoose';
import type { CategoryDto, PageMeta, ProductDto } from '@a3/contracts';
import { AuditLog, Category, Order, Product, type CategoryDoc, type ProductDoc } from '../../models';
import type { Actor } from '../../middleware/auth';
import { AppError } from '../../utils/app-error';
import { slugify } from '../../utils/http';
import { assertOwnImageUrl } from '../uploads/uploads.service';

type WithId<T> = T & { _id: unknown };

export const toCategoryDto = (c: WithId<CategoryDoc>, productCount?: number): CategoryDto => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
  ...(c.description && { description: c.description }),
  ...(c.imageUrl && { imageUrl: c.imageUrl }),
  sortOrder: c.sortOrder,
  isActive: c.isActive,
  showOnHome: !!c.showOnHome,
  ...(productCount !== undefined && { productCount }),
});

export const toProductDto = (p: WithId<ProductDoc>): ProductDto => ({
  id: String(p._id),
  categoryId: String(p.categoryId),
  name: p.name,
  slug: p.slug,
  description: p.description,
  images: p.images,
  pricePaise: p.pricePaise,
  ...(p.compareAtPricePaise != null && { compareAtPricePaise: p.compareAtPricePaise }),
  isAvailable: p.isAvailable,
  isArchived: p.isArchived,
  ...(p.isVegetarian != null && { isVegetarian: p.isVegetarian }),
  ...(p.preparationTimeMinutes != null && { preparationTimeMinutes: p.preparationTimeMinutes }),
  variants: p.variants.map((v) => ({
    id: String((v as unknown as { _id: unknown })._id),
    name: v.name,
    pricePaise: v.pricePaise,
    isAvailable: v.isAvailable,
  })),
});

const audit = (actor: Actor, action: string, entityType: string, entityId: string | Types.ObjectId, metadata?: object) =>
  AuditLog.create({ actorId: actor.userId, actorRole: actor.role, action, entityType, entityId, metadata });

async function uniqueSlug(model: typeof Category | typeof Product, name: string, excludeId?: string) {
  const base = slugify(name) || 'item';
  for (let i = 0; ; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const clash = await (model as typeof Category).exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) });
    if (!clash) return slug;
  }
}

// ---------- Categories ----------

export async function listCategories({ includeInactive = false } = {}): Promise<CategoryDto[]> {
  const cats = await Category.find(includeInactive ? {} : { isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  const counts = await Product.aggregate<{ _id: unknown; n: number }>([
    { $match: { isArchived: false } },
    { $group: { _id: '$categoryId', n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  return cats.map((c) => toCategoryDto(c, byId.get(String(c._id)) ?? 0));
}

export async function createCategory(actor: Actor, input: { name: string; description?: string; imageUrl?: string; sortOrder?: number; isActive?: boolean }) {
  if (input.imageUrl) assertOwnImageUrl(input.imageUrl);
  const doc = await Category.create({ ...input, slug: await uniqueSlug(Category, input.name) });
  await audit(actor, 'category.create', 'Category', doc._id);
  return toCategoryDto(doc.toObject());
}

export async function updateCategory(actor: Actor, id: string, input: Partial<{ name: string; description: string; imageUrl: string; sortOrder: number; isActive: boolean; showOnHome: boolean }>) {
  if (input.imageUrl) assertOwnImageUrl(input.imageUrl);
  const update = { ...input, ...(input.name && { slug: await uniqueSlug(Category, input.name, id) }) };
  const doc = await Category.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  if (!doc) throw AppError.notFound('Category not found.');
  await audit(actor, 'category.update', 'Category', doc._id, { fields: Object.keys(input) });
  return toCategoryDto(doc);
}

/** Categories with live products are deactivated, never deleted (DATABASE.md §5). */
export async function removeCategory(actor: Actor, id: string) {
  const active = await Product.countDocuments({ categoryId: id, isArchived: false });
  if (active > 0) {
    throw AppError.conflict('ALREADY_EXISTS', `This category still has ${active} dish(es). Move or archive them first, or hide the category instead.`);
  }
  const doc = await Category.findByIdAndDelete(id);
  if (!doc) throw AppError.notFound('Category not found.');
  await audit(actor, 'category.delete', 'Category', doc._id);
}

// ---------- Products ----------

export interface ProductQuery {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  veg?: boolean;
  available?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
  page: number;
  limit: number;
}

export async function listProducts(q: ProductQuery, { admin = false } = {}): Promise<{ items: ProductDto[]; meta: PageMeta }> {
  const filter: QueryFilter<ProductDoc> = admin ? {} : { isArchived: false };
  if (!admin) {
    const activeCats = await Category.find({ isActive: true }).distinct('_id');
    filter.categoryId = { $in: activeCats };
  }
  if (q.categorySlug) {
    const cat = await Category.findOne({ slug: q.categorySlug }).lean();
    if (!cat) return { items: [], meta: { page: q.page, limit: q.limit, total: 0 } };
    filter.categoryId = cat._id;
  }
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.search) filter.name = { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (q.veg) filter.isVegetarian = true;
  if (q.available !== undefined) filter.isAvailable = q.available;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    filter.pricePaise = { ...(q.minPrice !== undefined && { $gte: q.minPrice }), ...(q.maxPrice !== undefined && { $lte: q.maxPrice }) };
  }
  const sort: Record<string, 1 | -1> =
    q.sort === 'price_asc' ? { pricePaise: 1 } : q.sort === 'price_desc' ? { pricePaise: -1 } : q.sort === 'newest' ? { createdAt: -1 } : { isAvailable: -1, name: 1 };

  const [docs, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { items: docs.map(toProductDto), meta: { page: q.page, limit: q.limit, total } };
}

export async function getProduct(idOrSlug: string, { admin = false } = {}): Promise<ProductDto> {
  const doc = await Product.findOne(isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug }).lean();
  if (!doc || (!admin && doc.isArchived)) throw AppError.notFound('Dish not found.', 'PRODUCT_NOT_FOUND');
  return toProductDto(doc);
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description?: string;
  images?: string[];
  pricePaise: number;
  compareAtPricePaise?: number;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  preparationTimeMinutes?: number;
  variants?: { name: string; pricePaise: number; isAvailable?: boolean }[];
}

async function assertCategory(id: string) {
  if (!(await Category.exists({ _id: id }))) throw new AppError('VALIDATION_ERROR', 400, 'Choose an existing category.');
}

export async function createProduct(actor: Actor, input: ProductInput) {
  await assertCategory(input.categoryId);
  input.images?.forEach(assertOwnImageUrl);
  const doc = await Product.create({ ...input, slug: await uniqueSlug(Product, input.name) });
  await audit(actor, 'product.create', 'Product', doc._id);
  return toProductDto(doc.toObject());
}

export async function updateProduct(actor: Actor, id: string, input: Partial<ProductInput>) {
  if (input.categoryId) await assertCategory(input.categoryId);
  input.images?.forEach(assertOwnImageUrl);
  const before = await Product.findById(id).lean();
  if (!before) throw AppError.notFound('Dish not found.', 'PRODUCT_NOT_FOUND');
  const update = { ...input, ...(input.name && { slug: await uniqueSlug(Product, input.name, id) }) };
  const doc = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
  // Price changes are audited with before/after (docs/DATABASE.md §9).
  const priceChanged = input.pricePaise !== undefined && input.pricePaise !== before.pricePaise;
  await audit(actor, 'product.update', 'Product', id, {
    fields: Object.keys(input),
    ...(priceChanged && { pricePaise: { from: before.pricePaise, to: input.pricePaise } }),
  });
  return toProductDto(doc!);
}

export async function setAvailability(actor: Actor, id: string, isAvailable: boolean) {
  const doc = await Product.findByIdAndUpdate(id, { isAvailable }, { new: true }).lean();
  if (!doc) throw AppError.notFound('Dish not found.', 'PRODUCT_NOT_FOUND');
  await audit(actor, isAvailable ? 'product.available' : 'product.unavailable', 'Product', id);
  return toProductDto(doc);
}

/** Archive, never delete — past orders still reference the product. */
export async function archiveProduct(actor: Actor, id: string, archived = true) {
  const doc = await Product.findByIdAndUpdate(id, { isArchived: archived, ...(archived && { isAvailable: false }) }, { new: true }).lean();
  if (!doc) throw AppError.notFound('Dish not found.', 'PRODUCT_NOT_FOUND');
  await audit(actor, archived ? 'product.archive' : 'product.restore', 'Product', id);
  return toProductDto(doc);
}

/** Best sellers (last 30 days, by quantity, ignoring cancelled/rejected orders), then the rest of the menu. */
export async function popularProducts(limit: number): Promise<ProductDto[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const top = await Order.aggregate<{ _id: unknown; qty: number }>([
    { $match: { createdAt: { $gte: since }, status: { $nin: ['CANCELLED', 'REJECTED'] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', qty: { $sum: '$items.quantity' } } },
    { $sort: { qty: -1 } },
    { $limit: 50 },
  ]);
  const activeCats = await Category.find({ isActive: true }).distinct('_id');
  const base = { isArchived: false, isAvailable: true, categoryId: { $in: activeCats } };
  const ranked = await Product.find({ ...base, _id: { $in: top.map((t) => t._id) } }).lean();
  const rank = new Map(top.map((t, i) => [String(t._id), i]));
  ranked.sort((a, b) => rank.get(String(a._id))! - rank.get(String(b._id))!);
  const picked = ranked.slice(0, limit);
  if (picked.length < limit) {
    const rest = await Product.find({ ...base, _id: { $nin: picked.map((p) => p._id) } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .limit(limit - picked.length)
      .lean();
    picked.push(...rest);
  }
  return picked.map((p) => toProductDto(p));
}

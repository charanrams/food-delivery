import { Schema, model, type InferSchemaType } from 'mongoose';
import { objectId, paise } from './_shared';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: String,
    imageUrl: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /** Show this category's dishes as its own row on the customer Home. */
    showOnHome: { type: Boolean, default: false },
  },
  { timestamps: true },
);
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, sortOrder: 1 });
export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);

const variantSchema = new Schema({
  name: { type: String, required: true, trim: true },
  pricePaise: paise(),
  isAvailable: { type: Boolean, default: true },
});

const productSchema = new Schema(
  {
    categoryId: objectId('Category'),
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    images: { type: [String], default: [] },
    pricePaise: paise(),
    compareAtPricePaise: paise(false),
    isAvailable: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false }, // products are archived, never deleted
    isVegetarian: Boolean,
    preparationTimeMinutes: { type: Number, min: 0 },
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true },
);
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ categoryId: 1, isAvailable: 1 });
productSchema.index({ name: 'text', description: 'text' });
export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product = model('Product', productSchema);

const cartSchema = new Schema(
  {
    customerId: objectId('User'),
    // Prices are never stored in the cart — always recomputed server-side.
    items: [
      {
        _id: false,
        productId: objectId('Product'),
        variantId: { type: Schema.Types.ObjectId },
        quantity: { type: Number, required: true, min: 1, max: 20 },
      },
    ],
  },
  { timestamps: true },
);
cartSchema.index({ customerId: 1 }, { unique: true });
export const Cart = model('Cart', cartSchema);

/** Home-screen "Today's specials": a dish with a percentage off, optionally time-boxed. */
const specialSchema = new Schema(
  {
    productId: objectId('Product'),
    /** Offer section this deal belongs to; empty = the built-in "Today's specials". */
    sectionId: { type: Schema.Types.ObjectId, ref: 'OfferSection' },
    discountPercent: { type: Number, required: true, min: 1, max: 90 },
    label: { type: String, trim: true, maxlength: 40 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
specialSchema.index({ isActive: 1, sortOrder: 1 });
specialSchema.index({ productId: 1 }, { unique: true }); // one special per dish
export type SpecialDoc = InferSchemaType<typeof specialSchema>;
export const Special = model('Special', specialSchema);

/** Admin-made Home rows that work like Today's specials (e.g. "Weekend deals"). */
const offerSectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 40 },
    subtitle: { type: String, trim: true, maxlength: 80 },
    /** DEALS = admin-picked discounted dishes; POPULAR = automatic best sellers (no discounts, can't be deleted). */
    kind: { type: String, enum: ['DEALS', 'POPULAR', 'CATEGORY'], default: 'DEALS' },
    /** CATEGORY rows: the category whose dishes the row shows. */
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    /** Optional run window for the whole section (its deals follow it). */
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
offerSectionSchema.index({ isActive: 1, sortOrder: 1 });
export type OfferSectionDoc = InferSchemaType<typeof offerSectionSchema>;
export const OfferSection = model('OfferSection', offerSectionSchema);

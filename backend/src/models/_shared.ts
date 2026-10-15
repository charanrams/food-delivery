import { Schema } from 'mongoose';

/** Integer paise, never negative (DECISIONS 006). */
export const paise = (required = true) => ({
  type: Number,
  required,
  min: 0,
  validate: { validator: Number.isInteger, message: '{PATH} must be integer paise' },
});

export const objectId = (ref: string, required = true) => ({
  type: Schema.Types.ObjectId,
  ref,
  required,
});

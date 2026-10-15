export * from './enums';
export * from './api';
export * from './dto';

/** Money helpers — all amounts are integer paise. */
export const formatPaise = (paise: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
export * from './photo-credits';

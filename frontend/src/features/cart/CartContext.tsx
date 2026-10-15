import { useQuery } from '@tanstack/react-query';
import { specialsQuery } from '@/lib/catalog-api';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ProductDto, VariantDto } from '@a3/contracts';
import { PRICING } from '@/lib/mock-data';

/** A cart line keeps a product snapshot for display; the server re-prices it at checkout. */
export interface CartLine {
  product: ProductDto;
  variantId?: string;
  quantity: number;
}

export interface PricedLine extends CartLine {
  key: string;
  variant?: VariantDto;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface CartTotals {
  itemTotalPaise: number;
  /** Today's-specials savings (display estimate — the server's quote is what's charged). */
  discountPaise?: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
}

interface CartState {
  lines: PricedLine[];
  count: number;
  totals: CartTotals;
  add: (product: ProductDto, variantId: string | undefined, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const MAX_QTY = 20;
const CartContext = createContext<CartState | null>(null);
const lineKey = (productId: string, variantId?: string) => `${productId}:${variantId ?? ''}`;

/** Pure display pricing — the server recalculates at checkout and its total wins. */
export function priceCart(raw: CartLine[], offers: Map<string, number> = new Map()): { lines: PricedLine[]; totals: CartTotals } {
  const lines = raw.map((l) => {
    const variant = l.product.variants.find((v) => v.id === l.variantId);
    const unitPricePaise = variant?.pricePaise ?? l.product.pricePaise;
    return { ...l, key: lineKey(l.product.id, l.variantId), variant, unitPricePaise, lineTotalPaise: unitPricePaise * l.quantity };
  });
  const itemTotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  // Same rule as the server: % off each special dish's line; fee and GST on the discounted amount.
  const discountPaise = lines.reduce((s, l) => {
    const pct = offers.get(l.product.id);
    return pct ? s + (l.lineTotalPaise - Math.round((l.lineTotalPaise * (100 - pct)) / 100)) : s;
  }, 0);
  const net = itemTotalPaise - discountPaise;
  const deliveryFeePaise = itemTotalPaise === 0 || net >= PRICING.freeDeliveryAbovePaise ? 0 : PRICING.deliveryFeePaise;
  const taxPaise = Math.round((net * PRICING.taxRateBps) / 10_000);
  return { lines, totals: { itemTotalPaise, discountPaise, deliveryFeePaise, taxPaise, totalPaise: net + deliveryFeePaise + taxPaise } };
}

const CART_KEY = 'a3_cart_v1';
function loadCart(): CartLine[] {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((l) => l?.product?.id && Number.isInteger(l.quantity) && l.quantity > 0) : [];
  } catch {
    return [];
  }
}
function saveCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    /* storage blocked: cart stays in memory */
  }
}

export function CartProvider({ children, initial = [] }: { children: ReactNode; initial?: CartLine[] }) {
  // Kept in localStorage so a reload (or the Razorpay redirect) doesn't empty the cart.
  // The server re-prices everything at checkout, so a stale snapshot can't change what's charged.
  const [raw, setRaw] = useState<CartLine[]>(() => (initial.length ? initial : loadCart()));
  useEffect(() => saveCart(raw), [raw]);

  const add = useCallback((product: ProductDto, variantId: string | undefined, quantity: number) => {
    setRaw((prev) => {
      const key = lineKey(product.id, variantId);
      const existing = prev.find((l) => lineKey(l.product.id, l.variantId) === key);
      if (!existing) return [...prev, { product, variantId, quantity: Math.min(quantity, MAX_QTY) }];
      return prev.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + quantity, MAX_QTY) } : l));
    });
  }, []);
  const setQuantity = useCallback((key: string, quantity: number) => {
    setRaw((prev) =>
      quantity <= 0
        ? prev.filter((l) => lineKey(l.product.id, l.variantId) !== key)
        : prev.map((l) => (lineKey(l.product.id, l.variantId) === key ? { ...l, quantity: Math.min(quantity, MAX_QTY) } : l)),
    );
  }, []);
  const remove = useCallback((key: string) => setRaw((prev) => prev.filter((l) => lineKey(l.product.id, l.variantId) !== key)), []);
  const clear = useCallback(() => setRaw([]), []);

  const specials = useQuery(specialsQuery);
  const offers = useMemo(() => new Map((specials.data ?? []).map((s) => [s.product.id, s.discountPercent])), [specials.data]);
  const value = useMemo(() => {
    const { lines, totals } = priceCart(raw, offers);
    return { lines, totals, count: raw.reduce((s, l) => s + l.quantity, 0), add, setQuantity, remove, clear };
  }, [raw, offers, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

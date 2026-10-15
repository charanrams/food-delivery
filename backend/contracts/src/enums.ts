// Shared enums — single source for server, web and (by hand) Flutter.
// See docs/DATABASE.md and docs/ARCHITECTURE.md §6.

export const USER_ROLES = ['CUSTOMER', 'ADMIN', 'DELIVERY_PARTNER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'PENDING'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ADDRESS_LABELS = ['HOME', 'WORK', 'OTHER'] as const;
export type AddressLabel = (typeof ADDRESS_LABELS)[number];

export const ORDER_STATUSES = [
  'PLACED',
  'ACCEPTED',
  'REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['COD', 'RAZORPAY', 'TEST'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PARTNER_AVAILABILITY = ['ONLINE', 'OFFLINE'] as const;
export type PartnerAvailability = (typeof PARTNER_AVAILABILITY)[number];

export const ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'PICKED_UP',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/** Allowed order transitions (MVP policy). Enforced only by the server state machine. */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['ASSIGNED'],
  ASSIGNED: ['READY_FOR_PICKUP', 'PICKED_UP'],
  PICKED_UP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

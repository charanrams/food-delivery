// Response shapes returned by the API (docs/API.md). Requests are validated server-side with Zod.
import type { PartnerAvailability, UserRole, UserStatus } from './enums';

export interface UserDto {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
  /** Only returned to mobile clients (`X-Client: mobile`); web uses the HttpOnly cookie. */
  refreshToken?: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  /** Shown as its own row on the customer Home. */
  showOnHome: boolean;
  productCount?: number;
}

export interface VariantDto {
  id: string;
  name: string;
  pricePaise: number;
  isAvailable: boolean;
}

export interface ProductDto {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  pricePaise: number;
  compareAtPricePaise?: number;
  isAvailable: boolean;
  isArchived: boolean;
  isVegetarian?: boolean;
  preparationTimeMinutes?: number;
  /** Average customer rating (1–5, one decimal) and how many reviews it's from. */
  rating?: number;
  ratingCount?: number;
  variants: VariantDto[];
}

export interface UploadSignatureDto {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

/** Admin view of a delivery partner (user + partner profile). */
export interface DeliveryPartnerDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  availability: PartnerAvailability;
  vehicleType?: string;
  vehicleNumber?: string;
  createdAt: string;
}

// ---------- Addresses ----------
export interface AddressDto {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  /** Whether the kitchen currently delivers to this postal code. */
  isServiceable: boolean;
  /** Map pin, when the customer dropped one. */
  lat?: number;
  lng?: number;
}

/** A place from /geo/search or /geo/reverse, ready to fill the address form. */
export interface PlaceDto {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

// ---------- Orders ----------
export interface OrderItemDto {
  productId: string;
  productName: string;
  imageUrl?: string;
  variantName?: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface OrderTimelineDto {
  placedAt: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface OrderPartnerDto {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: import('./enums').OrderStatus;
  paymentStatus: import('./enums').PaymentStatus;
  paymentMethod: import('./enums').PaymentMethod;
  items: OrderItemDto[];
  deliveryAddress: Omit<AddressDto, 'id' | 'label' | 'isDefault' | 'isServiceable'>;
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  timeline: OrderTimelineDto;
  rejectionReason?: string;
  cancellationReason?: string;
  /** Customer's rating after delivery. */
  review?: { rating: number; comment?: string; createdAt: string };
  customer?: { id: string; name: string; phone: string };
  partner?: OrderPartnerDto;
  assignmentStatus?: import('./enums').AssignmentStatus;
  /** Plain delivery code — only ever returned to the order's own customer while out for delivery. */
  deliveryOtp?: string;
  /** Present right after checkout for online orders: open Razorpay with this. */
  razorpay?: RazorpayCheckoutDto;
  /** Allowed next actions for the requesting role (UI hint; the server re-checks). */
  actions: string[];
}

export interface CheckoutRequestDto {
  items: { productId: string; variantId?: string; quantity: number }[];
  addressId: string;
  paymentMethod: import('./enums').PaymentMethod;
}

export interface CheckoutQuoteDto {
  items: OrderItemDto[];
  subtotalPaise: number;
  /** Savings from active specials (already taken off the total). */
  discountPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  /** Lines removed or changed because availability/price differs from the client's cart. */
  warnings: string[];
}

export interface EligiblePartnerDto {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string;
  activeAssignments: number;
  suggested: boolean;
}

export interface DeliveryProfileDto {
  id: string;
  name: string;
  email?: string;
  phone: string;
  availability: import('./enums').PartnerAvailability;
  vehicleType?: string;
  vehicleNumber?: string;
  todayDelivered: number;
  bank?: PartnerBankDto;
}

export interface PartnerBankDto {
  holderName: string;
  accountLast4: string;
  ifsc: string;
  upiId?: string;
}

/** One Monday–Sunday (IST) earnings statement for a delivery partner. */
export interface PartnerWeeklyStatementDto {
  weekStart: string; // ISO
  weekEnd: string; // ISO, exclusive
  current: boolean;
  deliveredCount: number;
  earningsPaise: number;
  codCashCollectedPaise: number;
}

// ---------- Notifications ----------
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  orderId?: string;
  readAt?: string;
  createdAt: string;
}

export interface AdminSummaryDto {
  ordersToday: number;
  revenueTodayPaise: number;
  byStatus: Partial<Record<import('./enums').OrderStatus, number>>;
  /** Orders still in progress right now, whatever day they were placed. */
  liveOrders: number;
  /** Same figures for yesterday (IST), so today's numbers have context. */
  yesterday: { orders: number; revenuePaise: number; delivered: number; cancelled: number };
}

/** GET /admin/dashboard — everything the admin Dashboard shows, in one request. */
export interface AdminDashboardDto {
  kpis: {
    ordersToday: number;
    ordersYesterday: number;
    revenueTodayPaise: number;
    revenueYesterdayPaise: number;
    liveOrders: number;
    newOrders: number;
    cookingOrders: number;
    deliveredToday: number;
    /** Average minutes from placed to delivered, today (null when nothing delivered yet). */
    avgDeliveryMinutes: number | null;
    ridersOnline: number;
    ridersTotal: number;
    ridersBusy: number;
  };
  /** Last 7 IST days, oldest first; revenue counts paid orders only. */
  trend: { date: string; orders: number; revenuePaise: number }[];
  /** Today's orders grouped for the donut. */
  byStatus: { delivered: number; inKitchen: number; onTheRoad: number; cancelled: number };
  /** Share of items sold in the last 30 days, by category. */
  topCategories: { name: string; quantity: number; percent: number }[];
  /** Last 7 days. */
  bestSellers: { productId: string; name: string; imageUrl?: string; quantity: number; pricePaise: number }[];
  newCustomers: { id: string; name: string; createdAt: string; orders: number; spentPaise: number }[];
  partners: { online: number; busy: number; offline: number };
  recentOrders: { id: string; orderNumber: string; customerName: string; items: number; totalPaise: number; status: import('./enums').OrderStatus; createdAt: string }[];
  activity: { id: string; action: string; entityType: string; to?: string; actorName?: string; createdAt: string }[];
  payments: { onlinePaise: number; codPaise: number; cashWithRidersPaise: number; refundsPending: number; refundsPendingPaise: number };
}

/** What a client needs to open Razorpay Checkout for an unpaid online order. */
export interface RazorpayCheckoutDto {
  keyId: string;
  providerOrderId: string;
  amountPaise: number;
  currency: 'INR';
  orderNumber: string;
  prefill: { name: string; email: string; contact: string };
}

// ---------- Specials ----------
export interface SpecialDto {
  id: string;
  product: ProductDto;
  discountPercent: number;
  label?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  sortOrder: number;
  /** Price after the discount, for the product's default portion. */
  specialPricePaise: number;
  /** True when active, inside its date window and (if any) its section is switched on. */
  isLive: boolean;
  /** Offer section; absent = Today's specials. */
  sectionId?: string;
}

export interface SpecialInput {
  productId: string;
  discountPercent: number;
  /** null clears it. */
  label?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  /** Offer section; null/absent = Today's specials. */
  sectionId?: string | null;
}

// ---------- Offer sections (admin-made Home rows like Today's specials) ----------
/** Home carousel banner (admin-managed). */
export interface BannerDto {
  id: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  buttonText?: string;
  linkType: 'none' | 'category' | 'product' | 'offer' | 'url';
  /** category/product slug, offer section id, or a URL / in-app path. */
  linkValue?: string;
  image: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  /** Switched on and inside its date window right now. */
  isLive: boolean;
  sortOrder: number;
}

export interface OfferSectionDto {
  id: string;
  /** DEALS = admin-picked discounted dishes; POPULAR = automatic best sellers from /products/popular. */
  kind: 'DEALS' | 'POPULAR' | 'CATEGORY';
  /** CATEGORY rows only: the category shown (its dishes come from /products?categorySlug=). */
  categoryId?: string;
  categorySlug?: string;
  title: string;
  subtitle?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  /** Switched on and inside its start/end window right now. */
  isLive: boolean;
  sortOrder: number;
  /** Admin list only: deals in the section. */
  specialCount?: number;
}

/** Create/update body for /admin/banners (null clears an optional field). */
export interface BannerInput {
  title: string;
  highlight?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  linkType: BannerDto['linkType'];
  linkValue?: string | null;
  image: string;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface OfferSectionInput {
  title: string;
  /** null clears it. */
  subtitle?: string | null;
  /** null clears it. */
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

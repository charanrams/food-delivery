import type { AddressDto, AdminSummaryDto, CategoryDto, DeliveryPartnerDto, EligiblePartnerDto, OfferSectionDto, OfferSectionInput, OrderDto, OrderStatus, PaymentMethod, PaymentStatus, ProductDto, SpecialDto, SpecialInput, UploadSignatureDto } from '@a3/contracts';
import { api, ApiError, qs } from '@/lib/api';

export const adminKeys = {
  categories: ['admin', 'categories'] as const,
  products: (params: object) => ['admin', 'products', params] as const,
  specials: ['admin', 'specials'] as const,
  offerSections: ['admin', 'offer-sections'] as const,
  product: (id: string) => ['admin', 'product', id] as const,
  partners: (search: string) => ['admin', 'partners', search] as const,
  summary: ['admin', 'summary'] as const,
  orders: (params: object) => ['admin', 'orders', params] as const,
  order: (id: string) => ['admin', 'order', id] as const,
  eligible: ['admin', 'eligible-partners'] as const,
  customers: (search: string) => ['admin', 'customers', search] as const,
  payments: (status: string) => ['admin', 'payments', status] as const,
  reports: (days: number) => ['admin', 'reports', days] as const,
  settings: ['admin', 'settings'] as const,
};

export const adminApi = {
  categories: () => api.get<CategoryDto[]>('/admin/categories'),
  createCategory: (body: Partial<CategoryDto>) => api.post<CategoryDto>('/admin/categories', body),
  updateCategory: (id: string, body: Partial<CategoryDto>) => api.patch<CategoryDto>(`/admin/categories/${id}`, body),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),

  specials: () => api.get<SpecialDto[]>('/admin/specials'),
  createSpecial: (b: SpecialInput) => api.post<SpecialDto>('/admin/specials', b),
  updateSpecial: (id: string, b: Partial<SpecialInput>) => api.patch<SpecialDto>(`/admin/specials/${id}`, b),
  deleteSpecial: (id: string) => api.delete<{ id: string }>(`/admin/specials/${id}`),
  offerSections: () => api.get<OfferSectionDto[]>('/admin/offer-sections'),
  createOfferSection: (b: OfferSectionInput) => api.post<OfferSectionDto>('/admin/offer-sections', b),
  updateOfferSection: (id: string, b: Partial<OfferSectionInput>) => api.patch<OfferSectionDto>(`/admin/offer-sections/${id}`, b),
  reorderOfferSections: (ids: string[]) => api.post<OfferSectionDto[]>('/admin/offer-sections/reorder', { ids }),
  deleteOfferSection: (id: string) => api.delete<{ id: string }>(`/admin/offer-sections/${id}`),
  products: (p: { search?: string; categoryId?: string; page?: number }) => api.page<ProductDto>(`/admin/products${qs({ limit: 50, ...p })}`),
  product: (id: string) => api.get<ProductDto>(`/admin/products/${id}`),
  createProduct: (body: ProductInput) => api.post<ProductDto>('/admin/products', body),
  updateProduct: (id: string, body: Partial<ProductInput>) => api.patch<ProductDto>(`/admin/products/${id}`, body),
  setAvailability: (id: string, isAvailable: boolean) => api.patch<ProductDto>(`/admin/products/${id}/availability`, { isAvailable }),
  archive: (id: string) => api.delete<ProductDto>(`/admin/products/${id}`),
  restore: (id: string) => api.post<ProductDto>(`/admin/products/${id}/restore`),

  partners: (search: string) => api.get<DeliveryPartnerDto[]>(`/admin/delivery-partners${qs({ search })}`),
  createPartner: (body: PartnerInput) => api.post<{ partner: DeliveryPartnerDto; emailSent: boolean }>('/admin/delivery-partners', body),
  updatePartner: (id: string, body: Partial<PartnerInput> & { status?: 'ACTIVE' | 'SUSPENDED' }) => api.patch<DeliveryPartnerDto>(`/admin/delivery-partners/${id}`, body),
  resendPartnerCredentials: (id: string) => api.post<{ emailSent: boolean }>(`/admin/delivery-partners/${id}/resend-credentials`),
  deletePartner: (id: string) => api.delete(`/admin/delivery-partners/${id}`),

  summary: () => api.get<AdminSummaryDto>('/admin/orders/summary'),
  orders: (p: { status?: OrderFilter; search?: string; page?: number }) => api.page<OrderDto>(`/admin/orders${qs({ limit: 50, ...p })}`),
  order: (id: string) => api.get<OrderDto>(`/admin/orders/${id}`),
  eligiblePartners: () => api.get<EligiblePartnerDto[]>('/admin/orders/eligible-partners'),
  orderAction: (id: string, action: OrderAction, body?: { reason?: string; partnerId?: string }) => api.post<OrderDto>(`/admin/orders/${id}/${action}`, body ?? {}),

  customers: (search: string) => api.get<AdminCustomer[]>(`/admin/customers${qs({ search })}`),
  customer: (id: string) => api.get<AdminCustomerDetail>(`/admin/customers/${id}`),
  setCustomerStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') => api.patch<{ id: string; status: string }>(`/admin/customers/${id}/status`, { status }),
  payments: (status?: PaymentStatus) => api.get<AdminPayment[]>(`/admin/payments${qs({ status })}`),
  reports: (days: number) => api.get<AdminReport>(`/admin/reports${qs({ days })}`),
  settings: () => api.get<KitchenSettings>('/admin/settings'),
  updateSettings: (body: Partial<Omit<KitchenSettings, 'freeDeliveryAbovePaise'>> & { freeDeliveryAbovePaise?: number | null }) => api.patch<KitchenSettings>('/admin/settings', body),
};

export type OrderFilter = 'ACTIVE' | OrderStatus;
export type OrderAction = 'accept' | 'reject' | 'prepare' | 'ready' | 'cancel' | 'assign' | 'unassign' | 'override-delivery';

export interface AdminCustomer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED' | string;
  joinedAt: string;
  orders: number;
  spentPaise: number;
  lastOrderAt?: string;
}

export interface AdminCustomerDetail extends AdminCustomer {
  delivered: number;
  cancelled: number;
  averageOrderPaise: number;
  firstOrderAt?: string;
  addresses: AddressDto[];
}

export interface AdminPayment {
  orderId: string;
  orderNumber: string;
  customer: string;
  method: PaymentMethod;
  status: PaymentStatus;
  orderStatus: OrderStatus;
  amountPaise: number;
  providerPaymentId?: string;
  createdAt: string;
  paidAt?: string;
  refundedAt?: string;
}

export interface AdminReport {
  days: number;
  orders: number;
  revenuePaise: number;
  averageOrderPaise: number;
  delivered: number;
  cancelled: number;
  daily: { date: string; orders: number; revenuePaise: number }[];
  topDishes: { name: string; quantity: number; revenuePaise: number }[];
}

export interface KitchenSettings {
  isAcceptingOrders: boolean;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise?: number;
  taxRateBps: number;
  serviceablePostalCodes: string[];
  kitchenHours: { day: number; open: string; close: string }[];
}

export interface PartnerInput {
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description?: string;
  images: string[];
  pricePaise: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  preparationTimeMinutes?: number;
  variants: { name: string; pricePaise: number; isAvailable?: boolean }[];
}

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Signed direct upload to Cloudinary — the API secret never reaches the browser. */
export async function uploadImage(file: File, folder: 'products' | 'categories'): Promise<string> {
  if (!TYPES.includes(file.type)) throw new ApiError(400, 'VALIDATION_ERROR', 'Use a JPG, PNG or WebP photo.');
  if (file.size > MAX_BYTES) throw new ApiError(400, 'VALIDATION_ERROR', 'Photos must be 5 MB or smaller.');

  const sig = await api.post<UploadSignatureDto & { allowedFormats: string[] }>('/admin/uploads/sign', { folder });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  form.append('allowed_formats', sig.allowedFormats.join(','));

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  const body = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message: string } } | null;
  if (!res.ok || !body?.secure_url) throw new ApiError(res.status, 'SERVICE_UNAVAILABLE', body?.error?.message ?? 'Upload failed. Please try again.');
  return body.secure_url;
}

/** "249" / "249.50" → 24950 paise. Returns null for anything that isn't a valid amount. */
export function rupeesToPaise(input: string): number | null {
  const m = /^\s*(\d{1,6})(?:\.(\d{1,2}))?\s*$/.exec(input);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '0').padEnd(2, '0'));
}

export const paiseToRupees = (p: number) => (p % 100 === 0 ? String(p / 100) : (p / 100).toFixed(2));

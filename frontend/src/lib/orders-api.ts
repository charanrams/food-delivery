import { queryOptions } from '@tanstack/react-query';
import type { AddressDto, CheckoutQuoteDto, CheckoutRequestDto, NotificationDto, OrderDto, RazorpayCheckoutDto } from '@a3/contracts';
import { api } from './api';

export const addressesQuery = queryOptions({
  queryKey: ['addresses'],
  queryFn: () => api.get<AddressDto[]>('/addresses'),
});

export const ordersQuery = queryOptions({
  queryKey: ['orders'],
  queryFn: async () => (await api.page<OrderDto>('/orders')).items,
});

/** Active orders poll every 10 s, like the apps. */
export const orderQuery = (id: string) =>
  queryOptions({
    queryKey: ['order', id],
    queryFn: () => api.get<OrderDto>(`/orders/${encodeURIComponent(id)}`),
    refetchInterval: (q) => (q.state.data && ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(q.state.data.status) ? false : 10_000),
  });

export const quoteQuery = (items: CheckoutRequestDto['items']) =>
  queryOptions({
    queryKey: ['quote', items],
    queryFn: () => api.post<CheckoutQuoteDto>('/orders/quote', { items }),
    enabled: items.length > 0,
  });

export const notificationsQuery = queryOptions({
  queryKey: ['notifications'],
  queryFn: () => api.get<{ items: NotificationDto[]; unread: number }>('/notifications'),
  refetchInterval: 30_000,
});

export type AddressInput = Omit<AddressDto, 'id' | 'isServiceable'>;

export const placeOrder = (body: CheckoutRequestDto, idempotencyKey: string) =>
  api.postWith<OrderDto>('/orders/checkout', body, { 'Idempotency-Key': idempotencyKey });
export const cancelOrder = (id: string, reason: string) => api.post<OrderDto>(`/orders/${id}/cancel`, { reason });
export const reopenPayment = (orderId: string) => api.post<RazorpayCheckoutDto>('/payments/razorpay/order', { orderId });

export const ACTIVE = (o: Pick<OrderDto, 'status'>) => !['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status);
export const addressLine = (a: Pick<AddressDto, 'line1' | 'line2' | 'city' | 'postalCode'>) => [a.line1, a.line2, a.city, a.postalCode].filter(Boolean).join(', ');

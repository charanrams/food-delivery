import type { RazorpayCheckoutDto } from '@a3/contracts';
import { api, ApiError } from './api';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', fn: (r: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Couldn’t reach Razorpay. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PayOutcome = { result: 'paid' } | { result: 'cancelled' | 'failed'; message: string };

/** Opens Razorpay Checkout; on success the server verifies the signature before we call it paid. */
export async function payWithRazorpay(orderId: string, c: RazorpayCheckoutDto): Promise<PayOutcome> {
  try {
    await loadScript();
  } catch (e) {
    return { result: 'failed', message: (e as Error).message };
  }
  return new Promise<PayOutcome>((resolve) => {
    let settled = false;
    const done = (o: PayOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };
    const rp = new window.Razorpay!({
      key: c.keyId,
      amount: c.amountPaise,
      currency: c.currency,
      order_id: c.providerOrderId,
      name: 'A3 Kitchen',
      description: `Order ${c.orderNumber}`,
      image: '/logo.png',
      prefill: c.prefill,
      theme: { color: '#F58220' },
      handler: async (r: RazorpayResponse) => {
        try {
          await api.post('/payments/razorpay/verify', r);
          done({ result: 'paid' });
        } catch (e) {
          done({ result: 'failed', message: e instanceof ApiError ? e.message : 'We couldn’t confirm the payment yet.' });
        }
      },
      modal: {
        ondismiss: () => {
          void api.post('/payments/razorpay/failed', { orderId }).catch(() => undefined);
          done({ result: 'cancelled', message: 'You closed the payment window. No money was taken.' });
        },
      },
    });
    rp.on('payment.failed', (r) => {
      void api.post('/payments/razorpay/failed', { orderId }).catch(() => undefined);
      done({ result: 'failed', message: r.error?.description ?? 'The payment didn’t go through.' });
    });
    rp.open();
  });
}

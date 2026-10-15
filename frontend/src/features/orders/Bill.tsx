import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, SearchX } from 'lucide-react';
import { formatPaise, type OrderDto } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { orderQuery } from '@/lib/orders-api';
import { adminApi, adminKeys } from '@/features/admin/admin-api';
import { KITCHEN } from '@/lib/kitchen';

const PAYMENT_LABEL: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Payment pending',
  AUTHORIZED: 'Authorised',
  FAILED: 'Payment failed',
  REFUND_PENDING: 'Refund in progress',
  PARTIALLY_REFUNDED: 'Partly refunded',
  REFUNDED: 'Refunded',
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * The order bill: same layout for customers and the kitchen, on screen and on paper.
 * Printing hides everything but the bill (Tailwind `print:` variants), so "Save as PDF" gives a clean file.
 */
export function BillView({ o }: { o: OrderDto }) {
  const a = o.deliveryAddress;
  const gstRate = o.subtotalPaise > 0 ? Math.round((o.taxPaise / (o.subtotalPaise - o.discountPaise)) * 1000) / 10 : 0;
  const void_ = o.status === 'CANCELLED' || o.status === 'REJECTED';
  const rows: [string, number][] = [
    ['Item total', o.subtotalPaise],
    ...(o.discountPaise ? [['Discount', -o.discountPaise] as [string, number]] : []),
    ['Delivery fee', o.deliveryFeePaise],
    [`GST${gstRate ? ` (${gstRate}%)` : ''}`, o.taxPaise],
  ];

  return (
    <article className="relative mx-auto w-full max-w-[720px] overflow-hidden rounded-[24px] bg-surface shadow-[0_10px_40px_-16px_rgb(30_29_27/0.25)] ring-1 ring-line print:max-w-none print:rounded-none print:shadow-none print:ring-0">
      {/* Brand band */}
      <header className="flex items-center justify-between gap-4 bg-frame px-6 py-5 text-surface md:px-8 print:bg-frame print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" width={52} height={52} className="rounded-full bg-surface p-0.5" />
          <div>
            <p className="font-display text-2xl font-semibold leading-none">A3 Kitchen</p>
            <p className="mt-1 text-[13px] text-surface/90">Freshly Prepared. Delivered with Care.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-surface/85">Bill</p>
          <p className="tabular text-lg font-bold">{o.orderNumber}</p>
        </div>
      </header>

      <section aria-label="Kitchen details" className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 border-b border-line bg-background/60 px-6 py-3 text-xs text-muted md:px-8">
        <p>
          {KITCHEN.addressLines.join(', ')}
          <br />
          {KITCHEN.phone} · {KITCHEN.email}
        </p>
        <p className="tabular font-semibold text-ink">GSTIN {KITCHEN.gstin}</p>
      </section>

      {void_ && (
        <p className="border-b border-danger/20 bg-danger/10 px-6 py-3 text-center text-sm font-semibold text-danger md:px-8">
          This order was {o.status === 'REJECTED' ? 'rejected' : 'cancelled'}. Nothing is payable{o.paymentStatus === 'REFUNDED' || o.paymentStatus === 'REFUND_PENDING' ? ' and the payment is being refunded' : ''}.
        </p>
      )}

      {/* Meta */}
      <section className="grid gap-6 border-b border-dashed border-line px-6 py-6 sm:grid-cols-2 md:px-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Billed to</h2>
          <p className="mt-1.5 font-semibold">{a.recipientName}</p>
          <p className="text-sm text-muted">{[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}</p>
          <p className="text-sm text-muted">{a.city}, {a.state} {a.postalCode}</p>
          <p className="tabular text-sm text-muted">{a.phone.replace(/^\+91/, '+91 ')}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm sm:justify-self-end">
          <dt className="text-muted">Order date</dt>
          <dd className="tabular text-right font-medium">{longDate(o.timeline.placedAt)}</dd>
          {o.timeline.deliveredAt && (
            <>
              <dt className="text-muted">Delivered</dt>
              <dd className="tabular text-right font-medium">{longDate(o.timeline.deliveredAt)}</dd>
            </>
          )}
          <dt className="text-muted">Payment</dt>
          <dd className="text-right font-medium">{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'}</dd>
          <dt className="text-muted">Status</dt>
          <dd className="text-right font-semibold">{PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus}</dd>
        </dl>
      </section>

      {/* Items */}
      <section className="px-6 py-5 md:px-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="pb-2.5 font-semibold">Item</th>
              <th scope="col" className="pb-2.5 text-center font-semibold">Qty</th>
              <th scope="col" className="pb-2.5 text-right font-semibold">Rate</th>
              <th scope="col" className="pb-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {o.items.map((i, n) => (
              <tr key={n}>
                <td className="py-3 pr-3">
                  <p className="font-semibold">{i.productName}</p>
                  {i.variantName && <p className="text-xs text-muted">{i.variantName}</p>}
                </td>
                <td className="tabular py-3 text-center">{i.quantity}</td>
                <td className="tabular py-3 text-right text-muted">{formatPaise(i.unitPricePaise)}</td>
                <td className="tabular py-3 text-right font-semibold">{formatPaise(i.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totals */}
      <section className="flex justify-end border-t border-dashed border-line px-6 py-5 md:px-8">
        <dl className="w-full max-w-xs text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-1">
              <dt className="text-muted">{k}</dt>
              <dd className="tabular">{v === 0 && k === 'Delivery fee' ? 'Free' : v < 0 ? `- ${formatPaise(-v)}` : formatPaise(v)}</dd>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between rounded-xl bg-primary-soft px-3 py-2.5 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
            <dt className="font-bold">{void_ ? 'Order value' : o.paymentStatus === 'PAID' ? 'Total paid' : 'Total payable'}</dt>
            <dd className="tabular font-display text-xl font-semibold text-primary-strong">{formatPaise(o.totalPaise)}</dd>
          </div>
        </dl>
      </section>

      <footer className="border-t border-line bg-background/70 px-6 py-5 text-center md:px-8">
        <p className="font-display text-lg font-semibold">Thank you for ordering with A3 Kitchen</p>
        <p className="mt-1 text-xs text-muted">Prices include the item price shown on the menu. GST and delivery are charged as listed above. Questions about this bill? Contact the kitchen with your order number.</p>
      </footer>
    </article>
  );
}

function BillShell({ back, children }: { back: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 md:py-10 print:bg-surface print:p-0">
      <div className="mx-auto mb-5 flex max-w-[720px] items-center justify-between gap-3 print:hidden">
        <Link to={back.to} className="inline-flex min-h-10 items-center gap-1.5 rounded-full pr-3 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> {back.label}
        </Link>
        <Button size="sm" variant="secondary" icon={<Printer className="size-4" aria-hidden />} onClick={() => window.print()}>
          Print or save PDF
        </Button>
      </div>
      {children}
    </div>
  );
}

function BillState({ q }: { q: { isError: boolean; isPending: boolean; refetch: () => unknown; data?: OrderDto } }) {
  if (q.isError)
    return (
      <div className="mx-auto max-w-[720px] rounded-[24px] bg-surface ring-1 ring-line">
        <ErrorState onRetry={() => q.refetch()} />
      </div>
    );
  if (q.isPending) return <Skeleton className="mx-auto h-[36rem] max-w-[720px]" />;
  if (!q.data)
    return <EmptyState icon={<SearchX className="size-9" />} title="Bill not found" body="We couldn’t find this order." />;
  return <BillView o={q.data} />;
}

/** /orders/:orderId/bill (customer's own order). */
export function CustomerBillPage() {
  const { orderId = '' } = useParams();
  const q = useQuery(orderQuery(orderId));
  const [params] = useSearchParams();
  const download = params.get('download') === '1';
  const ready = !!q.data;
  useEffect(() => {
    // Opened from "Download bill": show the print dialog so the customer can save it as PDF.
    if (download && ready) window.setTimeout(() => window.print(), 300);
  }, [download, ready]);
  return (
    <BillShell back={{ to: `/orders/${orderId}`, label: 'Back to order' }}>
      <BillState q={q} />
    </BillShell>
  );
}

/** /admin/orders/:orderId/bill (any order). */
export function AdminBillPage() {
  const { orderId = '' } = useParams();
  const q = useQuery({ queryKey: adminKeys.order(orderId), queryFn: () => adminApi.order(orderId) });
  return (
    <BillShell back={{ to: `/admin/orders/${orderId}`, label: 'Back to order' }}>
      <BillState q={q} />
    </BillShell>
  );
}

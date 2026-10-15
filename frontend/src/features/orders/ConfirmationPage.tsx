import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock, MapPin, Wallet } from 'lucide-react';
import { formatPaise } from '@a3/contracts';
import { ButtonLink, ErrorState, Skeleton } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { addressLine, orderQuery } from '@/lib/orders-api';

/** W07 · Order placed (mockup screen 14) */
export function ConfirmationPage() {
  const { orderId = '' } = useParams();
  const order = useQuery(orderQuery(orderId));

  return (
    <PageFrame title="Order placed" back={false}>
      {order.isError ? (
        <ErrorState onRetry={() => order.refetch()} />
      ) : order.isPending ? (
        <Skeleton className="mx-auto h-96 max-w-xl" />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-4 text-center">
          <span className="grid size-24 place-items-center rounded-full bg-success/12 motion-safe:animate-[pop_420ms_cubic-bezier(0.16,1,0.3,1)]">
            <span className="grid size-16 place-items-center rounded-full bg-success text-surface">
              <Check className="size-9" strokeWidth={3} aria-hidden />
            </span>
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-[2rem]">Order placed!</h2>
            <p className="tabular font-semibold">{order.data.orderNumber}</p>
            <p className="text-muted">The kitchen is reviewing your order. We’ll update you as soon as it’s accepted.</p>
          </div>
          <dl className="flex w-full flex-col gap-4 rounded-[18px] bg-card p-5 text-left">
            {[
              [Clock, 'Estimated delivery', '35–40 min'],
              [
                Wallet,
                'Payment',
                order.data.paymentMethod === 'COD' ? `Cash on delivery · ${formatPaise(order.data.totalPaise)}` : order.data.paymentStatus === 'PAID' ? `Paid online · ${formatPaise(order.data.totalPaise)}` : 'Pending',
              ],
              [MapPin, 'Delivering to', addressLine(order.data.deliveryAddress)],
            ].map(([Icon, label, value]) => {
              const I = Icon as typeof Clock;
              return (
                <div key={label as string} className="flex items-start gap-3">
                  <I className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden />
                  <div>
                    <dt className="text-[13px] text-muted">{label as string}</dt>
                    <dd className="font-semibold">{value as string}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
          <div className="flex w-full flex-col gap-3">
            <ButtonLink to={`/orders/${order.data.id}`} className="w-full">
              Track your order
            </ButtonLink>
            <ButtonLink to="/" variant="secondary" className="w-full">
              Back to home
            </ButtonLink>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

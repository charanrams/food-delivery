import { formatPaise } from '@a3/contracts';
import type { CartTotals } from './CartContext';

export function TotalsRows({ totals, totalLabel = 'To pay' }: { totals: CartTotals; totalLabel?: string }) {
  const row = 'flex justify-between text-[15px]';
  return (
    <dl className="flex flex-col gap-3.5">
      <div className={row}>
        <dt>Item total</dt>
        <dd className="tabular font-medium">{formatPaise(totals.itemTotalPaise)}</dd>
      </div>
      {!!totals.discountPaise && (
        <div className={row}>
          <dt className="text-success">Today’s specials</dt>
          <dd className="tabular font-semibold text-success">− {formatPaise(totals.discountPaise)}</dd>
        </div>
      )}
      <div className={row}>
        <dt>Delivery fee</dt>
        <dd className={totals.deliveryFeePaise === 0 ? 'font-medium text-success' : 'tabular font-medium'}>
          {totals.deliveryFeePaise === 0 ? 'Free' : formatPaise(totals.deliveryFeePaise)}
        </dd>
      </div>
      <div className={row}>
        <dt>Taxes (GST 5%)</dt>
        <dd className="tabular font-medium">{formatPaise(totals.taxPaise)}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3.5 text-[17px] font-bold">
        <dt>{totalLabel}</dt>
        <dd className="tabular">{formatPaise(totals.totalPaise)}</dd>
      </div>
    </dl>
  );
}

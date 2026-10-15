import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChefHat, PackageCheck, UserPlus, X } from 'lucide-react';
import type { OrderDto } from '@a3/contracts';
import { Button } from '@/components/ui';
import { adminApi, adminKeys, type OrderAction } from './admin-api';
import { Field, errorText, inputCls } from './admin-ui';

/** The one forward step for each status — used for the quick button in queues. */
export const PRIMARY_ACTION: Partial<Record<OrderAction, { label: string; icon: typeof Check }>> = {
  accept: { label: 'Accept', icon: Check },
  prepare: { label: 'Start preparing', icon: ChefHat },
  ready: { label: 'Mark ready', icon: PackageCheck },
};

export function useOrderAction(
  onDone?: (o: OrderDto, action: OrderAction) => void,
  onError?: (msg: string) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: OrderAction;
      body?: { reason?: string; partnerId?: string };
    }) => adminApi.orderAction(id, action, body),
    onSuccess: (o, v) => {
      qc.setQueryData(adminKeys.order(o.id), o);
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void qc.invalidateQueries({ queryKey: adminKeys.summary });
      void qc.invalidateQueries({ queryKey: adminKeys.eligible });
      onDone?.(o, v.action);
    },
    onError: (e) => onError?.(errorText(e, 'That didn’t go through. Refresh and try again.')),
  });
}

type Pending = 'reject' | 'cancel' | 'unassign' | 'override-delivery' | 'assign' | null;
const REASON_COPY: Record<
  Exclude<Pending, 'assign' | null>,
  { title: string; label: string; placeholder: string; submit: string }
> = {
  reject: {
    title: 'Reject this order',
    label: 'Reason (the customer sees this)',
    placeholder: 'e.g. Biryani is sold out for today',
    submit: 'Reject order',
  },
  cancel: {
    title: 'Cancel this order',
    label: 'Reason (the customer sees this)',
    placeholder: 'e.g. Kitchen closing early',
    submit: 'Cancel order',
  },
  unassign: {
    title: 'Take the order back from the partner',
    label: 'Reason',
    placeholder: 'e.g. Partner’s bike broke down',
    submit: 'Unassign partner',
  },
  'override-delivery': {
    title: 'Mark delivered without the code',
    label: 'Why couldn’t the code be used?',
    placeholder: 'e.g. Customer’s phone was off, confirmed on call',
    submit: 'Mark delivered',
  },
};

/** Every admin action for one order, with inline reason / partner pickers (no modals). */
export function OrderActions({
  order,
  onMessage,
}: {
  order: OrderDto;
  onMessage: (tone: 'success' | 'danger', text: string) => void;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [error, setError] = useState<string>();
  const act = useOrderAction(
    (o, action) => {
      setPending(null);
      setReason('');
      setError(undefined);
      onMessage('success', DONE_COPY[action](o));
    },
    (msg) => (pending ? setError(msg) : onMessage('danger', msg)),
  );
  const partners = useQuery({
    queryKey: adminKeys.eligible,
    queryFn: adminApi.eligiblePartners,
    enabled: pending === 'assign',
  });
  const has = (a: OrderAction) => order.actions.includes(a);
  const busy = (a: OrderAction) => act.isPending && act.variables?.action === a;

  if (order.actions.length === 0) {
    return (
      <p className="text-sm text-muted">
        {order.status === 'DELIVERED'
          ? 'Delivered. Nothing left to do.'
          : order.status === 'PLACED'
            ? 'Waiting for the customer’s online payment.'
            : 'No kitchen actions at this stage.'}
      </p>
    );
  }

  if (pending === 'assign') {
    const list = partners.data ?? [];
    const chosen = partnerId || list.find((p) => p.suggested)?.id || '';
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (!chosen) return setError('Choose a delivery partner.');
          act.mutate({ id: order.id, action: 'assign', body: { partnerId: chosen } });
        }}
      >
        <h3 className="font-semibold">Assign a delivery partner</h3>
        {partners.isPending ? (
          <p className="text-sm text-muted">Finding free partners…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">
            No partner is online and free right now. Ask one to go online in the delivery app, then
            try again.
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Online partners</legend>
            {list.map((p) => (
              <label
                key={p.id}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 ring-1 ring-line has-checked:bg-primary-soft has-checked:ring-primary"
              >
                <input
                  type="radio"
                  name="partner"
                  value={p.id}
                  checked={chosen === p.id}
                  onChange={() => setPartnerId(p.id)}
                  className="accent-primary-strong"
                />
                <span className="flex-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-muted">
                    {' '}
                    · {p.vehicleType ?? 'Vehicle not set'}
                  </span>
                </span>
                {p.suggested && (
                  <span className="text-xs font-semibold text-primary-strong">Suggested</span>
                )}
              </label>
            ))}
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy('assign')} disabled={!list.length}>
            Assign
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPending(null);
              setError(undefined);
            }}
          >
            Back
          </Button>
        </div>
      </form>
    );
  }

  if (pending) {
    const copy = REASON_COPY[pending];
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const r = reason.trim();
          if (r.length < (pending === 'override-delivery' ? 5 : 3))
            return setError('Add a short reason.');
          act.mutate({ id: order.id, action: pending, body: { reason: r } });
        }}
      >
        <h3 className="font-semibold">{copy.title}</h3>
        <Field id="action-reason" label={copy.label} error={error}>
          <textarea
            id="action-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={copy.placeholder}
            aria-invalid={!!error}
            className={`${inputCls} h-auto py-2.5`}
            autoFocus
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant={
              pending === 'override-delivery' || pending === 'unassign' ? 'primary' : 'danger'
            }
            loading={act.isPending}
          >
            {copy.submit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPending(null);
              setError(undefined);
            }}
          >
            Back
          </Button>
        </div>
      </form>
    );
  }

  const primary = (['accept', 'prepare', 'ready'] as const).find(has);
  return (
    <div className="flex flex-wrap gap-2">
      {primary &&
        (() => {
          const { label, icon: Icon } = PRIMARY_ACTION[primary]!;
          return (
            <Button
              icon={<Icon className="size-4" />}
              loading={busy(primary)}
              onClick={() => act.mutate({ id: order.id, action: primary })}
            >
              {label}
            </Button>
          );
        })()}
      {has('assign') && (
        <Button icon={<UserPlus className="size-4" />} onClick={() => setPending('assign')}>
          Assign partner
        </Button>
      )}
      {has('override-delivery') && (
        <Button variant="secondary" onClick={() => setPending('override-delivery')}>
          Mark delivered…
        </Button>
      )}
      {has('unassign') && (
        <Button variant="secondary" onClick={() => setPending('unassign')}>
          Unassign partner…
        </Button>
      )}
      {has('reject') && (
        <Button
          variant="secondary"
          icon={<X className="size-4" />}
          onClick={() => setPending('reject')}
        >
          Reject…
        </Button>
      )}
      {has('cancel') && (
        <Button variant="ghost" onClick={() => setPending('cancel')}>
          Cancel order…
        </Button>
      )}
    </div>
  );
}

const DONE_COPY: Record<OrderAction, (o: OrderDto) => string> = {
  accept: (o) => `${o.orderNumber} accepted. The customer has been told.`,
  reject: (o) => `${o.orderNumber} rejected.`,
  prepare: (o) => `${o.orderNumber} is being prepared.`,
  ready: (o) => `${o.orderNumber} is ready for pickup. Assign a partner next.`,
  cancel: (o) => `${o.orderNumber} cancelled.`,
  assign: (o) => `${o.partner?.name ?? 'Partner'} is on ${o.orderNumber}.`,
  unassign: (o) => `${o.orderNumber} is back to ready for pickup.`,
  'override-delivery': (o) => `${o.orderNumber} marked delivered.`,
};

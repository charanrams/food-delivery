import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, ErrorState, Skeleton, Toggle, cx } from '@/components/ui';
import {
  adminApi,
  adminKeys,
  paiseToRupees,
  rupeesToPaise,
  type KitchenSettings,
} from './admin-api';
import { Field, NoticeBar, PageHeader, errorText, inputCls, type Notice } from './admin-ui';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Admin · Settings — kitchen hours, delivery fee, tax and delivery PIN codes (all used by checkout). */
export function AdminSettingsPage() {
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[{ label: 'Business' }, { label: 'Settings' }]}
        title="Settings"
        description="These apply to every new order the moment you save."
      />
      {settings.isError ? (
        <Card>
          <ErrorState onRetry={() => settings.refetch()} />
        </Card>
      ) : !settings.data ? (
        <Skeleton className="h-[36rem]" />
      ) : (
        <SettingsForm initial={settings.data} />
      )}
    </div>
  );
}

type Hours = Record<number, { open: boolean; from: string; to: string }>;

function SettingsForm({ initial }: { initial: KitchenSettings }) {
  const qc = useQueryClient();
  const [accepting, setAccepting] = useState(initial.isAcceptingOrders);
  const [fee, setFee] = useState(paiseToRupees(initial.deliveryFeePaise));
  const [freeAbove, setFreeAbove] = useState(
    initial.freeDeliveryAbovePaise ? paiseToRupees(initial.freeDeliveryAbovePaise) : '',
  );
  const [tax, setTax] = useState(String(initial.taxRateBps / 100));
  const [pins, setPins] = useState(initial.serviceablePostalCodes.join(', '));
  const [hours, setHours] = useState<Hours>(() =>
    Object.fromEntries(
      DAYS.map((_, d) => {
        const h = initial.kitchenHours.find((x) => x.day === d);
        return [d, { open: !!h, from: h?.open ?? '11:00', to: h?.close ?? '22:30' }];
      }),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>();

  const save = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: (s) => {
      qc.setQueryData(adminKeys.settings, s);
      setNotice({ tone: 'success', text: 'Settings saved.' });
    },
    onError: (e) =>
      setNotice({ tone: 'danger', text: errorText(e, 'Could not save. Please try again.') }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const feeP = rupeesToPaise(fee || '0');
    if (feeP === null) next.fee = 'Enter an amount like 30 or 29.50.';
    const freeP = freeAbove.trim() ? rupeesToPaise(freeAbove) : null;
    if (freeAbove.trim() && freeP === null)
      next.freeAbove = 'Enter an amount, or leave empty for no free delivery.';
    const taxN = Number(tax);
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(tax.trim()) || taxN > 50)
      next.tax = 'Enter a percentage between 0 and 50.';
    const pinList = [...new Set(pins.split(/[\s,]+/).filter(Boolean))];
    const bad = pinList.find((p) => !/^\d{6}$/.test(p));
    if (bad) next.pins = `“${bad}” isn’t a 6-digit PIN code.`;
    const kitchenHours = Object.entries(hours)
      .filter(([, h]) => h.open)
      .map(([d, h]) => ({ day: Number(d), open: h.from, close: h.to }));
    if (kitchenHours.some((h) => h.open >= h.close))
      next.hours = 'Closing time must be after opening time.';
    setErrors(next);
    setNotice(undefined);
    if (Object.keys(next).length) return;
    save.mutate({
      isAcceptingOrders: accepting,
      deliveryFeePaise: feeP!,
      freeDeliveryAbovePaise: freeP,
      taxRateBps: Math.round(taxN * 100),
      serviceablePostalCodes: pinList,
      kitchenHours,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Section
        title="Orders"
        description="Pause when the kitchen is overloaded. Customers can still browse the menu."
      >
        <div className="flex min-h-14 items-center justify-between gap-4 rounded-lg px-4 ring-1 ring-line">
          <span className="font-medium" id="accepting-label">
            {accepting ? 'Taking new orders' : 'New orders paused'}
          </span>
          <Toggle checked={accepting} label="Taking new orders" onChange={setAccepting} />
        </div>
      </Section>

      <Section title="Delivery & tax" description="Charged on every order at checkout.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="fee" label="Delivery fee (₹)" error={errors.fee}>
            <input
              id="fee"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              aria-invalid={!!errors.fee}
              className={cx(inputCls, 'tabular')}
            />
          </Field>
          <Field
            id="freeAbove"
            label="Free delivery above (₹)"
            hint="Leave empty to always charge."
            error={errors.freeAbove}
          >
            <input
              id="freeAbove"
              inputMode="decimal"
              value={freeAbove}
              onChange={(e) => setFreeAbove(e.target.value)}
              placeholder="No free delivery"
              aria-invalid={!!errors.freeAbove}
              className={cx(inputCls, 'tabular')}
            />
          </Field>
          <Field id="tax" label="GST (%)" error={errors.tax}>
            <input
              id="tax"
              inputMode="decimal"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              aria-invalid={!!errors.tax}
              className={cx(inputCls, 'tabular')}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Delivery area"
        description="Only addresses in these PIN codes can order. Leave empty to deliver everywhere."
      >
        <Field
          id="pins"
          label="PIN codes"
          hint="Separate with commas or spaces."
          error={errors.pins}
        >
          <textarea
            id="pins"
            rows={3}
            value={pins}
            onChange={(e) => setPins(e.target.value)}
            placeholder="500081, 500032, 500084"
            aria-invalid={!!errors.pins}
            className={cx(inputCls, 'tabular h-auto py-2.5')}
          />
        </Field>
      </Section>

      <Section
        title="Kitchen hours"
        description="Shown to customers. Days left unticked are closed."
      >
        <div className="divide-y divide-line rounded-lg ring-1 ring-line">
          {DAYS.map((name, d) => {
            const h = hours[d]!;
            const upd = (patch: Partial<typeof h>) =>
              setHours({ ...hours, [d]: { ...h, ...patch } });
            return (
              <div
                key={name}
                className="grid grid-cols-[8rem_1fr] items-center gap-3 px-4 py-2.5 sm:grid-cols-[10rem_1fr]"
              >
                <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={h.open}
                    onChange={(e) => upd({ open: e.target.checked })}
                    className="size-4 accent-primary-strong"
                  />
                  {name}
                </label>
                {h.open ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="time"
                      aria-label={`${name} opens`}
                      value={h.from}
                      onChange={(e) => upd({ from: e.target.value })}
                      className={cx(inputCls, 'tabular h-10 w-32')}
                    />
                    <span className="text-muted">to</span>
                    <input
                      type="time"
                      aria-label={`${name} closes`}
                      value={h.to}
                      onChange={(e) => upd({ to: e.target.value })}
                      className={cx(inputCls, 'tabular h-10 w-32')}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted">Closed</span>
                )}
              </div>
            );
          })}
        </div>
        {errors.hours && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.hours}
          </p>
        )}
      </Section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[20px] bg-surface px-5 py-4 shadow-[0_10px_30px_-12px_rgb(122_59_16/0.35)] ring-1 ring-line/70 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <NoticeBar notice={notice} />
        </div>
        <Button type="submit" loading={save.isPending} className="md:min-w-40">
          Save settings
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card as="section" className="grid gap-5 p-5 md:grid-cols-[16rem_1fr] md:gap-8 md:p-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </Card>
  );
}

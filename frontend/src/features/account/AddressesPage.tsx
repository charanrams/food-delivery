import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, Map as MapIcon, MapPin, MapPinCheck, MapPinPlus, Pencil, Trash2 } from 'lucide-react';
import { LocationPicker } from './LocationPicker';
import type { AddressDto, PlaceDto } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, cx } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { useAuth } from '@/auth/AuthContext';
import { api, ApiError } from '@/lib/api';
import { addressesQuery, addressLine, type AddressInput } from '@/lib/orders-api';

const LABELS: AddressDto['label'][] = ['HOME', 'WORK', 'OTHER'];
const labelText = (l: AddressDto['label']) => l[0] + l.slice(1).toLowerCase();

/** Add / edit form. Shared by the Addresses page and Checkout. */
export function AddressForm({ existing, onDone, onCancel }: { existing?: AddressDto; onDone: (a: AddressDto) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState<AddressInput>({
    label: existing?.label ?? 'HOME',
    recipientName: existing?.recipientName ?? user?.name ?? '',
    phone: (existing?.phone ?? user?.phone ?? '').replace(/^\+91/, ''),
    line1: existing?.line1 ?? '',
    line2: existing?.line2 ?? '',
    landmark: existing?.landmark ?? '',
    city: existing?.city ?? 'Hyderabad',
    state: existing?.state ?? 'Telangana',
    postalCode: existing?.postalCode ?? '',
    isDefault: existing?.isDefault ?? false,
    ...(existing?.lat !== undefined && existing.lng !== undefined && { lat: existing.lat, lng: existing.lng }),
  });
  // New address: start on the map (same flow as the app), then fill in the details.
  const [mapOpen, setMapOpen] = useState(!existing);
  const [pinLabel, setPinLabel] = useState<string>();
  const applyPlace = (p: PlaceDto) => {
    setPinLabel([p.title, p.subtitle].filter(Boolean).join(', '));
    setF((x) => ({
      ...x,
      lat: p.lat,
      lng: p.lng,
      // Never overwrite the flat/house number the customer typed.
      line2: x.line2?.trim() && existing ? x.line2 : [...new Set([p.line1, p.line2].filter(Boolean))].join(', '),
      city: p.city ?? x.city,
      state: p.state ?? x.state,
      postalCode: p.postalCode ?? x.postalCode,
    }));
    setMapOpen(false);
  };
  const pinned = f.lat !== undefined && f.lng !== undefined;
  const set = <K extends keyof AddressInput>(k: K, v: AddressInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, line2: f.line2 || undefined, landmark: f.landmark || undefined };
      return existing ? api.patch<AddressDto>(`/addresses/${existing.id}`, body) : api.post<AddressDto>('/addresses', body);
    },
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: addressesQuery.queryKey });
      onDone(a);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  const field = 'h-12 w-full rounded-[12px] bg-card px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-ink';
  const input = (k: 'recipientName' | 'phone' | 'line1' | 'line2' | 'landmark' | 'city' | 'state' | 'postalCode', label: string, extra: Record<string, unknown> = {}) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input className={field} value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...extra} />
    </label>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[20px] bg-surface">
      {mapOpen && <LocationPicker initial={pinned ? { lat: f.lat!, lng: f.lng! } : undefined} onPick={applyPlace} onClose={() => setMapOpen(false)} />}
      <button type="button" onClick={() => setMapOpen(true)} className="flex items-center gap-3 rounded-[16px] bg-card p-3 text-left hover:ring-1 hover:ring-primary">
        <span className={cx('grid size-12 shrink-0 place-items-center rounded-xl text-primary-strong', pinned ? 'bg-primary-soft' : 'bg-surface')}>
          {pinned ? <MapPinCheck className="size-6" aria-hidden /> : <MapIcon className="size-6" aria-hidden />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">{pinned ? 'Pinned on map' : 'Set location on map'}</span>
          <span className="line-clamp-2 text-[13px] text-muted">{pinLabel ?? (pinned ? 'Location pinned on the map' : 'Helps the rider find your door')}</span>
        </span>
        <span className="text-sm font-bold text-primary-strong">{pinned ? 'Change' : 'Open map'}</span>
      </button>
      <div role="radiogroup" aria-label="Address type" className="flex gap-2">
        {LABELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={f.label === l}
            onClick={() => set('label', l)}
            className={cx('min-h-10 rounded-full px-4 text-sm font-semibold', f.label === l ? 'bg-ink text-surface' : 'bg-card hover:bg-primary-soft')}
          >
            {labelText(l)}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {input('recipientName', 'Name', { required: true, autoComplete: 'name' })}
        {input('phone', 'Mobile number', { required: true, inputMode: 'numeric', pattern: '[6-9][0-9]{9}', title: '10-digit Indian mobile number', autoComplete: 'tel-national' })}
        <div className="md:col-span-2">{input('line1', 'House / flat, street', { required: true, autoComplete: 'address-line1' })}</div>
        {input('line2', 'Area (optional)', { autoComplete: 'address-line2' })}
        {input('landmark', 'Landmark (optional)')}
        {input('city', 'City', { required: true, autoComplete: 'address-level2' })}
        {input('postalCode', 'PIN code', { required: true, inputMode: 'numeric', pattern: '[1-9][0-9]{5}', title: '6-digit PIN code', autoComplete: 'postal-code' })}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-[15px]">
        <input type="checkbox" checked={f.isDefault} onChange={(e) => set('isDefault', e.target.checked)} className="size-5 accent-primary-strong" />
        Make this my default address
      </label>
      {save.isError && (
        <p role="alert" className="text-sm font-medium text-danger">
          {save.error instanceof ApiError ? save.error.message : 'Couldn’t save the address.'}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" loading={save.isPending} className="flex-1">
          {existing ? 'Save changes' : 'Save address'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddressCard({ a, actions, selected }: { a: AddressDto; actions?: React.ReactNode; selected?: boolean }) {
  const Icon = a.label === 'HOME' ? Home : MapPin;
  return (
    <div className={cx('flex items-start gap-3.5 rounded-[18px] bg-card p-4', selected && 'ring-2 ring-primary')}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-primary-strong">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-bold">
          {labelText(a.label)}
          {a.isDefault && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-strong">Default</span>}
          {!a.isServiceable && <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[11px] font-bold text-danger">Outside delivery area</span>}
        </span>
        <span className="text-sm">{addressLine(a)}</span>
        <span className="text-[13px] text-muted">
          {a.recipientName} · {a.phone}
        </span>
      </div>
      {actions}
    </div>
  );
}

/** Mockup screen 12 · Saved addresses */
export function AddressesPage() {
  const qc = useQueryClient();
  const addresses = useQuery(addressesQuery);
  const [editing, setEditing] = useState<AddressDto | 'new' | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: addressesQuery.queryKey }),
  });

  return (
    <PageFrame
      title={editing ? (editing === 'new' ? 'Add address' : 'Edit address') : 'My addresses'}
      bottom={
        !editing && (
          <Button className="w-full md:w-auto" icon={<MapPinPlus className="size-5" />} onClick={() => setEditing('new')}>
            Add new address
          </Button>
        )
      }
    >
      {editing ? (
        <div className="max-w-2xl">
          <AddressForm existing={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </div>
      ) : addresses.isError ? (
        <ErrorState onRetry={() => addresses.refetch()} />
      ) : addresses.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : addresses.data.length === 0 ? (
        <EmptyState icon={<MapPin className="size-9" />} title="No saved addresses" body="Add where you’d like your food delivered." />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {addresses.data.map((a) => (
            <li key={a.id}>
              <AddressCard
                a={a}
                actions={
                  <div className="flex">
                    <button onClick={() => setEditing(a)} aria-label={`Edit ${labelText(a.label)} address`} className="grid size-10 place-items-center rounded-full hover:bg-surface">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      onClick={() => window.confirm('Delete this address?') && remove.mutate(a.id)}
                      aria-label={`Delete ${labelText(a.label)} address`}
                      className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {remove.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Couldn’t delete the address. Try again.
        </p>
      )}
    </PageFrame>
  );
}

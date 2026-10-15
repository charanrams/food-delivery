import { Link } from 'react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  KeyRound,
  Pencil,
  Plus,
  Radio,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import type { DeliveryPartnerDto } from '@a3/contracts';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton, cx } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { Avatar, PageHeader, RowMenu, StatCard, StatGrid, tdCls, thCls } from './admin-ui';
import { adminApi, adminKeys, type PartnerInput } from './admin-api';

const EMPTY: PartnerInput = { name: '', email: '', phone: '', vehicleType: '', vehicleNumber: '' };
const VEHICLES = ['Bike', 'Scooter', 'Bicycle', 'E-bike'];
const input =
  'h-11 w-full rounded-xl bg-surface px-3 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-primary aria-[invalid=true]:ring-danger';
const iconBtn =
  'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40';
const message = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Could not save. Please try again.';
const localPhone = (p: string) => p.replace(/^\+91/, '');

type Notice = { tone: 'success' | 'danger'; text: string };

/** Admin · Delivery partners — create accounts (credentials are emailed), edit, suspend, reset login, delete. */
export function AdminDeliveryPartnersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [editing, setEditing] = useState<DeliveryPartnerDto | 'new' | null>(null);
  const [notice, setNotice] = useState<Notice>();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const partners = useQuery({
    queryKey: adminKeys.partners(debounced),
    queryFn: () => adminApi.partners(debounced),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
  const fail = (e: unknown) => setNotice({ tone: 'danger', text: message(e) });

  const toggle = useMutation({
    mutationFn: (p: DeliveryPartnerDto) =>
      adminApi.updatePartner(p.id, { status: p.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }),
    onSuccess: (p) => {
      setNotice({
        tone: 'success',
        text:
          p.status === 'ACTIVE'
            ? `${p.name} can log in again.`
            : `${p.name} is suspended and has been signed out.`,
      });
      refresh();
    },
    onError: fail,
  });
  const resend = useMutation({
    mutationFn: (p: DeliveryPartnerDto) => adminApi.resendPartnerCredentials(p.id).then(() => p),
    onSuccess: (p) =>
      setNotice({ tone: 'success', text: `New login details emailed to ${p.email}.` }),
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (p: DeliveryPartnerDto) => adminApi.deletePartner(p.id).then(() => p),
    onSuccess: (p) => {
      setNotice({ tone: 'success', text: `${p.name} was deleted.` });
      refresh();
    },
    onError: fail,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Delivery partners"
        description="New partners get their login details by email."
        actions={
          editing === null && (
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setEditing('new');
                setNotice(undefined);
              }}
            >
              Add partner
            </Button>
          )
        }
      />

      {!debounced && partners.data && (
        <StatGrid>
          <StatCard
            label="Partners"
            value={String(partners.data.length)}
            icon={<Users className="size-[18px]" />}
            hint="On your delivery team"
          />
          <StatCard
            label="Online now"
            value={String(
              partners.data.filter((p) => p.availability === 'ONLINE' && p.status === 'ACTIVE')
                .length,
            )}
            tone="green"
            icon={<Radio className="size-[18px]" />}
            hint="Can take a delivery"
          />
          <StatCard
            label="Offline"
            value={String(
              partners.data.filter((p) => p.availability !== 'ONLINE' && p.status === 'ACTIVE')
                .length,
            )}
            tone="blue"
            icon={<Bike className="size-[18px]" />}
            hint="Active but not working now"
          />
          <StatCard
            label="Suspended"
            value={String(partners.data.filter((p) => p.status !== 'ACTIVE').length)}
            tone="pink"
            icon={<UserX className="size-[18px]" />}
            hint="Can't log in"
          />
        </StatGrid>
      )}

      {editing !== null && (
        <PartnerForm
          key={editing === 'new' ? 'new' : editing.id}
          partner={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={(text, tone = 'success') => {
            setEditing(null);
            setNotice({ tone, text });
            refresh();
          }}
        />
      )}

      {notice && (
        <p
          role={notice.tone === 'danger' ? 'alert' : 'status'}
          className={cx(
            'rounded-lg px-4 py-3 text-sm',
            notice.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="relative max-w-sm">
        <label htmlFor="partner-search" className="sr-only">
          Search partners
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id="partner-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or mobile"
          className={cx(input, 'pl-9')}
        />
      </div>

      {partners.isError ? (
        <ErrorState onRetry={() => partners.refetch()} />
      ) : partners.isPending ? (
        <Skeleton className="h-72" />
      ) : partners.data.length === 0 ? (
        <EmptyState
          icon={<Bike className="size-9" />}
          title={debounced ? 'No partners match' : 'No delivery partners yet'}
          body={
            debounced
              ? 'Try a different name, email or mobile number.'
              : 'Add your first partner. They’ll get an email with their login details.'
          }
        />
      ) : (
        <Card className="overflow-x-auto rounded-[20px] p-3 ring-line/70">
          <table className="w-full border-separate border-spacing-0 min-w-[720px] text-left text-sm">
            <thead className="text-left">
              <tr>
                <th scope="col" className={thCls}>
                  Partner
                </th>
                <th scope="col" className={thCls}>
                  Mobile
                </th>
                <th scope="col" className={thCls}>
                  Vehicle
                </th>
                <th scope="col" className={thCls}>
                  Status
                </th>
                <th scope="col" className={cx(thCls, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-line/70 [&_tr:first-child_td]:border-t-0">
              {partners.data.map((p) => (
                <tr
                  key={p.id}
                  className={cx(
                    'relative transition-colors hover:bg-panel/60 [&_a[href^=tel]]:relative [&_a[href^=tel]]:z-10 [&_td:last-child]:relative [&_td:last-child]:z-10',
                    p.status !== 'ACTIVE' && 'text-muted',
                  )}
                >
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={p.name}
                        dot={
                          p.status !== 'ACTIVE'
                            ? 'blocked'
                            : p.availability === 'ONLINE'
                              ? 'online'
                              : 'offline'
                        }
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/admin/delivery-partners/${p.id}`}
                          className="block truncate font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary-strong"
                        >
                          {p.name}
                        </Link>
                        <p className="truncate text-[13px] text-muted">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>
                    <a
                      href={`tel:${p.phone}`}
                      className="tabular hover:text-primary-strong hover:underline"
                    >
                      {localPhone(p.phone)}
                    </a>
                  </td>
                  <td className={tdCls}>
                    {p.vehicleType || p.vehicleNumber ? (
                      <>
                        <p>{p.vehicleType ?? '-'}</p>
                        {p.vehicleNumber && (
                          <p className="tabular text-xs font-semibold tracking-wide text-muted">
                            {p.vehicleNumber}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    {p.status === 'ACTIVE' ? (
                      <Badge tone={p.availability === 'ONLINE' ? 'success' : 'neutral'}>
                        {p.availability === 'ONLINE' ? 'Online' : 'Offline'}
                      </Badge>
                    ) : (
                      <Badge tone="danger">Suspended</Badge>
                    )}
                  </td>
                  <td className={cx(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setNotice(undefined);
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold hover:bg-primary-soft hover:text-primary-strong"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="size-4" aria-hidden /> Edit
                      </button>
                      <RowMenu
                        label={`More actions for ${p.name}`}
                        items={[
                          {
                            label: 'Reset & email login',
                            icon: <KeyRound />,
                            disabled: resend.isPending && resend.variables?.id === p.id,
                            onSelect: () =>
                              window.confirm(
                                `Email ${p.name} a new password? Their current password stops working.`,
                              ) && resend.mutate(p),
                          },
                          p.status === 'ACTIVE'
                            ? {
                                label: 'Suspend partner',
                                icon: <UserX />,
                                onSelect: () => toggle.mutate(p),
                              }
                            : {
                                label: 'Reactivate partner',
                                icon: <UserCheck />,
                                onSelect: () => toggle.mutate(p),
                              },
                          {
                            label: 'Delete partner',
                            icon: <Trash2 />,
                            danger: true,
                            onSelect: () =>
                              window.confirm(`Delete ${p.name}? This can’t be undone.`) &&
                              remove.mutate(p),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function PartnerForm({
  partner,
  onCancel,
  onSaved,
}: {
  partner?: DeliveryPartnerDto;
  onCancel: () => void;
  onSaved: (text: string, tone?: 'success' | 'danger') => void;
}) {
  const [form, setForm] = useState<PartnerInput>(
    partner
      ? {
          name: partner.name,
          email: partner.email,
          phone: localPhone(partner.phone),
          vehicleType: partner.vehicleType ?? '',
          vehicleNumber: partner.vehicleNumber ?? '',
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PartnerInput | 'form', string>>>({});
  const set =
    (k: keyof PartnerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ''),
        vehicleType: form.vehicleType?.trim() || undefined,
        vehicleNumber: form.vehicleNumber?.trim() || undefined,
      };
      if (partner) {
        await adminApi.updatePartner(partner.id, body);
        return { text: `${body.name}’s details were updated.`, tone: 'success' as const };
      }
      const res = await adminApi.createPartner(body);
      return res.emailSent
        ? {
            text: `${body.name} was added. Login details were emailed to ${body.email}.`,
            tone: 'success' as const,
          }
        : {
            text: `${body.name} was added, but the email failed. Use “Reset & email login details” to try again.`,
            tone: 'danger' as const,
          };
    },
    onSuccess: (r) => onSaved(r.text, r.tone),
    onError: (e) => setErrors({ form: message(e) }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = 'Enter the partner’s name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Enter a valid email. Login details are sent here.';
    if (!/^(\+?91)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, '')))
      next.phone = 'Enter a valid 10-digit mobile number.';
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  };

  const field = (
    k: keyof PartnerInput,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`partner-${k}`} className="text-[13px] font-medium">
        {label}
      </label>
      <input
        id={`partner-${k}`}
        value={form[k] ?? ''}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `partner-${k}-error` : undefined}
        className={input}
        {...props}
      />
      {errors[k] && (
        <p id={`partner-${k}-error`} className="text-[13px] text-danger">
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <Card as="section" className="rounded-[20px] p-6 ring-line/70">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div>
          <h2 className="font-semibold">
            {partner ? `Edit ${partner.name}` : 'Add a delivery partner'}
          </h2>
          {!partner && (
            <p className="text-sm text-muted">
              We’ll create a password and email it to them with a link to log in.
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {field('name', 'Full name', { autoComplete: 'off' })}
          {field('email', 'Email', { type: 'email', autoComplete: 'off' })}
          {field('phone', 'Mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'off' })}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="partner-vehicleType" className="text-[13px] font-medium">
                Vehicle
              </label>
              <select
                id="partner-vehicleType"
                value={form.vehicleType ?? ''}
                onChange={set('vehicleType')}
                className={input}
              >
                <option value="">Not set</option>
                {[...new Set([...VEHICLES, ...(form.vehicleType ? [form.vehicleType] : [])])].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
            </div>
            {field('vehicleNumber', 'Vehicle number', {
              placeholder: 'TS09AB1234',
              className: cx(input, 'uppercase'),
            })}
          </div>
        </div>
        {errors.form && (
          <p role="alert" className="text-[13px] text-danger">
            {errors.form}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" loading={save.isPending}>
            {partner ? 'Save changes' : 'Create & email login'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

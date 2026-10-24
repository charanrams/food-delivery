import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, ErrorState, Skeleton, cx, Toggle } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { adminApi, adminKeys, paiseToRupees, rupeesToPaise, type ProductInput } from './admin-api';
import { ImageUploader } from './ImageUploader';
import { PageHeader, SectionCard } from './admin-ui';

interface FormState {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  prep: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  images: string[];
  variants: { name: string; price: string }[];
}

const EMPTY: FormState = {
  name: '',
  categoryId: '',
  description: '',
  price: '',
  prep: '',
  isVegetarian: true,
  isAvailable: true,
  images: [],
  variants: [],
};
const input =
  'h-11 w-full rounded-xl bg-surface px-3 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-primary aria-[invalid=true]:ring-danger';

/** Admin · Add / edit dish */
export function AdminProductFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'form', string>>>({});

  const categories = useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories });
  const existing = useQuery({
    queryKey: adminKeys.product(id ?? ''),
    queryFn: () => adminApi.product(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setForm({
      name: p.name,
      categoryId: p.categoryId,
      description: p.description,
      price: paiseToRupees(p.pricePaise),
      prep: p.preparationTimeMinutes != null ? String(p.preparationTimeMinutes) : '',
      isVegetarian: !!p.isVegetarian,
      isAvailable: p.isAvailable,
      images: p.images,
      variants: p.variants.map((v) => ({ name: v.name, price: paiseToRupees(v.pricePaise) })),
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (body: ProductInput) =>
      isNew ? adminApi.createProduct(body) : adminApi.updateProduct(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin/menu');
    },
    onError: (e) =>
      setErrors({ form: e instanceof ApiError ? e.message : 'Could not save. Please try again.' }),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const pricePaise = rupeesToPaise(form.price);
    if (form.name.trim().length < 2) next.name = 'Enter the dish name.';
    if (!form.categoryId) next.categoryId = 'Choose a category.';
    if (pricePaise === null) next.price = 'Enter a price like 249 or 249.50.';
    const prep = form.prep.trim() ? Number(form.prep) : undefined;
    if (prep !== undefined && (!Number.isInteger(prep) || prep < 0 || prep > 240))
      next.prep = 'Minutes between 0 and 240.';
    const variants = form.variants.map((v) => ({
      name: v.name.trim(),
      pricePaise: rupeesToPaise(v.price),
    }));
    if (variants.some((v) => !v.name || v.pricePaise === null))
      next.variants = 'Each portion needs a name and a valid price.';
    setErrors(next);
    if (Object.keys(next).length) return;

    save.mutate({
      name: form.name.trim(),
      categoryId: form.categoryId,
      description: form.description.trim(),
      pricePaise: pricePaise!,
      preparationTimeMinutes: prep,
      isVegetarian: form.isVegetarian,
      isAvailable: form.isAvailable,
      images: form.images,
      variants: variants.map((v) => ({ name: v.name, pricePaise: v.pricePaise! })),
    });
  };

  if (existing.isError) return <ErrorState onRetry={() => existing.refetch()} />;
  if (!isNew && existing.isPending) return <Skeleton className="h-[600px]" />;

  const fieldError = (k: keyof typeof errors) =>
    errors[k] && (
      <p id={`${k}-err`} className="text-[13px] text-danger">
        {errors[k]}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'Menu' }, { label: 'Menu items', to: '/admin/menu' }, { label: isNew ? 'Add dish' : 'Edit dish' }]}
        title={isNew ? 'Add a dish' : existing.data?.name ?? 'Edit dish'}
        description="Changes go live in the app and on the website as soon as you save."
        actions={
          <>
            <Link to="/admin/menu" className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold shadow-sm ring-1 ring-line hover:bg-primary-soft">
              <ArrowLeft className="size-4" aria-hidden /> Cancel
            </Link>
            <Button type="submit" loading={save.isPending}>
              {isNew ? 'Add dish' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
      <div className="flex min-w-0 flex-col gap-4">
      <SectionCard title="Basic details">
        <div className="grid gap-5 px-2 pb-2 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="name" className="text-[13px] font-medium">
              Dish name
            </label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby="name-err"
              className={input}
            />
            {fieldError('name')}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-[13px] font-medium">
              Category
            </label>
            <select
              id="category"
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              aria-invalid={!!errors.categoryId}
              className={input}
            >
              <option value="">Choose…</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? '' : ' (hidden)'}
                </option>
              ))}
            </select>
            {fieldError('categoryId')}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price" className="text-[13px] font-medium">
              Price (₹)
            </label>
            <input
              id="price"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              placeholder="249"
              aria-invalid={!!errors.price}
              className={`${input} tabular`}
            />
            {fieldError('price')}
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="desc" className="text-[13px] font-medium">
              Description
            </label>
            <textarea
              id="desc"
              rows={3}
              maxLength={600}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full rounded-xl bg-surface p-3 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prep" className="text-[13px] font-medium">
              Preparation time (minutes)
            </label>
            <input
              id="prep"
              inputMode="numeric"
              value={form.prep}
              onChange={(e) => set('prep', e.target.value.replace(/\D/g, ''))}
              aria-invalid={!!errors.prep}
              className={input}
            />
            {fieldError('prep')}
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-medium">Type</legend>
            <div className="flex gap-2">
              {[
                [true, 'Veg'],
                [false, 'Non-veg'],
              ].map(([v, l]) => (
                <label
                  key={String(v)}
                  className={cx(
                    'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl text-sm font-medium ring-1',
                    form.isVegetarian === v
                      ? 'bg-primary-soft text-primary-strong ring-primary'
                      : 'ring-line',
                  )}
                >
                  <input
                    type="radio"
                    name="veg"
                    className="sr-only"
                    checked={form.isVegetarian === v}
                    onChange={() => set('isVegetarian', v as boolean)}
                  />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

      </SectionCard>

      <SectionCard>
        <div className="flex flex-col gap-4 px-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Portions &amp; prices</h2>
            <p className="text-sm text-muted">
              Optional, e.g. Half / Full. Each portion has its own price.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={() => set('variants', [...form.variants, { name: '', price: '' }])}
            disabled={form.variants.length >= 8}
          >
            Add portion
          </Button>
        </div>
        {form.variants.map((v, i) => (
          <div key={i} className="flex items-center gap-3">
            <label className="sr-only" htmlFor={`vn-${i}`}>
              Portion name
            </label>
            <input
              id={`vn-${i}`}
              value={v.name}
              placeholder="Portion name"
              onChange={(e) =>
                set(
                  'variants',
                  form.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                )
              }
              className={input}
            />
            <label className="sr-only" htmlFor={`vp-${i}`}>
              Portion price in rupees
            </label>
            <input
              id={`vp-${i}`}
              value={v.price}
              inputMode="decimal"
              placeholder="₹"
              onChange={(e) =>
                set(
                  'variants',
                  form.variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                )
              }
              className={`${input} tabular max-w-32`}
            />
            <button
              type="button"
              onClick={() =>
                set(
                  'variants',
                  form.variants.filter((_, j) => j !== i),
                )
              }
              className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
              aria-label={`Remove portion ${i + 1}`}
            >
              <Trash2 className="size-[18px]" />
            </button>
          </div>
        ))}
        {fieldError('variants')}
        </div>
      </SectionCard>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
        <SectionCard title="Photos" actions={<span className="text-xs text-muted">Up to 6 · first is the cover</span>}>
          <div className="px-2 pb-2">
            <ImageUploader value={form.images} onChange={(v) => set('images', v)} folder="products" />
          </div>
        </SectionCard>
        <SectionCard title="Availability">
          <div className="flex flex-col gap-3 px-2 pb-2">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-[#faf6f1] px-3.5">
              <span className="text-sm font-semibold">{form.isAvailable ? 'In stock, customers can order' : 'Sold out for now'}</span>
              <Toggle checked={form.isAvailable} label="Available to order now" onChange={() => set('isAvailable', !form.isAvailable)} />
            </label>
            <p className="rounded-xl bg-[#e4f0fd] px-3.5 py-2.5 text-[13px] text-[#1d5fa8]">
              Sold-out dishes stay visible but can’t be ordered. Archive a dish from Menu items to hide it everywhere.
            </p>
          </div>
        </SectionCard>
      </div>
      </div>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {errors.form}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Link
          to="/admin/menu"
          className="inline-flex min-h-12 items-center rounded-[10px] px-5 font-semibold hover:bg-primary-soft"
        >
          Cancel
        </Link>
        <Button type="submit" loading={save.isPending}>
          {isNew ? 'Add dish' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

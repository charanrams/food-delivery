import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cx } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { sized } from '@/lib/catalog-api';
import { uploadImage } from './admin-api';

/** Upload/remove photos. The first photo is the cover shown on cards. */
export function ImageUploader({
  value,
  onChange,
  folder,
  max = 6,
  label = 'Photos',
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: 'products' | 'categories' | 'banners';
  max?: number;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(undefined);
    setBusy(true);
    try {
      const room = max - value.length;
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, room)) urls.push(await uploadImage(f, folder));
      onChange([...value, ...urls]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div
            key={url}
            className="group relative size-28 overflow-hidden rounded-xl ring-1 ring-line"
          >
            <img
              src={sized(url, 240)}
              alt={`${label} ${i + 1}`}
              className="size-full object-cover"
            />
            {i === 0 && max > 1 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-surface">
                Cover
              </span>
            )}
            {i > 0 && (
              <button
                type="button"
                onClick={() => onChange([url, ...value.filter((u) => u !== url)])}
                className="absolute inset-x-1.5 bottom-1.5 rounded-md bg-surface/95 py-1 text-[11px] font-semibold text-ink opacity-0 shadow-sm transition-opacity hover:text-primary-strong focus-visible:opacity-100 group-hover:opacity-100"
              >
                Make cover
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-surface/95 text-ink shadow-sm hover:text-danger"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={cx(
              'flex size-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-[13px] font-medium text-muted',
              'hover:border-primary hover:text-primary-strong disabled:cursor-wait',
            )}
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-6" aria-hidden />
            )}
            {busy ? 'Uploading…' : 'Add photo'}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        hidden
        onChange={(e) => pick(e.target.files)}
      />
      <p className="text-xs text-muted">
        {max > 1
          ? `${value.length} of ${max} photos. The cover shows on menu cards; customers swipe through all of them on the dish page. JPG, PNG or WebP, up to 5 MB each.`
          : 'JPG, PNG or WebP, up to 5 MB each.'}
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import type { PlaceDto } from '@a3/contracts';
import { Button, cx } from '@/components/ui';
import { api, ApiError, qs } from '@/lib/api';

const KITCHEN: [number, number] = [17.385, 78.4867];

/** Bold the part of a suggestion that matches what was typed. */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q.trim() ? text.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  const n = q.trim().length;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-extrabold">{text.slice(i, i + n)}</strong>
      {text.slice(i + n)}
    </>
  );
}

/** Reports drags so the centre pin can lift, and the settled centre to reverse-geocode. */
function MapEvents({
  programmatic,
  onMoveStart,
  onSettled,
}: {
  programmatic: React.RefObject<boolean>;
  onMoveStart: () => void;
  onSettled: (lat: number, lng: number, byUser: boolean) => void;
}) {
  const map = useMap();
  useMapEvents({
    movestart: () => !programmatic.current && onMoveStart(),
    moveend: () => {
      const c = map.getCenter();
      onSettled(c.lat, c.lng, !programmatic.current);
      programmatic.current = false;
    },
  });
  return null;
}

/**
 * Map picker (same flow as the app): the pin stays in the centre and the map moves under it,
 * real-time search suggestions as you type, "use my location", and the address under the pin.
 */
export function LocationPicker({ initial, onPick, onClose }: { initial?: { lat: number; lng: number }; onPick: (p: PlaceDto) => void; onClose: () => void }) {
  const listId = useId();
  const mapRef = useRef<LeafletMap | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PlaceDto[]>([]);
  const [active, setActive] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<PlaceDto>();
  const [resolving, setResolving] = useState(true);
  const [lifted, setLifted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string>();
  const reverseSeq = useRef(0);
  const reverseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const programmatic = useRef(false);
  const fly = (lat: number, lng: number) => {
    programmatic.current = true;
    mapRef.current?.flyTo([lat, lng], 17, { duration: 0.6 });
  };

  const reverse = useCallback((lat: number, lng: number) => {
    clearTimeout(reverseTimer.current);
    setResolving(true);
    reverseTimer.current = setTimeout(async () => {
      const seq = ++reverseSeq.current;
      try {
        const p = await api.get<PlaceDto>(`/geo/reverse${qs({ lat, lng })}`);
        if (seq === reverseSeq.current) setPlace(p);
      } catch {
        if (seq === reverseSeq.current) setPlace({ id: 'pin', title: 'Pinned location', subtitle: 'Add the address details on the next step', lat, lng });
      } finally {
        if (seq === reverseSeq.current) setResolving(false);
      }
    }, 450);
  }, []);

  // Real-time suggestions: debounced, and stale responses are cancelled.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError(undefined);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const c = mapRef.current?.getCenter();
      try {
        const list = await api.get<PlaceDto[]>(`/geo/search${qs({ q: term, lat: c?.lat, lng: c?.lng })}`);
        if (ctrl.signal.aborted) return;
        setResults(list);
        setActive(list.length ? 0 : -1);
        setSearchError(list.length ? undefined : 'No places found. Try a nearby landmark or area.');
      } catch (e) {
        if (!ctrl.signal.aborted) setSearchError(e instanceof ApiError ? e.message : 'Search failed.');
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  const choose = (p: PlaceDto) => {
    setPlace(p);
    setResolving(false);
    setQ('');
    setOpen(false);
    fly(p.lat, p.lng);
  };

  const locate = useCallback(
    (silent = false) => {
      if (!('geolocation' in navigator)) return;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          fly(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          setLocating(false);
          if (!silent)
            setNotice(err.code === err.PERMISSION_DENIED ? 'Location is blocked for this site. Allow it from the lock icon in the address bar.' : 'Your device location is off. Turn it on, or search instead.');
        },
        { enableHighAccuracy: true, timeout: 12_000 },
      );
    },
    [],
  );

  useEffect(() => {
    const [lat, lng] = initial ? [initial.lat, initial.lng] : KITCHEN;
    reverse(lat, lng);
    if (!initial) locate(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(reverseTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showList = open && q.trim().length >= 2 && (results.length > 0 || !!searchError);

  // Portal: the picker opens from inside the address <form>; keep its Enter/buttons from submitting it.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Choose delivery location" className="fixed inset-0 z-50 flex flex-col bg-surface md:items-center md:justify-center md:bg-ink/50 md:p-6">
      <div className="relative flex h-full w-full flex-col overflow-hidden md:h-[min(760px,92vh)] md:max-w-3xl md:rounded-[28px]">
        <div className="relative flex-1">
          <MapContainer
            ref={mapRef}
            center={initial ? [initial.lat, initial.lng] : KITCHEN}
            zoom={initial ? 17 : 13}
            minZoom={5}
            maxZoom={19}
            zoomControl={false}
            className="size-full"
          >
            {/* OpenStreetMap standard tiles: reliable, keyless, and free */}
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
            <MapEvents
              programmatic={programmatic}
              onMoveStart={() => {
                setLifted(true);
                setOpen(false);
              }}
              onSettled={(lat, lng, byUser) => {
                setLifted(false);
                if (byUser || !place || Math.abs(place.lat - lat) > 1e-5 || Math.abs(place.lng - lng) > 1e-5) reverse(lat, lng);
              }}
            />
          </MapContainer>

          {/* Centre pin — lifts while dragging. */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full" aria-hidden>
            <div className={cx('flex flex-col items-center transition-transform duration-200 ease-out', lifted && '-translate-y-3')}>
              <MapPin className="size-12 fill-primary-strong text-surface drop-shadow-md" strokeWidth={1.5} />
            </div>
            <span className={cx('mx-auto -mt-1 block h-1 rounded-full bg-ink/25 transition-all duration-200', lifted ? 'w-1.5 opacity-60' : 'w-2.5')} />
          </div>

          {/* Search + suggestions */}
          <div className="absolute inset-x-3 top-3 z-[600] md:inset-x-5 md:top-5">
            <div className="flex h-13 items-center gap-1 rounded-2xl bg-surface pl-1 pr-2 shadow-lg ring-1 ring-ink/5 focus-within:ring-2 focus-within:ring-ink">
              <button type="button" onClick={onClose} aria-label="Close map" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-card">
                <ArrowLeft className="size-5" aria-hidden />
              </button>
              <input
                autoFocus
                role="combobox"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                aria-label="Search area, street or landmark"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive((i) => Math.min(i + 1, results.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive((i) => Math.max(i - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (results[active]) choose(results[active]);
                  }
                }}
                placeholder="Search area, street, landmark…"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
              {searching ? (
                <Loader2 className="size-5 animate-spin text-muted" aria-label="Searching" />
              ) : (
                q && (
                  <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="grid size-9 place-items-center rounded-full hover:bg-card">
                    <X className="size-4" aria-hidden />
                  </button>
                )
              )}
            </div>
            {showList && (
              <ul id={listId} role="listbox" className="mt-2 max-h-[50vh] overflow-y-auto rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-ink/5">
                {searchError && results.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-muted">{searchError}</li>
                ) : (
                  results.map((p, i) => (
                    <li
                      key={p.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(p)}
                      className={cx('flex cursor-pointer items-start gap-3 px-4 py-2.5', i === active && 'bg-card')}
                    >
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-strong">
                        <MapPin className="size-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px]">
                          <Highlight text={p.title} q={q} />
                        </span>
                        {p.subtitle && <span className="line-clamp-2 text-[13px] text-muted">{p.subtitle}</span>}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => locate()}
            disabled={locating}
            className="absolute bottom-4 right-4 z-[600] inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold text-primary-strong shadow-lg ring-1 ring-ink/5 hover:bg-primary-soft"
          >
            {locating ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <LocateFixed className="size-[18px]" aria-hidden />}
            Use my location
          </button>
        </div>

        <div className="z-[600] flex flex-col gap-3 rounded-t-[28px] bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_24px_rgb(41_35_31/0.12)] md:rounded-none">
          {notice && (
            <p role="status" className="rounded-xl bg-primary-soft px-3 py-2 text-[13px]">
              {notice}
            </p>
          )}
          <p className="text-[13px] font-semibold text-muted">Deliver to this spot</p>
          <div aria-live="polite" className="min-h-12">
            {resolving || !place ? (
              <div className="flex flex-col gap-2" aria-label="Finding the address">
                <span className="h-4.5 w-44 animate-pulse rounded-md bg-card" />
                <span className="h-3.5 w-64 animate-pulse rounded-md bg-card" />
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold">{place.title}</p>
                  {place.subtitle && <p className="line-clamp-2 text-sm text-muted">{place.subtitle}</p>}
                </div>
              </div>
            )}
          </div>
          <Button type="button" disabled={resolving || !place} onClick={() => place && onPick(place)}>
            Confirm location
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

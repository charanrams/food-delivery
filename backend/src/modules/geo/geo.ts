import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { PlaceDto } from '@a3/contracts';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { ok } from '../../utils/http';

/**
 * Address search + reverse geocoding for the map picker (apps and web).
 * Proxied so clients never call a third party directly: one place to cache, rate-limit,
 * bias results to the kitchen's city, and swap providers (OpenStreetMap data via Photon today;
 * Google Places later only needs a change here).
 */
const PHOTON = process.env.GEO_PHOTON_URL ?? 'https://photon.komoot.io';
const INDIA_BBOX = '68.1,6.5,97.4,35.7';
const KITCHEN = { lat: 17.385, lng: 78.4867 }; // Hyderabad — results near here rank first
const UA = 'A3Kitchen/1.0 (food delivery address lookup)';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
    type?: string;
  };
}

const clean = (...parts: (string | undefined)[]) => [...new Set(parts.filter((p): p is string => !!p && p.trim().length > 0))];

export function toPlace(f: PhotonFeature): PlaceDto {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  const street = clean(p.housenumber, p.street).join(' ');
  const area = clean(p.locality, p.district).join(', ');
  const city = p.city ?? p.county ?? p.district;
  const title = p.name ?? (street || area || city || 'Pinned location');
  const subtitle = clean(p.name ? street : undefined, area, city, p.state, p.postcode).filter((x) => x !== title).join(', ');
  const postal = p.postcode?.replace(/\s/g, '');
  return {
    id: `${p.osm_type ?? 'X'}${p.osm_id ?? `${lat},${lng}`}`,
    title,
    subtitle,
    lat,
    lng,
    ...(clean(p.name !== city ? p.name : undefined, street).length && { line1: clean(p.name !== city ? p.name : undefined, street).join(', ') }),
    ...(area && { line2: area }),
    ...(city && { city }),
    ...(p.state && { state: p.state }),
    ...(postal && /^[1-9]\d{5}$/.test(postal) && { postalCode: postal }),
  };
}

// Tiny in-memory cache — typing "bir", "biry", "biryani" re-hits the same prefixes a lot.
const cache = new Map<string, { at: number; data: PlaceDto[] }>();
const TTL = 10 * 60 * 1000;
const unavailable = () => new AppError('SERVICE_UNAVAILABLE', 503, 'Address search is unavailable right now. Type the address instead.');

const dedupe = (list: PlaceDto[]) => {
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = `${p.title}|${p.subtitle}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ---- Provider 1: Photon (built for type-ahead) ----
async function photon(path: string): Promise<PlaceDto[]> {
  const json = await getJson<{ features?: PhotonFeature[] }>(`${PHOTON}${path}`, 2500);
  return (json.features ?? []).filter((f) => !f.properties.countrycode || f.properties.countrycode === 'IN').map(toPlace);
}

// ---- Provider 2: Nominatim (fallback). Its usage policy allows max 1 request/second. ----
const NOMINATIM = process.env.GEO_NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
let nextSlot = 0;
async function politeSlot() {
  const wait = Math.max(0, nextSlot - Date.now());
  nextSlot = Math.max(nextSlot, Date.now()) + 1000;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}
interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
}
function fromNominatim(n: NominatimPlace): PlaceDto {
  const a = n.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.city_district ?? a.county;
  const area = clean(a.suburb, a.neighbourhood, a.quarter).join(', ');
  const street = clean(a.house_number, a.road).join(' ');
  const title = n.name || street || area || n.display_name.split(',')[0]!;
  const postal = a.postcode?.replace(/\s/g, '');
  return {
    id: `N${n.place_id}`,
    title,
    subtitle: clean(street, area, city, a.state, postal).filter((x) => x !== title).join(', '),
    lat: Number(n.lat),
    lng: Number(n.lon),
    ...(clean(n.name && n.name !== city ? n.name : undefined, street).length && { line1: clean(n.name && n.name !== city ? n.name : undefined, street).join(', ') }),
    ...(area && { line2: area }),
    ...(city && { city }),
    ...(a.state && { state: a.state }),
    ...(postal && /^[1-9]\d{5}$/.test(postal) && { postalCode: postal }),
  };
}
async function nominatim(path: string): Promise<PlaceDto[]> {
  await politeSlot();
  const json = await getJson<NominatimPlace[] | NominatimPlace>(`${NOMINATIM}${path}`, 6000);
  return (Array.isArray(json) ? json : 'place_id' in json ? [json] : []).map(fromNominatim);
}

/** After Photon fails, skip it for 5 minutes so every keystroke doesn't wait for its timeout. */
let primaryDownUntil = 0;

/** Cached, Photon first, Nominatim if Photon is slow or down. */
async function lookup(key: string, primary: () => Promise<PlaceDto[]>, fallback: () => Promise<PlaceDto[]>): Promise<PlaceDto[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  let data: PlaceDto[];
  try {
    if (Date.now() < primaryDownUntil) throw new Error('primary cooling down');
    data = await primary();
  } catch {
    primaryDownUntil = Math.max(primaryDownUntil, Date.now() + 5 * 60 * 1000);
    try {
      data = await fallback();
    } catch {
      throw unavailable();
    }
  }
  data = dedupe(data);
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return data;
}

const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many searches. Wait a moment.' } },
  skip: () => process.env.NODE_ENV === 'test',
});

const searchQuery = z.object({
  q: z.string().trim().min(2).max(120),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
const reverseQuery = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

export const geoRouter = Router();
geoRouter.use(geoLimiter);

geoRouter.get('/search', validate({ query: searchQuery }), async (req, res) => {
  const { q, lat = KITCHEN.lat, lng = KITCHEN.lng } = res.locals.query as z.infer<typeof searchQuery>;
  const p = new URLSearchParams({ q, lat: String(lat), lon: String(lng), limit: '8', lang: 'en', bbox: INDIA_BBOX, location_bias_scale: '0.6' });
  // Nominatim: India only, biased to a ~60 km box around the point.
  const box = [lng - 0.6, lat + 0.6, lng + 0.6, lat - 0.6].join(',');
  const n = new URLSearchParams({ q, format: 'jsonv2', addressdetails: '1', limit: '6', countrycodes: 'in', viewbox: box });
  const list = await lookup(`s:${q.toLowerCase()}:${lat.toFixed(2)},${lng.toFixed(2)}`, () => photon(`/api/?${p}`), () => nominatim(`/search?${n}`));
  ok(res, list.slice(0, 6));
});

geoRouter.get('/reverse', validate({ query: reverseQuery }), async (req, res) => {
  const { lat, lng } = res.locals.query as z.infer<typeof reverseQuery>;
  const p = new URLSearchParams({ lat: lat.toFixed(6), lon: lng.toFixed(6), limit: '1', lang: 'en' });
  const n = new URLSearchParams({ lat: lat.toFixed(6), lon: lng.toFixed(6), format: 'jsonv2', addressdetails: '1', zoom: '18' });
  const [place] = await lookup(`r:${lat.toFixed(5)},${lng.toFixed(5)}`, () => photon(`/reverse?${p}`), () => nominatim(`/reverse?${n}`));
  // Keep the exact pin the user dropped, not the nearest building's centre.
  ok(res, place ? { ...place, lat, lng } : ({ id: `pin${lat},${lng}`, title: 'Pinned location', subtitle: '', lat, lng } satisfies PlaceDto));
});

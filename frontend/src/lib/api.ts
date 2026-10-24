import type { ApiErrorBody, ApiSuccess, AuthResponseDto, ErrorCode, PageMeta } from '@a3/contracts';

// Backend address from frontend/.env (e.g. http://localhost:4000); empty = same origin.
const BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api/v1`;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | 'NETWORK_ERROR',
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

// Access token lives in memory only (docs/SECURITY.md §1); the refresh token is an HttpOnly cookie.
let accessToken: string | null = null;
let onSessionLost: (() => void) | undefined;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
/** Current in-memory access token (for the realtime socket handshake). */
export const getAccessToken = () => accessToken;
export const onSessionExpired = (fn: () => void) => {
  onSessionLost = fn;
};

let refreshing: Promise<AuthResponseDto | null> | null = null;

/** One shared refresh at a time — parallel 401s all wait on the same rotation. */
export function refreshSession(): Promise<AuthResponseDto | null> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) return null;
      const body = (await r.json()) as ApiSuccess<AuthResponseDto>;
      setAccessToken(body.data.accessToken);
      return body.data;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function raw(path: string, init: RequestInit, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'You appear to be offline. Check your connection and try again.');
  }
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) return raw(path, init, false);
    setAccessToken(null);
    onSessionLost?.();
  }
  return res;
}

async function parse<T>(res: Response): Promise<{ data: T; meta?: PageMeta }> {
  const body = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiErrorBody | null;
  if (!body) throw new ApiError(res.status, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  if (!body.success) throw new ApiError(res.status, body.error.code, body.error.message, body.error.details);
  return { data: body.data, meta: body.meta };
}

export const api = {
  get: async <T>(path: string) => (await parse<T>(await raw(path, { method: 'GET' }))).data,
  page: async <T>(path: string) => {
    const { data, meta } = await parse<T[]>(await raw(path, { method: 'GET' }));
    return { items: data, meta: meta ?? { page: 1, limit: data.length, total: data.length } };
  },
  postWith: async <T>(path: string, body: unknown, headers: Record<string, string>) =>
    (await parse<T>(await raw(path, { method: 'POST', body: JSON.stringify(body), headers }))).data,
  post: async <T>(path: string, body?: unknown) => (await parse<T>(await raw(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }))).data,
  patch: async <T>(path: string, body: unknown) => (await parse<T>(await raw(path, { method: 'PATCH', body: JSON.stringify(body) }))).data,
  delete: async <T>(path: string) => (await parse<T>(await raw(path, { method: 'DELETE' }))).data,
};

export const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
  return s ? `?${s}` : '';
};

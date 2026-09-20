const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'findry.token';

export class ApiError extends Error {
  status: number;
  payload: Record<string, unknown>;
  constructor(status: number, payload: Record<string, unknown>) {
    super((payload?.error as string) || `Request failed (${status})`);
    this.status = status;
    this.payload = payload ?? {};
  }
  get code() {
    return this.payload.code as string | undefined;
  }
}

const ROLE_KEY = 'findry.role';

/**
 * Session storage on purpose: a Findry session is tied to the role chosen on
 * the login page and ends when the browser closes, so the landing page always
 * routes through login rather than straight into a portal.
 */
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
  },
  /** The portal this session signed in to ("seeker" | "employer"). */
  getRole: () => sessionStorage.getItem(ROLE_KEY) as 'seeker' | 'employer' | null,
  setRole: (r: 'seeker' | 'employer') => sessionStorage.setItem(ROLE_KEY, r),
};

/** Fires once per page load when a request is still pending after this long (Render free tier cold start ≈ 30-60 s). */
const SLOW_AFTER_MS = 6000;
let slowHintShown = false;
let onSlowRequest: (() => void) | null = null;
export const setSlowRequestHandler = (fn: () => void) => {
  onSlowRequest = fn;
};

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  const headers: Record<string, string> = {};
  const slowTimer = setTimeout(() => {
    if (slowHintShown) return;
    slowHintShown = true;
    onSlowRequest?.();
  }, SLOW_AFTER_MS);
  const token = tokenStore.get();
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined && !isForm) headers['content-type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    clearTimeout(slowTimer);
    throw new ApiError(0, { error: 'Network error — check your connection and try again.', code: 'NETWORK' });
  }
  clearTimeout(slowTimer);
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    if (res.status === 429 && !data.error) data = { error: 'Too many requests — please wait a moment and try again.', code: 'RATE_LIMITED' };
    if (res.status >= 500 && !data.error) data = { error: 'The server hit a problem. Please try again in a moment.' };
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form, true),
};

/** Build a query string, dropping empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

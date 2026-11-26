/**
 * Thin fetch wrapper for the Laravel backend (session cookie + CSRF, JSON in/out).
 * Every outcome resolves to an ActionResult; this module never throws and never rejects, so a
 * dropped connection becomes NETWORK_ERROR instead of an unhandled promise rejection.
 */
import type { ActionResult, ErrorCode } from '@/domain/types';

export interface HttpClientOptions {
  /** Prefix for every path. Default '' (same origin as the Inertia app). */
  baseUrl?: string;
  /** Injected for tests or SSR. Defaults to globalThis.fetch. */
  fetch?: typeof fetch;
  /** Abort and report NETWORK_ERROR after this many ms. Default 20 000. */
  timeoutMs?: number;
  /** Laravel sets this cookie on web responses; its value is echoed as X-XSRF-TOKEN. */
  xsrfCookieName?: string;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface HttpClient {
  get<T>(path: string, query?: Query): Promise<ActionResult<T>>;
  post<T>(path: string, body?: unknown): Promise<ActionResult<T>>;
  put<T>(path: string, body?: unknown): Promise<ActionResult<T>>;
  delete<T>(path: string): Promise<ActionResult<T>>;
  upload<T>(path: string, form: FormData): Promise<ActionResult<T>>;
}

const KNOWN_CODES: readonly ErrorCode[] = [
  'UNAUTHORIZED', 'FORBIDDEN', 'IDENTITY_PENDING', 'EXCLUSIVITY_CONFLICT', 'PENDAMPING_REQUIRED', 'APPROVAL_DECLINED',
  'EXPIRED', 'VALIDATION_ERROR', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'NOT_FOUND', 'UNKNOWN',
];

function statusToCode(status: number): ErrorCode {
  if (status === 401 || status === 419) return 'UNAUTHORIZED'; // 419 = Laravel CSRF/session expired
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 410) return 'EXPIRED';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVICE_UNAVAILABLE';
  return 'UNKNOWN';
}

/**
 * Maps a parsed response to an ActionResult. Exported for unit tests.
 * Success bodies may be wrapped in Laravel's `{ data: ... }` resource envelope.
 * Error bodies may carry `{ code, message }` (Zawjan contract) and/or Laravel's 422 `{ message, errors }`.
 * Server `message` text is only surfaced when the server also sent an explicit Zawjan `code`, or
 * for a 422 without field errors, so framework defaults like "Unauthenticated." never reach users.
 */
export function mapResponse<T>(status: number, body: unknown): ActionResult<T> {
  const obj = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  if (status >= 200 && status < 300) {
    const data = obj && 'data' in obj ? obj.data : body;
    return { ok: true, data: data as T };
  }
  const explicit = typeof obj?.code === 'string' && (KNOWN_CODES as readonly string[]).includes(obj.code) ? (obj.code as ErrorCode) : undefined;
  const code = explicit ?? statusToCode(status);
  const message = typeof obj?.message === 'string' ? obj.message : undefined;
  let fieldErrors: Record<string, string> | undefined;
  if (obj?.errors && typeof obj.errors === 'object') {
    fieldErrors = {};
    for (const [k, v] of Object.entries(obj.errors as Record<string, unknown>)) {
      const first = Array.isArray(v) ? v[0] : v;
      if (typeof first === 'string') fieldErrors[k] = first;
    }
    if (!Object.keys(fieldErrors).length) fieldErrors = undefined;
  }
  const showMessage = message && (explicit || (code === 'VALIDATION_ERROR' && !fieldErrors));
  return { ok: false, code, ...(showMessage ? { message } : {}), ...(fieldErrors ? { fieldErrors } : {}) };
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
}

export function createHttpClient(opts: HttpClientOptions = {}): HttpClient {
  const baseUrl = opts.baseUrl ?? '';
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const cookieName = opts.xsrfCookieName ?? 'XSRF-TOKEN';

  async function send<T>(method: string, path: string, body?: unknown, form?: FormData): Promise<ActionResult<T>> {
    const doFetch = opts.fetch ?? globalThis.fetch;
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const xsrf = readCookie(cookieName);
    if (xsrf && method !== 'GET') headers['X-XSRF-TOKEN'] = xsrf;
    if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : undefined;
    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        method, headers, credentials: 'same-origin',
        ...(form ? { body: form } : body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...(ctrl ? { signal: ctrl.signal } : {}),
      });
    } catch {
      return { ok: false, code: 'NETWORK_ERROR' };
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (res.status === 204) return res.ok ? { ok: true, data: undefined as T } : mapResponse(res.status, undefined);
    const isJson = (res.headers.get('content-type') ?? '').includes('json');
    if (!isJson) {
      // A 2xx HTML page means the request hit a web route / SPA fallback instead of the API.
      return res.ok ? { ok: false, code: 'SERVICE_UNAVAILABLE' } : mapResponse(res.status, undefined);
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      return { ok: false, code: res.ok ? 'SERVICE_UNAVAILABLE' : statusToCode(res.status) };
    }
    return mapResponse<T>(res.status, parsed);
  }

  return {
    get: (path, query) => send('GET', withQuery(path, query)),
    post: (path, body) => send('POST', path, body ?? {}),
    put: (path, body) => send('PUT', path, body ?? {}),
    delete: (path) => send('DELETE', path),
    upload: (path, form) => send('POST', path, undefined, form),
  };
}

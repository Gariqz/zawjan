import type { ActionResult, ErrorCode } from '@/domain/types';

export type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

/** A service call that failed for a known reason but chose to throw instead of resolving a result. */
export class ServiceError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ServiceError';
    this.code = code;
  }
}

/** The request never reached the server or no response came back (offline, DNS, timeout, CORS). */
export class NetworkError extends ServiceError {
  constructor(message = 'Network request failed') {
    super('NETWORK_ERROR', message);
    this.name = 'NetworkError';
  }
}

const NETWORK_MESSAGE = /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected/i;

export function isNetworkFailure(e: unknown): boolean {
  if (e instanceof NetworkError) return true;
  if (typeof e !== 'object' || e === null || !('name' in e)) return false;
  const { name, message } = e as { name: string; message?: string };
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  return name === 'TypeError' && NETWORK_MESSAGE.test(message ?? '');
}

/**
 * Converts anything a service call threw into the same failure shape services resolve with, so
 * screens render one error path. Unrecognised exceptions become UNKNOWN and are logged in dev,
 * because they usually mean a bug rather than an outage.
 */
export function failureFromThrown(e: unknown): ActionFailure {
  if (isNetworkFailure(e)) return { ok: false, code: 'NETWORK_ERROR' };
  if (e instanceof ServiceError) return { ok: false, code: e.code };
  if (import.meta.env.DEV) console.error('[services] unexpected failure', e);
  return { ok: false, code: 'UNKNOWN' };
}

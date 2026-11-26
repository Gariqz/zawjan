import { useCallback, useRef, useState } from 'react';
import type { ActionResult, ErrorCode } from '@/domain/types';
import { failureFromThrown } from '@/services/errors';

export interface ActionError { code: ErrorCode; message?: string; fieldErrors?: Record<string, string> }

/**
 * Wraps a mutation: exposes busy state and blocks duplicate submissions (double tap).
 * `run` never rejects: thrown errors and network failures resolve as `{ ok: false }`.
 */
export function useAction<A extends unknown[], T>(fn: (...args: A) => Promise<ActionResult<T>>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async (...args: A): Promise<ActionResult<T> | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    let r: ActionResult<T>;
    try {
      r = await fn(...args);
    } catch (e) {
      r = failureFromThrown(e);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    if (!r.ok) setError({ code: r.code, ...(r.message ? { message: r.message } : {}), ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) });
    return r;
  }, [fn]);

  return { run, busy, error, clearError: () => setError(null) };
}

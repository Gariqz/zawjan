import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import type { ActionResult, ErrorCode } from '@/domain/types';
import { failureFromThrown } from '@/services/errors';
import { useServices } from '@/services/registry';

export type QueryState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: { code: ErrorCode; message?: string } }
  | { status: 'success'; data: T; error?: undefined };

/**
 * Loads data through a service call. Re-fetches silently when the service layer signals a change
 * (server push / mock simulation) so status changes appear without a skeleton flash.
 * A rejected promise (network failure, codec error) is shown as an error state, never left unhandled.
 */
export function useQuery<T>(fn: () => Promise<ActionResult<T>>, deps: DependencyList): QueryState<T> & { reload: () => void } {
  const { events } = useServices();
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const load = useCallback((silent: boolean) => {
    const my = ++seq.current;
    if (!silent) setState({ status: 'loading' });
    const settle = (r: ActionResult<T>) => {
      if (my !== seq.current) return;
      setState(r.ok ? { status: 'success', data: r.data } : { status: 'error', error: { code: r.code, ...(r.message ? { message: r.message } : {}) } });
    };
    let p: Promise<ActionResult<T>>;
    try {
      p = fnRef.current();
    } catch (e) {
      p = Promise.reject(e);
    }
    p.then(settle, (e: unknown) => settle(failureFromThrown(e)));
  }, []);

  useEffect(() => {
    load(false);
    return events.subscribe(() => load(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: () => load(false) };
}

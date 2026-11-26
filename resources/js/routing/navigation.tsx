/**
 * Navigation adapter. This is the ONLY module that imports the router library, so swapping the
 * standalone react-router harness for Inertia (`@inertiajs/react` Link/router/usePage) is a
 * one-file change. Keep the exported API stable.
 */
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

export interface AppLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(({ to, replace, ...p }, ref) => {
  const loc = useLocation();
  return <Link ref={ref} to={withPreservedDevParams(to, loc.search)} replace={replace} {...p} />;
});
AppLink.displayName = 'AppLink';

export function useAppNavigate(): (to: string, opts?: { replace?: boolean }) => void {
  const nav = useNavigate();
  const loc = useLocation();
  return (to, opts) => nav(withPreservedDevParams(to, loc.search), opts);
}

export function useRouteParam(name: string): string {
  return useParams()[name] ?? '';
}

export function useCurrentPath(): string {
  return useLocation().pathname;
}

export function useQueryParam(name: string): [string | null, (v: string | null) => void] {
  const [sp, setSp] = useSearchParams();
  return [sp.get(name), (v) => {
    const n = new URLSearchParams(sp);
    if (v === null || v === '') n.delete(name); else n.set(name, v);
    setSp(n, { replace: true });
  }];
}

/** All query params as a record, plus a setter that preserves dev/export params. */
export function useQueryParams(): [Record<string, string>, (next: Record<string, string | undefined>) => void] {
  const [sp, setSp] = useSearchParams();
  const rec = Object.fromEntries(sp.entries());
  return [rec, (next) => {
    const n = new URLSearchParams();
    for (const k of DEV_PARAMS) { const v = sp.get(k); if (v !== null) n.set(k, v); }
    for (const [k, v] of Object.entries(next)) if (v !== undefined && v !== '') n.set(k, v);
    setSp(n);
  }];
}

/** Dev/export-only params are carried across in-app navigation; production never sets them. */
const DEV_PARAMS = ['scenario', 'persona', 'chrome', 'latency'];
function withPreservedDevParams(to: string, search: string): string {
  if (!search) return to;
  const cur = new URLSearchParams(search);
  const keep = DEV_PARAMS.filter((k) => cur.has(k));
  if (!keep.length) return to;
  const [path, qs = ''] = to.split('?');
  const next = new URLSearchParams(qs);
  for (const k of keep) if (!next.has(k)) next.set(k, cur.get(k) ?? '');
  return `${path}?${next.toString()}`;
}

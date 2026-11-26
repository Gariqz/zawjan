import type { ReactNode } from 'react';
import { CloudOff, FileQuestion, KeyRound, ShieldAlert, ShieldOff, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { common } from '@/content/id/common';
import type { ErrorCode } from '@/domain/types';
import type { QueryState } from '@/hooks/useQuery';
import { cn } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';

export function errorMessage(code: ErrorCode, message?: string): string {
  switch (code) {
    case 'FORBIDDEN': return common.errors.forbidden;
    case 'NOT_FOUND': return common.errors.notFound;
    case 'UNAUTHORIZED': return message ?? common.errors.sessionExpired;
    case 'IDENTITY_PENDING': return common.errors.identityPending;
    case 'EXCLUSIVITY_CONFLICT': return common.errors.exclusivity;
    case 'PENDAMPING_REQUIRED': return common.errors.pendampingRequired;
    case 'APPROVAL_DECLINED': return common.errors.approvalDeclined;
    case 'EXPIRED': return common.errors.expired;
    case 'VALIDATION_ERROR': return message ?? common.errors.validation;
    case 'RATE_LIMITED': return common.errors.rateLimited;
    case 'SERVICE_UNAVAILABLE': return common.errors.service;
    case 'NETWORK_ERROR': return common.errors.network;
    default: return message ?? common.errors.unknown;
  }
}

/** Neutral, non-disclosing full-area error (403/404 never reveal whether an entity exists). */
export function ErrorState({ code, message, onRetry, backTo, className }: {
  code: ErrorCode; message?: string; onRetry?: () => void; backTo?: string; className?: string;
}) {
  const meta = {
    FORBIDDEN: { icon: ShieldOff, title: common.errors.forbiddenTitle },
    NOT_FOUND: { icon: FileQuestion, title: common.errors.notFoundTitle },
    UNAUTHORIZED: { icon: KeyRound, title: common.errors.sessionExpired },
    IDENTITY_PENDING: { icon: ShieldAlert, title: 'Menunggu verifikasi identitas' },
    NETWORK_ERROR: { icon: WifiOff, title: common.errors.networkTitle },
  } as Partial<Record<ErrorCode, { icon: typeof CloudOff; title: string }>>;
  const m = meta[code] ?? { icon: CloudOff, title: code === 'RATE_LIMITED' ? 'Tunggu sebentar' : common.errors.serviceTitle };
  const Icon = m.icon;
  const retryable = code === 'SERVICE_UNAVAILABLE' || code === 'NETWORK_ERROR' || code === 'RATE_LIMITED' || code === 'UNKNOWN';
  return (
    <div role="alert" data-error-code={code} className={cn('flex flex-col items-center rounded-card border border-line bg-surface-white px-6 py-10 text-center', className)}>
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-canvas text-ink-muted"><Icon className="h-6 w-6" aria-hidden /></span>
      <h2 className="text-lg font-semibold text-brand-forest">{m.title}</h2>
      <p className="mt-1 max-w-md text-sm text-ink-muted">{errorMessage(code, message)}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {retryable && onRetry && <Button onClick={onRetry}>{common.actions.retry}</Button>}
        {code === 'UNAUTHORIZED' && <AppLink to={`${ROUTES.login}?alasan=sesi-berakhir`} className="inline-flex min-h-touch items-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-white">Masuk</AppLink>}
        {code === 'IDENTITY_PENDING' && <AppLink to={ROUTES.verification} className="inline-flex min-h-touch items-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-white">Lihat status verifikasi</AppLink>}
        {backTo && <AppLink to={backTo} className="inline-flex min-h-touch items-center rounded-control border border-line-strong px-4 text-sm font-semibold">{common.actions.back}</AppLink>}
      </div>
    </div>
  );
}

/** Inline action error near the control that failed. */
export function ActionErrorCallout({ code, message, className }: { code: ErrorCode; message?: string; className?: string }) {
  const tone = code === 'EXCLUSIVITY_CONFLICT' || code === 'EXPIRED' ? 'info' : code === 'VALIDATION_ERROR' ? 'warning' : 'danger';
  const title = code === 'EXCLUSIVITY_CONFLICT' ? 'Tidak dapat melanjutkan' : undefined;
  return <Callout tone={tone} title={title} role="alert" className={className}>{errorMessage(code, message)}</Callout>;
}

export function LoadingSkeleton({ variant = 'list', label = common.actions.back }: { variant?: 'list' | 'detail' | 'table' | 'chat' | 'cards'; label?: string }) {
  const row = (k: number, cls = 'h-24') => <div key={k} className={cn('skeleton w-full', cls)} />;
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Memuat {label === common.actions.back ? '' : label}…</span>
      {variant === 'detail' && (<><div className="skeleton h-8 w-2/3" /><div className="skeleton h-4 w-1/2" />{row(1, 'h-40')}{row(2, 'h-32')}</>)}
      {variant === 'list' && [0, 1, 2].map((k) => row(k))}
      {variant === 'cards' && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((k) => row(k, 'h-56'))}</div>}
      {variant === 'table' && (<><div className="skeleton h-10 w-full" />{[0, 1, 2, 3, 4].map((k) => row(k, 'h-12'))}</>)}
      {variant === 'chat' && (<>{[0, 1, 2, 3].map((k) => <div key={k} className={cn('skeleton h-14 w-3/4', k % 2 && 'self-end')} />)}</>)}
    </div>
  );
}

/** Standard loading / error / success rendering for a query. */
export function QueryView<T>({ query, skeleton = 'list', children, backTo }: {
  query: QueryState<T> & { reload: () => void }; skeleton?: 'list' | 'detail' | 'table' | 'chat' | 'cards'; children: (data: T) => ReactNode; backTo?: string;
}) {
  if (query.status === 'loading') return <LoadingSkeleton variant={skeleton} />;
  if (query.status === 'error') return <ErrorState code={query.error.code} {...(query.error.message ? { message: query.error.message } : {})} onRetry={query.reload} {...(backTo ? { backTo } : {})} />;
  return <>{children(query.data)}</>;
}

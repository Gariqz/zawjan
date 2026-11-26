import type { ReactNode } from 'react';
import { ErrorState, LoadingSkeleton } from '@/components/feedback';
import { Wordmark } from '@/components/shared';
import type { AccountRole } from '@/domain/types';
import { useViewerState } from '@/state/viewer';

/** Minimal branded frame so guard states (loading, signed out, offline) still look like Zawjan. */
function GuardFrame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-surface-canvas">
      <header className="border-b border-line bg-surface-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center page-x md:h-16"><Wordmark className="text-xl md:text-2xl" /></div>
      </header>
      <main id="main" className={wide ? 'mx-auto max-w-3xl px-4 py-6 md:py-10' : 'mx-auto max-w-xl px-4 py-8 md:py-16'}>{children}</main>
    </div>
  );
}

/**
 * Centralized route guard. UX convenience only: the backend must authorize every request
 * and protected resource independently.
 */
export function RequireRole({ roles, children }: { roles: AccountRole[]; children: ReactNode }) {
  const v = useViewerState();
  if (v.status === 'loading') return <GuardFrame wide><LoadingSkeleton variant="detail" /></GuardFrame>;
  if (v.status === 'error') return <GuardFrame><ErrorState code={v.error.code} onRetry={v.reload} /></GuardFrame>;
  if (!roles.some((r) => v.data.roles.includes(r))) return <GuardFrame><ErrorState code="FORBIDDEN" /></GuardFrame>;
  return <>{children}</>;
}

import { ErrorState } from '@/components/feedback';
import { Wordmark } from '@/components/shared';
import type { ErrorCode } from '@/domain/types';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';

function SystemShell({ code }: { code: ErrorCode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-canvas">
      <header className="border-b border-line bg-surface-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center page-x"><AppLink to={ROUTES.publicHome} aria-label="Zawjan — halaman utama"><Wordmark className="text-xl" /></AppLink></div>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 p-6 md:py-16">
        <ErrorState code={code} onRetry={() => window.location.reload()} backTo={ROUTES.publicHome} />
      </main>
    </div>
  );
}

/** SYS-01 — neutral: never confirms whether a protected entity exists. */
export function ForbiddenPage() { return <SystemShell code="FORBIDDEN" />; }
/** SYS-02 */
export function NotFoundPage() { return <SystemShell code="NOT_FOUND" />; }
/** SYS-03 */
export function ServiceErrorPage() { return <SystemShell code="SERVICE_UNAVAILABLE" />; }

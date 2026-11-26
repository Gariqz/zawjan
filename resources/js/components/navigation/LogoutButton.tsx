import { LogOut } from 'lucide-react';
import { errorMessage } from '@/components/feedback';
import { common } from '@/content/id/common';
import { useAction } from '@/hooks/useAction';
import { cn } from '@/lib/utils';
import { useAppNavigate } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { useViewerState } from '@/state/viewer';

/**
 * Ends the session through AuthService.logout(), then drops the cached viewer and goes to the
 * login screen. If the server call fails the user stays signed in and is told so, rather than
 * being shown a login page while the session is still valid.
 */
export function LogoutButton({ variant = 'link', className }: { variant?: 'icon' | 'link'; className?: string }) {
  const { auth } = useServices();
  const viewer = useViewerState();
  const nav = useAppNavigate();
  const toast = useToast();
  const action = useAction(auth.logout);

  const onClick = async () => {
    const r = await action.run();
    if (!r) return;
    if (r.ok) {
      nav(`${ROUTES.login}?alasan=keluar`, { replace: true });
      viewer.reload();
    } else {
      toast(r.code === 'NETWORK_ERROR' || r.code === 'SERVICE_UNAVAILABLE' ? common.errors.logoutFailed : errorMessage(r.code, r.message), 'danger');
    }
  };

  if (variant === 'icon') {
    return (
      <button type="button" onClick={onClick} disabled={action.busy} aria-busy={action.busy || undefined} aria-label={common.actions.logout} title={common.actions.logout}
        className={cn('inline-flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-surface-canvas disabled:opacity-60', className)}>
        <LogOut className="h-5 w-5" aria-hidden />
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={action.busy} aria-busy={action.busy || undefined}
      className={cn('inline-flex min-h-touch w-fit items-center gap-2 font-semibold text-danger hover:underline disabled:opacity-60', className)}>
      <LogOut className="h-4 w-4" aria-hidden />{action.busy ? `${common.actions.logout}…` : common.actions.logout}
    </button>
  );
}

import { useState, type ReactNode } from 'react';
import { ClipboardCheck, Flag, History, KeyRound, LayoutDashboard, Menu, ScrollText, Users } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DevModeBanner } from '@/components/feedback/DevModeBanner';
import { LogoutButton } from '@/components/navigation/LogoutButton';
import { DesktopSidebar, type NavItem } from '@/components/navigation/Nav';
import { RequireRole } from '@/components/navigation/RequireRole';
import { Wordmark } from '@/components/shared';
import { common } from '@/content/id/common';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useViewerState } from '@/state/viewer';

const n = common.nav;

const moderatorNav: NavItem[] = [
  { to: ROUTES.moderator, label: n.moderator.overview, icon: LayoutDashboard },
  { to: ROUTES.modVerification, label: n.moderator.verification, icon: ClipboardCheck, match: [`${ROUTES.modVerification}/`] },
  { to: ROUTES.modReports, label: n.moderator.reports, icon: Flag, match: [`${ROUTES.modReports}/`] },
  { to: ROUTES.modActions, label: n.moderator.actions, icon: History },
];
const adminNav: NavItem[] = [
  { to: ROUTES.admin, label: n.admin.overview, icon: LayoutDashboard },
  { to: ROUTES.adminUsers, label: n.admin.users, icon: Users },
  { to: ROUTES.adminAccess, label: n.admin.access, icon: KeyRound },
  { to: ROUTES.adminAudit, label: n.admin.audit, icon: ScrollText },
];

/**
 * Desktop-primary staff shell (≥1024px persistent sidebar). Smaller screens get a menu sheet.
 * Moderator and admin share the shell but never each other's navigation or permissions.
 */
export function StaffLayout({ role, children }: { role: 'moderator' | 'admin'; children: ReactNode }) {
  const items = role === 'moderator' ? moderatorNav : adminNav;
  const [open, setOpen] = useState(false);
  const v = useViewerState();
  return (
    <RequireRole roles={[role]}>
      <div className="min-h-dvh bg-surface-canvas">
        <div className="flex">
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface-white p-4 lg:flex">
            <AppLink to={items[0]!.to} className="mb-6 px-2"><Wordmark className="text-xl" /></AppLink>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{n.roleLabel[role]}</p>
            <DesktopSidebar items={items} label={common.nav.main} />
            {v.status === 'success' && (
              <div className="mt-auto border-t border-line pt-4 text-sm">
                <p className="font-semibold">{v.data.displayName}</p>
                <LogoutButton className="mt-1 min-h-[36px] text-sm" />
              </div>
            )}
          </aside>
          <div className="min-w-0 flex-1">
            {v.status === 'success' && v.data.isDevelopmentMock && <DevModeBanner />}
            <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-surface-white px-4 lg:hidden">
              <Wordmark className="text-xl" />
              <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-control hover:bg-surface-canvas" aria-label="Buka menu">
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </header>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent variant="sheet" title={n.roleLabel[role]}>
                <DesktopSidebar items={items} label={common.nav.main} onNavigate={() => setOpen(false)} />
                <div className="mt-4 border-t border-line pt-4"><LogoutButton /></div>
              </DialogContent>
            </Dialog>
            <main id="main" className="mx-auto max-w-7xl px-4 py-6 md:px-8 lg:py-8">{children}</main>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}

/** Complex privileged actions are desktop-only until a safe mobile flow is reviewed (design.md §6). */
export function DesktopOnly({ children, notice = 'Tinjauan dokumen dan tindakan ini memerlukan layar desktop (lebar ≥ 1024 px).' }: { children: ReactNode; notice?: string }) {
  return (
    <>
      <div className="hidden lg:block">{children}</div>
      <p className="rounded-card border border-line bg-surface-white p-4 text-sm text-ink-muted lg:hidden" role="note"><strong className="block text-brand-forest">Tinjau di desktop</strong>{notice}</p>
    </>
  );
}

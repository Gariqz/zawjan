import type { ReactNode } from 'react';
import { DevModeBanner } from '@/components/feedback/DevModeBanner';
import { LogoutButton } from '@/components/navigation/LogoutButton';
import { DesktopSidebar, MobileBottomNav, type NavItem } from '@/components/navigation/Nav';
import { Wordmark } from '@/components/shared';
import { common } from '@/content/id/common';
import { AppLink } from '@/routing/navigation';
import { useViewerState } from '@/state/viewer';

/** Mobile-first shell for participant and pendamping: bottom nav < md, sidebar ≥ md. */
export function AppShell({ items, homeTo, roleLabel, children }: { items: NavItem[]; homeTo: string; roleLabel: string; children: ReactNode }) {
  const v = useViewerState();
  const viewer = v.status === 'success' ? v.data : undefined;
  return (
    <div className="min-h-dvh bg-surface-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface-white focus:px-4 focus:py-2">{common.nav.skip}</a>
      {viewer?.isDevelopmentMock && <DevModeBanner />}
      <header className="sticky top-0 z-20 border-b border-line bg-surface-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 page-x md:h-16">
          <AppLink to={homeTo} aria-label={`${common.brand.name} — beranda`}><Wordmark className="text-xl md:text-2xl" /></AppLink>
          {viewer && (
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{viewer.displayName}</p>
                <p className="text-xs text-ink-subtle">{roleLabel}</p>
              </div>
              <LogoutButton variant="icon" />
            </div>
          )}
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 page-x">
        <DesktopSidebar items={items} label={common.nav.main} className="sticky top-20 hidden h-fit w-56 shrink-0 pt-6 md:block" />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pt-5 with-bottom-nav md:pb-12 md:pt-8">{children}</main>
      </div>
      <MobileBottomNav items={items} label={common.nav.main} />
    </div>
  );
}

/** One focused task (onboarding / verification): no bottom nav, clear exit. */
export function FocusedLayout({ exitTo, exitLabel = 'Simpan & keluar', aside, children }: { exitTo: string; exitLabel?: string; aside?: ReactNode; children: ReactNode }) {
  const v = useViewerState();
  return (
    <div className="min-h-dvh bg-surface-canvas">
      {v.status === 'success' && v.data.isDevelopmentMock && <DevModeBanner />}
      <header className="border-b border-line bg-surface-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between page-x md:h-16">
          <Wordmark className="text-xl" />
          <AppLink to={exitTo} className="inline-flex min-h-touch items-center rounded-control px-3 text-sm font-semibold text-brand-primary hover:bg-brand-mint">{exitLabel}</AppLink>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 py-6 page-x md:py-10 lg:grid-cols-[1fr_300px]">
        <main id="main" className="min-w-0">{children}</main>
        {aside && <aside className="hidden lg:block">{aside}</aside>}
      </div>
    </div>
  );
}

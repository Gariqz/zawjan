import type { ReactNode } from 'react';
import { DevModeBanner } from '@/components/feedback/DevModeBanner';
import { Wordmark } from '@/components/shared';
import { publicCopy } from '@/content/id/public';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { mode } = useServices();
  const c = publicCopy.layout;
  return (
    <div className="flex min-h-dvh flex-col bg-surface-white">
      {mode === 'mock' && <DevModeBanner />}
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 page-x">
          <AppLink to={ROUTES.publicHome} aria-label="Zawjan — halaman utama"><Wordmark /></AppLink>
          <nav aria-label="Navigasi publik" className="flex items-center gap-1">
            <a href="#proses" className="hidden min-h-touch items-center rounded-control px-3 text-sm font-semibold text-ink-muted hover:text-ink md:inline-flex">{c.process}</a>
            <a href="#privasi" className="hidden min-h-touch items-center rounded-control px-3 text-sm font-semibold text-ink-muted hover:text-ink md:inline-flex">{c.privacy}</a>
            <a href="#faq" className="hidden min-h-touch items-center rounded-control px-3 text-sm font-semibold text-ink-muted hover:text-ink md:inline-flex">{c.faq}</a>
            <AppLink to={ROUTES.login} className="inline-flex min-h-touch items-center rounded-control px-3 text-sm font-semibold text-brand-primary hover:bg-brand-mint">{c.login}</AppLink>
            <AppLink to={ROUTES.register} className="inline-flex min-h-touch items-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-forest">{c.register}</AppLink>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-line bg-surface-canvas">
        <div className="mx-auto grid max-w-6xl gap-6 py-10 page-x md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Wordmark className="text-xl" />
            <p className="mt-2 max-w-sm text-sm text-ink-muted">{c.footerAbout}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{c.legal}</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              <li><a className="inline-flex min-h-touch items-center hover:text-ink" href="#syarat">{c.terms}</a></li>
              <li><a className="inline-flex min-h-touch items-center hover:text-ink" href="#kebijakan-privasi">{c.privacyPolicy}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">{c.contact}</p>
            <p className="mt-2 text-sm text-ink-muted">{c.contactNote}</p>
          </div>
        </div>
        <p className="border-t border-line py-4 text-center text-xs text-ink-subtle page-x">{c.copyright}</p>
      </footer>
    </div>
  );
}

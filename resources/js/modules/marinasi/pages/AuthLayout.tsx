import type { ReactNode } from 'react';
import { DevModeBanner } from '@/components/feedback/DevModeBanner';
import { Wordmark } from '@/components/shared';
import { common } from '@/content/id/common';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

export function AuthLayout({ children }: { children: ReactNode }) {
  const { mode } = useServices();
  return (
    <div className="min-h-dvh bg-surface-canvas">
      {mode === 'mock' && <DevModeBanner />}
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-6xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-brand-forest p-10 text-white lg:flex">
          <AppLink to={ROUTES.publicHome}><Wordmark inverse /></AppLink>
          <div>
            <p className="font-display text-4xl leading-tight text-white">{common.brand.slogan}</p>
            <p className="mt-3 text-white/75">{common.brand.voice}</p>
          </div>
          <p className="text-sm text-white/60">Zawjan tidak melangsungkan akad nikah dan bukan layanan KUA.</p>
        </div>
        <main id="main" className="flex flex-col px-4 py-8 sm:px-8 lg:justify-center lg:px-14">
          <AppLink to={ROUTES.publicHome} className="mb-8 lg:hidden"><Wordmark /></AppLink>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

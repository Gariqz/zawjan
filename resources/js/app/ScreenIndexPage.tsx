import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Wordmark } from '@/components/shared';
import { SCENARIOS } from '@/services/mock/scenarios';
import { DEMO_JOURNEYS } from './demoJourneys';
import { captureViewports, SCREENS, type Owner } from './screenRegistry';

const OWNER_TONE: Record<Owner, 'brand' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  Marinasi: 'brand', BrandyKeun: 'info', Khaslana: 'warning', EAAA: 'danger', Shared: 'neutral',
};

export function captureUrl(path: string, scenario: string, persona?: string, extra?: Record<string, string>): string {
  const [p, qs = ''] = path.split('?');
  const sp = new URLSearchParams(qs);
  sp.set('scenario', scenario);
  if (persona) sp.set('persona', persona);
  for (const [k, v] of Object.entries(extra ?? {})) sp.set(k, v);
  return `${p}?${sp.toString()}`;
}

/** DEV-ONLY index of every screen × state, grouped by owning team. Same data drives the Figma export. */
export function ScreenIndexPage() {
  const owners: Owner[] = ['Marinasi', 'BrandyKeun', 'Khaslana', 'EAAA', 'Shared'];
  return (
    <div className="min-h-dvh bg-surface-canvas">
      <header className="border-b border-line bg-surface-white"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between page-x"><Wordmark /><span className="text-sm font-semibold text-accent-amber-text">Indeks layar — mode pengembangan</span></div></header>
      <main id="main" className="mx-auto max-w-6xl py-8 page-x">
        <h1 className="text-2xl font-bold">Tur demo</h1>
        <p className="mt-1 max-w-3xl text-ink-muted">Alur utama untuk presentasi. Semua data fiktif; tindakan tetap tersimpan selama tab tidak dimuat ulang. Ganti peran tanpa kehilangan data dengan Keluar lalu masuk memakai akun demo.</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-demo-journeys>
          {DEMO_JOURNEYS.map((j, i) => (
            <li key={j.id} className="flex flex-col rounded-card border border-line bg-surface-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{i + 1} · {j.owner}</p>
              <h2 className="mt-1 font-semibold">{j.title}</h2>
              <ol className="mt-2 flex-1 list-decimal space-y-1 pl-5 text-sm text-ink-muted">{j.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              <a href={captureUrl(j.start.path, j.start.scenario, j.start.persona)} className="mt-3 inline-flex min-h-touch w-fit items-center gap-1 rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-forest">Mulai<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
            </li>
          ))}
        </ol>
        <h1 className="mt-12 text-2xl font-bold">Semua layar dan status</h1>
        <p className="mt-1 max-w-3xl text-ink-muted">Setiap tautan membuka komponen produksi dengan data fiktif dari skenario terkait. {SCREENS.length} layar, {SCREENS.reduce((n, s) => n + s.captures.length, 0)} status, {SCENARIOS.length} skenario.</p>
        {owners.map((o) => (
          <section key={o} className="mt-8" aria-labelledby={`own-${o}`}>
            <h2 id={`own-${o}`} className="mb-3 flex items-center gap-2 text-lg font-semibold"><Badge tone={OWNER_TONE[o]} icon={false}>{o}</Badge></h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {SCREENS.filter((s) => s.owner === o).map((s) => (
                <li key={s.screenId} className="rounded-card border border-line bg-surface-white p-4">
                  <p className="font-semibold"><span className="font-mono text-xs text-ink-subtle">{s.screenId}</span> {s.title}</p>
                  <p className="font-mono text-xs text-ink-subtle">{s.inertiaName} · {s.pattern}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {s.captures.map((c) => (
                      <li key={c.id}>
                        <a href={captureUrl(c.path ?? s.examplePath, c.scenario, c.persona)} className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line-strong px-3 text-xs font-semibold hover:border-brand-primary hover:text-brand-primary">
                          {c.label}{c.click ? ' ▸' : ''}<span className="text-ink-subtle">({captureViewports(s, c).join('/')})</span><ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}

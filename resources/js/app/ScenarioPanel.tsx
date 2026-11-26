import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FlaskConical, LayoutGrid, X } from 'lucide-react';
import type { MockHandle } from '@/services/mock/adapters';
import type { SimulationKind } from '@/services/mock/backend';
import type { PersonaId } from '@/services/mock/fixtures';
import { SCENARIOS } from '@/services/mock/scenarios';
import { useViewerState } from '@/state/viewer';
import { useToast } from '@/state/ui';
import { roleHome } from '@/routing/roleHome';
import { AppLink, useAppNavigate, useCurrentPath } from '@/routing/navigation';
import { cn } from '@/lib/utils';

const SIMULATIONS: { kind: SimulationKind; label: string }[] = [
  { kind: 'kyc_approve', label: 'Verifikasi disetujui' },
  { kind: 'counterpart_accepts', label: 'Calon menerima pengajuan' },
  { kind: 'own_pendamping_approves', label: 'Pendamping saya menyetujui' },
  { kind: 'other_pendamping_approves', label: 'Pendamping pihak lain menyetujui' },
  { kind: 'other_pendamping_declines', label: 'Pendamping pihak lain menolak' },
  { kind: 'counterpart_message', label: 'Calon mengirim pesan' },
  { kind: 'own_pendamping_withdraws', label: 'Pendamping saya mundur' },
  { kind: 'replacement_approved', label: 'Pendamping pengganti disetujui' },
];
const PERSONAS: { id: PersonaId; label: string }[] = [
  { id: 'participant', label: 'Peserta (Aisyah R.)' }, { id: 'pendamping', label: 'Pendamping (Ibu Fatimah S.)' },
  { id: 'moderator', label: 'Moderator (Dewi)' }, { id: 'admin', label: 'Admin (Rizal)' },
];

function loadScenario(scenario: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', scenario);
  url.searchParams.delete('persona');
  window.location.assign(url.toString());
}

/**
 * DEVELOPMENT/EXPORT-ONLY scenario switcher and event simulator. Never bundled into production
 * behaviour: bootstrap only renders it when VITE_ENABLE_SCENARIOS=true and mock adapters are active.
 */
export function ScenarioPanel({ mock, scenarioId }: { mock: MockHandle; scenarioId: string }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const v = useViewerState();
  const path = useCurrentPath();
  const navigate = useAppNavigate();
  const persona = mock.backend.world.persona;
  const current = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId), [scenarioId]);
  // Reserve room at the end of the page so the floating pill never sits over a page's last button.
  useEffect(() => {
    document.documentElement.dataset.devOverlay = 'true';
    return () => { delete document.documentElement.dataset.devOverlay; };
  }, []);

  return (
    <div className="fixed bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+12px)] right-3 z-[55] md:bottom-4" data-dev-panel>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="flex min-h-touch items-center gap-2 rounded-full border border-accent-amber/50 bg-accent-amber-soft px-4 text-sm font-semibold text-accent-amber-text shadow-raised">
          <FlaskConical className="h-4 w-4" aria-hidden />Skenario<span className="hidden max-w-[220px] truncate sm:inline">: {current?.title ?? scenarioId}</span><ChevronDown className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <section aria-label="Panel skenario pengembangan" className="w-[min(92vw,360px)] rounded-card border border-line bg-surface-white p-4 shadow-raised">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-accent-amber-text"><FlaskConical className="h-4 w-4" aria-hidden />Mode pengembangan</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup panel" className="inline-flex h-9 w-9 items-center justify-center rounded-control hover:bg-surface-canvas"><X className="h-4 w-4" aria-hidden /></button>
          </div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted" htmlFor="dev-scenario">Skenario</label>
          <select id="dev-scenario" value={scenarioId} onChange={(e) => loadScenario(e.target.value)} className="mb-1 min-h-touch w-full rounded-control border border-line-strong px-2 text-sm">
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          {current && <p className="mb-3 text-xs text-ink-muted">{current.description}</p>}
          <label className="mb-1 block text-xs font-semibold text-ink-muted" htmlFor="dev-persona">Masuk sebagai</label>
          <select id="dev-persona" aria-describedby="dev-persona-note" value={persona} onChange={(e) => {
            const p = e.target.value as PersonaId;
            // ponytail: keep demo state only in this tab until reload; real persistence belongs to the backend.
            mock.backend.world.persona = p;
            mock.backend.world.signedIn = true;
            v.reload();
            setOpen(false);
            navigate(`${roleHome([p])}?scenario=${scenarioId}&persona=${p}`);
          }} className="min-h-touch w-full rounded-control border border-line-strong px-2 text-sm">
            {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <p id="dev-persona-note" className="mb-3 mt-1 text-xs text-ink-muted">Data demo bertahan saat berganti peran di tab ini, sampai halaman dimuat ulang.</p>
          <p className="mb-1 text-xs font-semibold text-ink-muted">Simulasikan peristiwa server</p>
          <div className="mb-3 grid max-h-44 gap-1 overflow-y-auto">
            {SIMULATIONS.map((s) => (
              <button key={s.kind} type="button" onClick={() => toast(mock.backend.simulate(s.kind), 'info')} className="min-h-[36px] rounded-control border border-line px-2 text-left text-xs font-semibold hover:bg-surface-canvas">{s.label}</button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
            <AppLink to="/__layar" className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline"><LayoutGrid className="h-3.5 w-3.5" aria-hidden />Indeks layar</AppLink>
            <span className={cn('text-ink-subtle')}>{v.status === 'success' ? v.data.displayName : '—'} · {path}</span>
          </div>
        </section>
      )}
    </div>
  );
}

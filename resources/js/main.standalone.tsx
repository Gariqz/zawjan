import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Route } from 'react-router-dom';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/playfair-display/latin-600.css';
import './styles/app.css';
import { StandaloneApp } from './app/App';
import { captureViewports, SCREENS } from './app/screenRegistry';
import { bootstrapServices, readBootConfig } from './services/bootstrap';

/**
 * Standalone entry (Vite dev server, demo build, design export). The Laravel/Inertia entry lives in
 * integration/inertia/app.tsx.example and reuses the same providers and page registry.
 */
const root = createRoot(document.getElementById('root')!);

async function start() {
  const cfg = readBootConfig();
  const search = window.location.search;
  const chrome = new URLSearchParams(search).get('chrome');
  const boot = await bootstrapServices(cfg, search);
  let extraRoutes;
  let overlay;
  // Env literal (not cfg) so the dev tooling chunk is dropped from production builds.
  if (import.meta.env.VITE_ENABLE_SCENARIOS === 'true' && boot.mock && boot.scenariosEnabled) {
    const dev = await import('./app/devTools');
    if (chrome === 'export') document.documentElement.dataset.export = 'true';
    // Read by scripts/export-figma.mjs so the export always matches the shipped screen registry.
    (window as unknown as Record<string, unknown>).__ZAWJAN_SCREENS__ = SCREENS.map((s) => ({
      screenId: s.screenId, inertiaName: s.inertiaName, title: s.title, owner: s.owner, pattern: s.pattern, examplePath: s.examplePath,
      captures: s.captures.map((c) => ({ ...c, viewports: captureViewports(s, c) })),
    }));
    extraRoutes = <Route path="/__layar" element={<dev.ScreenIndexPage />} />;
    if (chrome !== 'export') overlay = <dev.ScenarioPanel mock={boot.mock} scenarioId={boot.scenarioId ?? ''} />;
  }
  root.render(
    <StrictMode>
      <StandaloneApp services={boot.services} extraRoutes={extraRoutes} overlay={overlay} />
    </StrictMode>,
  );
}

start().catch((e: unknown) => {
  root.render(
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 640 }}>
      <h1>Konfigurasi layanan tidak valid</h1>
      <p>{e instanceof Error ? e.message : String(e)}</p>
      <p>Build produksi menolak adapter tiruan. Hubungkan adapter Laravel/Inertia (lihat INTEGRATION_NOTES.md).</p>
    </main>,
  );
});

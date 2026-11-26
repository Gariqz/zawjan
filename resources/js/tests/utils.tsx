import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/app/App';
import { SCREENS } from '@/app/screenRegistry';
import { NotFoundPage } from '@/pages/system/SystemPages';
import { createMockServices } from '@/services/mock/adapters';
import type { PersonaId } from '@/services/mock/fixtures';

/** Renders the real route table at `path` against a fresh fictional mock world. */
export function renderScreen(path: string, scenario: string, persona?: PersonaId) {
  const mock = createMockServices({ scenarioId: scenario, ...(persona ? { persona } : {}), latencyMs: 0 });
  const utils = render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders services={mock.services}>
        <Routes>
          {SCREENS.flatMap((s) => [s.pattern, ...(s.alias ? [s.alias] : [])].map((path) => <Route key={path} path={path} element={<s.component />} />))}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  );
  return { ...utils, mock };
}

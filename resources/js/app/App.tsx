import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Services } from '@/services/interfaces';
import { ServicesProvider } from '@/services/registry';
import { ToastProvider } from '@/state/ui';
import { ViewerProvider } from '@/state/viewer';
import { NotFoundPage } from '@/pages/system/SystemPages';
import { SCREENS } from './screenRegistry';

/** Providers shared by the standalone harness and the Inertia entry. */
export function AppProviders({ services, children }: { services: Services; children: ReactNode }) {
  return (
    <ServicesProvider services={services}>
      <ViewerProvider>
        <ToastProvider>{children}</ToastProvider>
      </ViewerProvider>
    </ServicesProvider>
  );
}

/**
 * Standalone router for development, demos and design export. In Laravel/Inertia the server picks
 * the page by name instead (see INTEGRATION_NOTES.md); the page components are identical.
 */
export function StandaloneApp({ services, extraRoutes, overlay }: { services: Services; extraRoutes?: ReactNode; overlay?: ReactNode }) {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders services={services}>
        <Routes>
          {SCREENS.flatMap((s) => [s.pattern, ...(s.alias ? [s.alias] : [])].map((path) => <Route key={path} path={path} element={<s.component />} />))}
          {extraRoutes}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {overlay}
      </AppProviders>
    </BrowserRouter>
  );
}

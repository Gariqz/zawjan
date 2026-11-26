/**
 * The ONE switch between mock and real adapters (design.md §9.3).
 * Production builds refuse mocks and scenario selectors instead of silently falling back, and the
 * mock modules are loaded through a dynamic import behind a compile-time env literal, so fictional
 * fixtures are not even emitted into a production bundle.
 */
import type { Services } from './interfaces';
import { createInertiaServices } from './inertia/adapters';
import type { MockHandle } from './mock/adapters';
import type { PersonaId } from './mock/fixtures';

export interface BootConfig {
  serviceMode: 'mock' | 'http';
  allowMock: boolean;
  scenariosEnabled: boolean;
}

export function readBootConfig(): BootConfig {
  const env = import.meta.env;
  return {
    serviceMode: env.VITE_SERVICE_MODE === 'mock' ? 'mock' : 'http',
    allowMock: env.VITE_ALLOW_MOCK === 'true',
    scenariosEnabled: env.VITE_ENABLE_SCENARIOS === 'true',
  };
}

export interface Bootstrapped {
  services: Services;
  mock?: MockHandle;
  scenarioId?: string;
  persona?: PersonaId;
  scenariosEnabled: boolean;
}

export async function bootstrapServices(cfg: BootConfig, search: string): Promise<Bootstrapped> {
  if (cfg.serviceMode === 'mock') {
    if (!cfg.allowMock) throw new Error('Mock adapters are disabled for this build (VITE_ALLOW_MOCK != true).');
    if (import.meta.env.VITE_ALLOW_MOCK === 'true') {
      const { createMockSession } = await import('./mock/session');
      return createMockSession(cfg.scenariosEnabled, search);
    }
    throw new Error('Mock adapters are not compiled into this build.');
  }
  return { services: createInertiaServices(), scenariosEnabled: false };
}

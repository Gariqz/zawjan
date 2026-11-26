/** DEVELOPMENT/EXPORT ONLY. Loaded lazily by bootstrap.ts; never imported by production entries. */
import type { Bootstrapped } from '../bootstrap';
import { createMockServices } from './adapters';
import type { PersonaId } from './fixtures';
import { DEFAULT_SCENARIO, SCENARIOS } from './scenarios';

const PERSONAS: PersonaId[] = ['participant', 'pendamping', 'moderator', 'admin'];

export function createMockSession(scenariosEnabled: boolean, search: string): Bootstrapped {
  const params = scenariosEnabled ? new URLSearchParams(search) : new URLSearchParams();
  const requested = params.get('scenario') ?? DEFAULT_SCENARIO;
  const scenarioId = SCENARIOS.some((s) => s.id === requested) ? requested : DEFAULT_SCENARIO;
  const p = params.get('persona') as PersonaId | null;
  const persona = p && PERSONAS.includes(p) ? p : undefined;
  const latency = params.get('latency');
  const mock = createMockServices({ scenarioId, ...(persona ? { persona } : {}), ...(latency ? { latencyMs: Number(latency) } : {}) });
  return { services: mock.services, mock, scenarioId, persona: mock.backend.world.persona, scenariosEnabled };
}

/**
 * Entry point used by bootstrap.ts (http mode) and integration/inertia/app.tsx.example.
 *
 * Integration model: Inertia renders pages and owns the session cookie; screens load and mutate
 * data through JSON endpoints (services/http/endpoints.ts) using that same session + CSRF cookie.
 * Inertia page props only need the route key (`id`); there is no duplicate data channel to keep
 * in sync. See INTEGRATION_NOTES.md "Laravel/Inertia integration".
 */
import type { Services } from '../interfaces';
import { createHttpServices, type HttpServicesOptions } from '../http/adapters';

export type InertiaServicesOptions = HttpServicesOptions;

export function createInertiaServices(opts: InertiaServicesOptions = {}): Services {
  return createHttpServices(opts);
}

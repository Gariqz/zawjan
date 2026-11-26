import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapServices } from '@/services/bootstrap';
import { createMockServices } from '@/services/mock/adapters';
import { MockPlaintextCodec } from '@/services/mock/codec';
import { SCENARIOS } from '@/services/mock/scenarios';

describe('service bootstrap (single mock/real switch)', () => {
  beforeEach(() => vi.stubEnv('VITE_ALLOW_MOCK', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  it('refuses mock adapters when the build does not allow them', async () => {
    await expect(bootstrapServices({ serviceMode: 'mock', allowMock: false, scenariosEnabled: false }, '')).rejects.toThrow(/disabled/);
  });
  it('refuses mock adapters when they were not compiled in, even if runtime config asks', async () => {
    vi.stubEnv('VITE_ALLOW_MOCK', 'false');
    await expect(bootstrapServices({ serviceMode: 'mock', allowMock: true, scenariosEnabled: true }, '')).rejects.toThrow(/not compiled/);
  });
  it('production mode never exposes mock handles or scenario selection', async () => {
    const b = await bootstrapServices({ serviceMode: 'http', allowMock: false, scenariosEnabled: false }, '?scenario=active_four_member_chat&persona=admin');
    expect(b.mock).toBeUndefined();
    expect(b.scenariosEnabled).toBe(false);
    expect(b.services.mode).not.toBe('mock');
  });
  it('ignores ?scenario= when scenario selection is disabled', async () => {
    const b = await bootstrapServices({ serviceMode: 'mock', allowMock: true, scenariosEnabled: false }, '?scenario=underage');
    expect(b.scenarioId).not.toBe('underage');
  });
  it('honours ?scenario= and ?persona= in development', async () => {
    const b = await bootstrapServices({ serviceMode: 'mock', allowMock: true, scenariosEnabled: true }, '?scenario=underage&persona=moderator');
    expect(b.scenarioId).toBe('underage');
    expect(b.persona).toBe('moderator');
  });
  it('falls back to the default scenario for unknown ids', async () => {
    const b = await bootstrapServices({ serviceMode: 'mock', allowMock: true, scenariosEnabled: true }, '?scenario=does_not_exist');
    expect(SCENARIOS.some((s) => s.id === b.scenarioId)).toBe(true);
  });
});
describe('mock codec honesty', () => {
  it('does not claim reviewed end-to-end encryption', () => {
    expect(new MockPlaintextCodec().isReviewedE2EE).toBe(false);
    expect(createMockServices({ scenarioId: 'verified_browsing', latencyMs: 0 }).services.codec.isReviewedE2EE).toBe(false);
  });
  it('round-trips text and never lets viewers report their own messages', async () => {
    const { services } = createMockServices({ scenarioId: 'active_four_member_chat', latencyMs: 0 });
    const viewer = await services.auth.getViewer();
    const room = await services.conversations.getRoom('tar-rahman');
    if (!viewer.ok || !room.ok) throw new Error('mock call failed');
    const env = await services.codec.encodeForRoom(room.data, viewer.data.id, 'Halo, apa kabar?');
    const [view] = await services.codec.decodeForViewer([env], room.data, viewer.data.id);
    expect(view?.displayBody).toBe('Halo, apa kabar?');
    expect(view?.mayReport).toBe(false);
  });
});

describe('scenario catalogue', () => {
  it('every scenario builds a world with a viewer', async () => {
    for (const s of SCENARIOS) {
      if (['loading', 'service_error', 'network_offline', 'signed_out'].includes(s.id)) continue;
      const { services } = createMockServices({ scenarioId: s.id, latencyMs: 0 });
      const v = await services.auth.getViewer();
      expect(v.ok, s.id).toBe(true);
    }
  });
});

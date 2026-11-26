import { afterEach, describe, expect, it, vi } from 'vitest';
import { failureFromThrown } from '@/services/errors';
import { createHttpServices, pendingCodec } from '@/services/http/adapters';
import { createHttpClient, mapResponse } from '@/services/http/client';
import { API } from '@/services/http/endpoints';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('HTTP client error mapping', () => {
  afterEach(() => { document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'; });

  it('resolves NETWORK_ERROR when fetch rejects (never throws)', async () => {
    const http = createHttpClient({ fetch: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });
    await expect(http.get('/api/viewer')).resolves.toEqual({ ok: false, code: 'NETWORK_ERROR' });
  });
  it('resolves NETWORK_ERROR on timeout', async () => {
    const hang: typeof fetch = (_u, init) => new Promise((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))));
    const http = createHttpClient({ fetch: hang, timeoutMs: 5 });
    await expect(http.get('/api/viewer')).resolves.toEqual({ ok: false, code: 'NETWORK_ERROR' });
  });
  it('maps Laravel 422 errors to first-message field errors', () => {
    const r = mapResponse(422, { message: 'The given data was invalid.', errors: { email: ['Email wajib diisi.', 'x'] } });
    expect(r).toEqual({ ok: false, code: 'VALIDATION_ERROR', fieldErrors: { email: 'Email wajib diisi.' } });
  });
  it('honours an explicit Zawjan error code and its message', () => {
    expect(mapResponse(403, { code: 'IDENTITY_PENDING', message: 'Tunggu verifikasi.' })).toEqual({ ok: false, code: 'IDENTITY_PENDING', message: 'Tunggu verifikasi.' });
  });
  it('hides framework default messages', () => {
    expect(mapResponse(401, { message: 'Unauthenticated.' })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(mapResponse(419, { message: 'CSRF token mismatch.' })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(mapResponse(503, { message: 'Service Unavailable' })).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
  });
  it('unwraps { data } envelopes, accepts 204 and rejects HTML fallbacks', async () => {
    expect(mapResponse(200, { data: { a: 1 } })).toEqual({ ok: true, data: { a: 1 } });
    const f = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    const http = createHttpClient({ fetch: f });
    expect(await http.post('/logout')).toEqual({ ok: true, data: undefined });
    expect(await http.get('/api/viewer')).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
  });
  it('sends the session cookie policy and the XSRF token on mutations', async () => {
    document.cookie = 'XSRF-TOKEN=abc%3D%3D';
    const f = vi.fn().mockResolvedValue(json(200, { data: {} }));
    await createHttpClient({ fetch: f }).post('/api/reports', { a: 1 });
    const init = f.mock.calls[0]![1] as RequestInit;
    expect(init.credentials).toBe('same-origin');
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('abc==');
    expect(init.body).toBe('{"a":1}');
  });
});

describe('HTTP service adapters', () => {
  it('login posts credentials then reads the viewer; logout posts to /logout', async () => {
    const viewer = { id: 'u-1', roles: ['participant'] };
    const f = vi.fn(async (url: string) => (url === API.login ? new Response(null, { status: 204 }) : url === API.logout ? new Response(null, { status: 204 }) : json(200, { data: viewer })));
    const s = createHttpServices({ fetch: f as unknown as typeof fetch });
    expect(await s.auth.login({ email: 'a@b.id', password: 'x' })).toEqual({ ok: true, data: viewer });
    expect(f.mock.calls.map((c) => c[0])).toEqual([API.login, API.viewer]);
    expect((await s.auth.logout()).ok).toBe(true);
    expect(f.mock.calls.at(-1)![0]).toBe(API.logout);
  });
  it('does not call the viewer endpoint when login fails', async () => {
    const f = vi.fn().mockResolvedValue(json(422, { message: 'x', errors: { email: ['Email atau kata sandi tidak sesuai.'] } }));
    const s = createHttpServices({ fetch: f });
    const r = await s.auth.login({ email: 'a@b.id', password: 'x' });
    expect(r.ok ? 'ok' : r.code).toBe('VALIDATION_ERROR');
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('keeps mock-only discovery preferences and consent off the network', async () => {
    const f = vi.fn();
    const { candidates } = createHttpServices({ fetch: f });
    const unavailable = { ok: false, code: 'SERVICE_UNAVAILABLE' };
    expect(await candidates.browse({ ageMin: 25, region: 'Bandung' })).toEqual(unavailable);
    expect(await candidates.getVisibility()).toEqual(unavailable);
    expect(await candidates.setVisibility({ visible: true, consent: true })).toEqual(unavailable);
    expect(f).not.toHaveBeenCalled();
  });
  it('the pending codec refuses to run and maps to SERVICE_UNAVAILABLE, never claiming E2EE', async () => {
    expect(pendingCodec.isReviewedE2EE).toBe(false);
    const err = await pendingCodec.decodeForViewer([], {} as never, 'u').catch((e: unknown) => e);
    expect(failureFromThrown(err)).toEqual({ ok: false, code: 'SERVICE_UNAVAILABLE' });
  });
});

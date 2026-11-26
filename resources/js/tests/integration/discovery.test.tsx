import { createEvent, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { participantCopy as pc } from '@/content/id/participant';
import type { DiscoveryConsent } from '@/domain/types';
import { createMockServices } from '@/services/mock/adapters';
import { renderScreen } from '../utils';

const c = pc.catalog;
const v = c.visibility;

describe('Jelajahi', () => {
  it('shows one profile on the legacy route and keeps navigation separate from requests', async () => {
    const user = userEvent.setup();
    const { container, mock } = renderScreen('/katalog', 'verified_browsing');
    const ids = mock.backend.world.taaruf.map((t) => t.id);
    const previous = await screen.findByRole('button', { name: c.previous });
    const next = screen.getByRole('button', { name: c.next });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('heading', { name: 'Rahman F.' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Yusuf A.' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: c.viewCv })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: c.title }).some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
    next.focus();
    await user.keyboard('{Enter}');
    expect(next).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Yusuf A.' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Rahman F.' })).not.toBeInTheDocument();
    await user.click(previous);
    expect(screen.getByRole('heading', { name: 'Rahman F.' })).toBeVisible();
    expect(screen.queryByRole('button', { name: c.request })).not.toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(mock.backend.world.taaruf.map((t) => t.id)).toEqual(ids);
  });

  it('swipes vertically without intercepting scroll, focus, links or horizontal movement', async () => {
    const { mock } = renderScreen('/jelajahi', 'verified_browsing');
    const ids = mock.backend.world.taaruf.map((t) => t.id);
    const rahman = await screen.findByRole('article', { name: 'Rahman F.' });
    const next = screen.getByRole('button', { name: c.next });
    next.focus();
    const touch = (clientX: number, clientY: number) => ({ identifier: 1, clientX, clientY });
    const swipe = (target: HTMLElement, x: number, y: number, scrolled = false) => {
      const start = touch(100, 150);
      const end = touch(x, y);
      const evt = createEvent.touchStart(target, { touches: [start] });
      expect(fireEvent(target, evt)).toBe(true);
      const originalScroll = window.scrollY;
      try {
        if (scrolled) Object.defineProperty(window, 'scrollY', { configurable: true, value: originalScroll + 5 });
        expect(fireEvent.touchMove(target, { touches: [end] })).toBe(true);
        expect(fireEvent.touchEnd(target, { touches: [], changedTouches: [end] })).toBe(true);
      } finally {
        if (scrolled) Object.defineProperty(window, 'scrollY', { configurable: true, value: originalScroll });
      }
    };
    const strip = screen.getByText(c.swipeHint);
    swipe(within(rahman).getByRole('link'), 100, 50);
    swipe(rahman, 100, 50);
    swipe(strip, 220, 140);
    swipe(strip, 100, 50, true);
    expect(rahman).toBeVisible();
    swipe(strip, 100, 50);
    expect(await screen.findByRole('article', { name: 'Yusuf A.' })).toBeVisible();
    swipe(strip, 100, 250);
    expect(await screen.findByRole('article', { name: 'Rahman F.' })).toBeVisible();
    expect(next).toHaveFocus();
    expect(mock.backend.world.taaruf.map((t) => t.id)).toEqual(ids);
  });

  it('uses private preferences without adding them to the URL or revealing extra fields', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/jelajahi?scenario=verified_browsing', 'verified_browsing');
    const trigger = await screen.findByRole('button', { name: c.filters });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('searchbox')).not.toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: c.region }), 'Bogor');
    await user.click(within(dialog).getByRole('button', { name: c.applyFilters }));
    expect(trigger).toHaveFocus();
    const link = await screen.findByRole('link', { name: c.viewCv });
    expect(link).toHaveAttribute('href', '/calon/cand-fikri?scenario=verified_browsing');
    expect(screen.getByRole('heading', { name: 'Fikri S.' })).toBeVisible();
    expect(screen.getByRole('button', { name: c.next })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Dokter hewan')).not.toBeInTheDocument();
    const preview = await mock.services.candidates.browse({ ageMin: 30, region: 'Bogor' });
    expect(preview).toEqual({ ok: true, data: { items: [{
      id: 'cand-fikri', displayName: 'Fikri S.', age: 30, region: 'Bogor',
      introduction: 'Menyayangi hewan, gemar bersepeda, dan ingin membangun rumah tangga yang tenang.',
    }] } });
  });

  it('requires explicit opt-in on CV Saya and lets the participant hide it again', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/cv-saya', 'verified_browsing');
    expect(await screen.findByText(v.hidden)).toBeVisible();
    const show = screen.getByRole('button', { name: v.show });
    const check = screen.getByRole('checkbox', { name: v.consent });
    expect(check).not.toBeChecked();
    expect(show).toBeDisabled();
    await user.click(check);
    await user.click(show);
    expect(await screen.findByText(v.visible)).toBeVisible();
    expect(mock.backend.world.discoveryOptIn).toBe(true);
    await user.click(screen.getByRole('button', { name: v.hide }));
    expect(await screen.findByText(v.hidden)).toBeVisible();
    expect(screen.getByRole('checkbox', { name: v.consent })).not.toBeChecked();
    expect(mock.backend.world.discoveryOptIn).toBe(false);
  });

  it('rejects missing consent and hides opted-out people from new discovery and requests', async () => {
    const { backend, services } = createMockServices({ scenarioId: 'verified_browsing', latencyMs: 0 });
    expect(await services.candidates.setVisibility({ visible: true } as DiscoveryConsent)).toEqual({ ok: false, code: 'VALIDATION_ERROR' });
    expect(await services.candidates.getVisibility()).toEqual({ ok: true, data: { visible: false } });
    expect(await services.candidates.getDetail('cand-arif')).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await services.introductions.request('cand-arif')).toEqual({ ok: false, code: 'NOT_FOUND' });
    const yusuf = backend.world.candidates.find((candidate) => candidate.summary.id === 'cand-yusuf')!;
    yusuf.discoveryOptIn = false;
    const list = await services.candidates.browse({});
    expect(list.ok && list.data.items).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'cand-yusuf' })]));
    const detail = await services.candidates.getDetail('cand-yusuf');
    expect(detail.ok && detail.data.relation).toBe('pending_incoming');
    expect(detail.ok && detail.data.lockedSections).not.toHaveLength(0);
  });

  it('keeps candidate detail photo-free even if the mock has a separately authorized photo', async () => {
    const { container, mock } = renderScreen('/calon/cand-rahman', 'photo_authorized');
    expect(await screen.findByText(pc.candidate.photoNote)).toBeVisible();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('link', { name: pc.candidate.report })).toBeVisible();
    expect(screen.getByRole('button', { name: pc.candidate.block })).toBeVisible();
    const detail = await mock.services.candidates.getDetail('cand-rahman');
    if (!detail.ok) throw new Error(detail.code);
    expect(detail.data).not.toHaveProperty('authorizedPhotoUrl');
    expect(detail.data.capabilities.canViewProtectedPhoto).toBe(false);
  });
});

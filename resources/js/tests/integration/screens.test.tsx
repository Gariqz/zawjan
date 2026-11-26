import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderScreen } from '../utils';

describe('PAR-06 conversation', () => {
  it('shows the development notice instead of an E2EE claim, and sends a message', async () => {
    const user = userEvent.setup();
    renderScreen('/taaruf/tar-rahman/obrolan', 'active_four_member_chat');
    expect(await screen.findByText(/Pesan tidak dienkripsi/)).toBeInTheDocument();
    expect(screen.queryByText(/end-to-end/i)).not.toBeInTheDocument();
    const box = screen.getByLabelText(/pesan/i, { selector: 'textarea' });
    await user.type(box, 'Semoga Allah mudahkan.');
    await user.keyboard('{Enter}');
    const log = screen.getByRole('log');
    await waitFor(() => expect(within(log).getByText('Semoga Allah mudahkan.')).toBeInTheDocument());
    expect(box).toHaveValue('');
  });

  it('locks the composer until both pendamping approve', async () => {
    renderScreen('/taaruf/tar-rahman/obrolan', 'two_pendamping_waiting');
    await screen.findByRole('status');
    expect(screen.queryByRole('textbox', { name: /pesan/i })).not.toBeInTheDocument();
  });
});

describe('PAR-10 report flow', () => {
  it('requires a category, then reviews and submits only the chosen evidence', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman&subjek=cand-rahman', 'active_four_member_chat');
    await user.click(await screen.findByRole('button', { name: 'Tinjau laporan' }));
    expect(screen.getByText('Pilih kategori laporan.')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Permintaan uang atau penipuan'));
    await user.click(screen.getByRole('button', { name: 'Tinjau laporan' }));
    expect(screen.getByText('Tanpa bukti pesan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /kirim laporan/i }));
    expect(await screen.findByText('Laporan diterima')).toBeInTheDocument();
    expect(mock.backend.world.reportCases[0]?.evidence).toEqual([]);
    expect(mock.backend.world.taaruf.find((x) => x.id === 'tar-rahman')?.conversationStatus).toBe('frozen_reported');
  });
});

describe('PAR-03 → request dialog', () => {
  it('confirms before sending a ta\'aruf request', async () => {
    const user = userEvent.setup();
    renderScreen('/calon/cand-fikri', 'verified_browsing');
    await user.click((await screen.findAllByRole('button', { name: "Ajukan Ta'aruf" }))[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Fikri/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: "Ajukan Ta'aruf" }));
    expect(await screen.findByText('Pengajuan terkirim.')).toBeInTheDocument();
  });
});

describe('GUA-03 pendamping approval', () => {
  it('records approval after explicit confirmation', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/pendamping/persetujuan/tar-rahman', 'two_pendamping_waiting', 'pendamping');
    await user.click(await screen.findByRole('button', { name: "Setujui ta'aruf" }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: "Setujui ta'aruf" }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const t = mock.backend.world.taaruf.find((x) => x.id === 'tar-rahman');
    expect([t?.approvalA, t?.approvalB]).toContain('approved');
  });
});

describe('role guards (UX only; backend must also authorize)', () => {
  it('a participant cannot open moderator screens', async () => {
    renderScreen('/moderator', 'verified_browsing');
    expect(await screen.findByText(/akses/i, { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /navigasi utama/i })).not.toBeInTheDocument();
  });
  it('a moderator sees the queue overview', async () => {
    renderScreen('/moderator', 'verified_browsing', 'moderator');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('every registered screen renders its first capture without crashing', async () => {
  const { SCREENS } = await import('@/app/screenRegistry');
  it.each(SCREENS.map((s) => [s.screenId, s] as const))('%s', async (_id, s) => {
    const c = s.captures[0]!;
    const { container } = renderScreen(c.path ?? s.examplePath, c.scenario, c.persona);
    await waitFor(() => expect(container.querySelector('.skeleton')).toBeNull());
    expect(container.textContent?.length ?? 0).toBeGreaterThan(20);
  });
});

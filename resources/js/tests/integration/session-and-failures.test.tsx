import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderScreen } from '../utils';

describe('logout through AuthService', () => {
  it('ends the session, shows the login page, and demo sign-in switches persona', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/akun', 'verified_browsing');
    const buttons = await screen.findAllByRole('button', { name: 'Keluar' });
    await user.click(buttons.at(-1)!);
    expect(await screen.findByText('Anda telah keluar. Sampai jumpa kembali.')).toBeInTheDocument();
    expect(mock.backend.world.signedIn).toBe(false);
    await user.click(screen.getByRole('button', { name: /Ibu Fatimah S\./ }));
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => expect(mock.backend.world.persona).toBe('pendamping'));
    expect((await screen.findAllByText('Ibu Fatimah S.')).length).toBeGreaterThan(0);
    expect(mock.backend.world.signedIn).toBe(true);
  });
  it('stays signed in and says so when the logout request fails', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/akun', 'verified_browsing');
    const buttons = await screen.findAllByRole('button', { name: 'Keluar' });
    mock.backend.world.failMode = 'network';
    await user.click(buttons.at(-1)!);
    expect(await screen.findByText('Gagal keluar. Periksa koneksi Anda, lalu coba lagi.')).toBeInTheDocument();
    expect(mock.backend.world.signedIn).toBe(true);
    expect(screen.queryByText('Masuk ke Zawjan')).not.toBeInTheDocument();
  });
  it('a signed-out visitor on a protected page is asked to sign in', async () => {
    renderScreen('/beranda', 'signed_out');
    expect(await screen.findByText('Sesi Anda telah berakhir. Silakan masuk kembali.', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', expect.stringContaining('/masuk?alasan=sesi-berakhir'));
  });
});

describe('rejected promises and network failures', () => {
  it('a rejected query renders the connection error with retry, not a crash', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/beranda', 'network_offline');
    expect(await screen.findByText('Tidak dapat terhubung')).toBeInTheDocument();
    mock.backend.world.failMode = undefined;
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect(screen.queryByText('Tidak dapat terhubung')).not.toBeInTheDocument());
  });
  it('a rejected mutation shows an inline error and re-enables the action', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/pendamping/persetujuan/tar-rahman', 'two_pendamping_waiting', 'pendamping');
    await user.click(await screen.findByRole('button', { name: "Setujui ta'aruf" }));
    const dialog = await screen.findByRole('dialog');
    mock.backend.world.failMode = 'network';
    const confirm = Array.from(dialog.querySelectorAll('button')).find((b) => /setuju/i.test(b.textContent ?? ''))!;
    await user.click(confirm);
    expect(await screen.findByText(/Periksa koneksi internet Anda/)).toBeInTheDocument();
    expect(mock.backend.world.taaruf.find((t) => t.id === 'tar-rahman')?.approvalA).toBe('pending');
  });
});

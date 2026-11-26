/**
 * design.md §13 acceptance checklist (T01–T24), exercised against the real route table and the
 * fictional mock backend. These are frontend/contract checks; backend authorisation, real e-KYC and
 * the cryptographic protocol need their own testing (see INTEGRATION_NOTES.md).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { participantCopy as pc } from '@/content/id/participant';
import { ROUTES } from '@/routing/routes';
import { NetworkError, ServiceError } from '@/services/errors';
import { createMockServices } from '@/services/mock/adapters';
import { renderScreen } from '../utils';

const composer = () => screen.queryByRole('textbox', { name: pc.chat.composerLabel });

describe('§13 acceptance', () => {
  it('requires a single-line other reason and does not freeze a room for a profile report', async () => {
    const user = userEvent.setup();
    const { mock, unmount } = renderScreen('/laporan/baru?subjek=cand-rahman&akhiri=1', 'active_four_member_chat');
    const submit = vi.spyOn(mock.services.safety, 'submitReport');
    const input = { subjectUserId: 'cand-rahman', category: 'other' as const, description: '', evidence: [], alsoExit: true };
    const other = await screen.findByLabelText(pc.report.categories.other);
    for (const otherReason of ['', 'dua\nbaris', 'x'.repeat(101)]) {
      expect(await mock.services.safety.submitReport({ ...input, otherReason })).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    }
    await user.click(other);
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.getByRole('textbox', { name: /Alasan lain/ })).toHaveFocus();
    await user.type(screen.getByRole('textbox', { name: /Alasan lain/ }), 'Keterangan profil menyesatkan');
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.getByText('Keterangan profil menyesatkan')).toBeInTheDocument();
    expect(screen.queryByText('Setelah dikirim')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    await screen.findByText(pc.report.successTitle);
    expect(submit.mock.lastCall?.[0]).toEqual({ ...input, alsoExit: false, otherReason: 'Keterangan profil menyesatkan' });
    expect(screen.queryByText(/Percakapan dibekukan/)).not.toBeInTheDocument();
    expect(await mock.services.conversations.getRoom('tar-rahman')).toMatchObject({ ok: true, data: { conversationStatus: 'active', exclusiveReservation: true } });
    expect(await mock.services.safety.submitReport(input)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(await mock.services.safety.submitReport({ ...input, roomId: 'tar-rahman', subjectUserId: 'cand-fikri', otherReason: 'x' })).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    unmount();
    mock.backend.world.persona = 'moderator';
    const cases = await mock.services.moderator.listReports({ status: 'open' });
    const report = cases.ok && cases.data.items.find((item) => item.category === 'other');
    if (!report) throw new Error('Laporan tidak muncul di antrean moderator');
    expect(await mock.services.moderator.getReportEvidence(report.id)).toMatchObject({ ok: true, data: { otherReason: 'Keterangan profil menyesatkan', evidence: [] } });
  });
  it('T01 under-19 account cannot browse; age explanation shown', async () => {
    renderScreen('/katalog', 'underage');
    expect(await screen.findByText(pc.catalog.gateTitle)).toBeInTheDocument();
    expect(screen.getByText(/19 tahun ke atas/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: pc.catalog.viewCv })).not.toBeInTheDocument();
  });

  it('T02 KYC unavailable: catalog locked, profile editing still available', async () => {
    const { unmount } = renderScreen('/katalog', 'kyc_unavailable');
    expect(await screen.findByText(pc.catalog.gateTitle)).toBeInTheDocument();
    unmount();
    renderScreen('/cv-saya', 'kyc_unavailable');
    expect(await screen.findByRole('button', { name: 'Ubah CV' })).toBeEnabled();
  });

  it('T03 unverified pendamping cannot accept an appointment', async () => {
    const { services } = createMockServices({ scenarioId: 'pendamping_unverified', latencyMs: 0 });
    const r = await services.pendamping.acceptInvitation('inv-1');
    expect(r.ok).toBe(false);
    renderScreen('/pendamping/undangan/inv-1', 'pendamping_unverified');
    await screen.findAllByText(/verifikasi/i);
    const btn = screen.queryByRole('button', { name: /terima/i });
    if (btn) expect(btn).toBeDisabled();
  });

  it('T05 sent request is pending and there is no chat yet', async () => {
    const { unmount } = renderScreen('/taaruf/pengajuan?tab=outgoing', 'pending_request');
    expect(await screen.findByText(/Rahman/)).toBeInTheDocument();
    unmount();
    renderScreen('/taaruf/tar-rahman/obrolan', 'pending_request');
    await waitFor(() => expect(document.querySelector('.skeleton')).toBeNull());
    expect(composer()).not.toBeInTheDocument();
  });

  it('T06 accepting creates a reservation awaiting both pendamping; composer absent', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/taaruf/pengajuan', 'verified_browsing');
    await user.click((await screen.findAllByRole('button', { name: pc.requests.accept }))[0]!);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: pc.requests.acceptConfirm }));
    expect(await screen.findByText(pc.requests.accepted)).toBeInTheDocument();
    const reserved = mock.backend.world.taaruf.filter((t) => t.exclusiveReservation);
    expect(reserved).toHaveLength(1);
    const room = await mock.services.conversations.getRoom(reserved[0]!.id);
    expect(room.ok && room.data.capabilities.canSendMessage).toBe(false);
  });

  it('T07 concurrent acceptance loses neutrally; no second exclusive session', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/taaruf/pengajuan', 'simultaneous_acceptance_conflict');
    await user.click((await screen.findAllByRole('button', { name: pc.requests.accept }))[0]!);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: pc.requests.acceptConfirm }));
    expect(await screen.findByText(/sedang menjalani proses ta'aruf lain/)).toBeInTheDocument();
    expect(screen.queryByText(/ditolak/i)).not.toBeInTheDocument();
    expect(mock.backend.world.taaruf.filter((t) => t.exclusiveReservation).length).toBeLessThanOrEqual(1);
  });

  it('T08 one pendamping approved: tracker 1 dari 2, chat still locked', async () => {
    const { unmount } = renderScreen('/taaruf/tar-rahman/persetujuan', 'one_approved');
    expect(await screen.findByText(pc.approvals.count(1))).toBeInTheDocument();
    unmount();
    renderScreen('/taaruf/tar-rahman/obrolan', 'one_approved');
    expect(await screen.findAllByText(pc.chat.disabled.locked)).not.toHaveLength(0);
    expect(composer()).not.toBeInTheDocument();
  });

  it('T09 both approved: four members listed, sending enabled by capability', async () => {
    renderScreen('/taaruf/tar-rahman/obrolan', 'active_four_member_chat');
    expect(await screen.findByRole('textbox', { name: pc.chat.composerLabel })).toBeInTheDocument();
    const roster = screen.getAllByRole('heading', { name: pc.chat.members })[0]!.parentElement!;
    expect(within(roster).getAllByRole('listitem')).toHaveLength(4);
  });

  it('T10 pendamping declines: request cancelled, reservation released, user informed', async () => {
    const { mock } = renderScreen('/taaruf/tar-rahman/persetujuan', 'guardian_declines');
    expect(await screen.findByText(pc.approvals.declined)).toBeInTheDocument();
    expect(mock.backend.world.taaruf.some((t) => t.exclusiveReservation)).toBe(false);
  });

  it('T11 pendamping withdraws: room paused, composer disabled, replacement path shown', async () => {
    renderScreen('/taaruf/tar-rahman/obrolan', 'guardian_withdrawn');
    expect(await screen.findByText(pc.chat.disabled.paused_guardian_missing)).toBeInTheDocument();
    expect(composer()).not.toBeInTheDocument();
    const { services } = createMockServices({ scenarioId: 'guardian_withdrawn', latencyMs: 0 });
    const v = await services.auth.getViewer();
    expect(v.ok && v.data.pendampingStatus).not.toBe('accepted');
  });

  it('T12 replacement pendamping sees only messages from their authorisation onward', async () => {
    const { services, backend } = createMockServices({ scenarioId: 'replacement_pendamping', latencyMs: 0 });
    const room = await services.conversations.getRoom('tar-rahman');
    const msgs = await services.conversations.listEncryptedMessages('tar-rahman');
    if (!room.ok || !msgs.ok) throw new Error('mock call failed');
    const self = room.data.members.find((m) => m.accountId === backend.viewer().id);
    expect(self?.authorizedFrom).toBeTruthy();
    expect(msgs.data.every((m) => m.sentAt >= self!.authorizedFrom!)).toBe(true);
    renderScreen('/pendamping/taaruf/tar-rahman', 'replacement_pendamping');
    expect(await screen.findByText(/sejak/i)).toBeInTheDocument();
  });

  it('T13 revoking a photo grant reverts the recipient view to hidden', async () => {
    const { services } = createMockServices({ scenarioId: 'photo_authorized', latencyMs: 0 });
    const before = await services.photos.getOverview();
    if (!before.ok) throw new Error('mock call failed');
    const grant = before.data.grants.find((g) => g.status === 'active')!;
    const after = await services.photos.revoke(grant.id);
    expect(after.ok && after.data.grants.find((g) => g.id === grant.id)?.status).toBe('revoked');
    renderScreen('/privasi', 'photo_revoked');
    expect(await screen.findAllByText(/dicabut/i)).not.toHaveLength(0);
  });

  it('T14 moderator sees only the evidence the reporter selected; no read-all capability', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman&subjek=cand-rahman', 'active_four_member_chat');
    await user.click(await screen.findByLabelText(pc.report.categories.harassment));
    const [chosen, unchosen] = mock.backend.world.messages;
    await user.click((await screen.findByText(chosen!.body)).closest('label')!);
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.getByText(chosen!.body)).toBeInTheDocument();
    expect(screen.queryByText(unchosen!.body)).not.toBeInTheDocument();
    expect(screen.getByText('Ruang dibekukan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    await screen.findByText(pc.report.successTitle);
    expect(await mock.services.conversations.getRoom('tar-rahman')).toMatchObject({ ok: true, data: { conversationStatus: 'frozen_reported' } });
    const caseId = mock.backend.world.reportCases[0]!.id;
    const asMod = createMockServices({ scenarioId: 'verified_browsing', persona: 'moderator', latencyMs: 0 });
    asMod.backend.world.reportCases = mock.backend.world.reportCases;
    const detail = await asMod.services.moderator.getReportEvidence(caseId);
    expect(detail.ok && detail.data.evidence.map(({ messageId, body }) => ({ messageId, body }))).toEqual([{ messageId: chosen!.id, body: chosen!.body }]);
    const modApi = Object.keys(asMod.services.moderator).join(' ');
    expect(modApi).not.toMatch(/decrypt|messages|history|room/i);
  });

  it('assigned pendamping can report from room safety menu with only authorized evidence and no exit', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/pendamping/taaruf/tar-rahman', 'replacement_pendamping');
    const submit = vi.spyOn(mock.services.safety, 'submitReport');
    const [older, chosen] = [mock.backend.world.messages[0]!, mock.backend.world.messages.at(-1)!];
    await user.click(await screen.findByRole('button', { name: pc.chat.safety }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: pc.chat.report }));
    await user.click(await screen.findByLabelText(pc.report.categories.harassment));
    expect(screen.queryByRole('button', { name: pc.chat.exit })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: pc.report.alsoExit })).not.toBeInTheDocument();
    expect(screen.queryByText(older.body)).not.toBeInTheDocument();
    await user.click((await screen.findByText(chosen.body)).closest('label')!);
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.getByText('Ruang dibekukan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    await screen.findByText(pc.report.successTitle);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ roomId: 'tar-rahman', subjectUserId: 'cand-rahman', alsoExit: false, evidence: [expect.objectContaining({ messageId: chosen.id, body: chosen.body })] }));
    const receipt = screen.getByText(pc.report.successTitle).closest('[role="status"]')! as HTMLElement;
    expect(within(receipt).getByRole('link', { name: 'Ke beranda' })).toHaveAttribute('href', ROUTES.guardianHome);
    expect(within(receipt).getByRole('link', { name: 'Pendampingan' })).toHaveAttribute('href', ROUTES.guardianAssignments);
  });

  it('rejects an unassigned pendamping room report before loading evidence', async () => {
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman', 'guardian_withdrawn', 'pendamping');
    const list = vi.spyOn(mock.services.conversations, 'listEncryptedMessages');
    expect(await screen.findByText(/tidak ditemukan|tidak tersedia|akses/i, { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: pc.report.review })).not.toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it.each(['pending_request', 'conversation_ended'])('reports from %s without promising a room change', async (scenario) => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman&akhiri=1', scenario);
    const submit = vi.spyOn(mock.services.safety, 'submitReport');
    await user.click(await screen.findByLabelText(pc.report.categories.harassment));
    const before = await mock.services.conversations.getRoom('tar-rahman');
    expect(screen.queryByRole('button', { name: pc.chat.exit })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.queryByText('Setelah dikirim')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    await screen.findByText(pc.report.successTitle);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ alsoExit: false }));
    expect(await mock.services.conversations.getRoom('tar-rahman')).toEqual(before);
  });

  it('T15 a participant can exit unilaterally; lock released immediately', async () => {
    const { services, backend } = createMockServices({ scenarioId: 'active_four_member_chat', latencyMs: 0 });
    const r = await services.conversations.exit('tar-rahman');
    expect(r.ok).toBe(true);
    const t = backend.world.taaruf.find((x) => x.id === 'tar-rahman')!;
    expect(t.conversationStatus).toBe('ended');
    expect(t.exclusiveReservation).toBe(false);
  });

  it('T16 blocked candidate is gone from Jelajahi and direct URL', async () => {
    const { services } = createMockServices({ scenarioId: 'blocked_user', latencyMs: 0 });
    const s = await services.candidates.browse({});
    if (!s.ok) throw new Error(s.code);
    expect(s.data.items.some((c) => c.id === 'cand-yusuf')).toBe(false);
    renderScreen('/calon/cand-yusuf', 'blocked_user');
    expect(await screen.findByText(/tidak ditemukan|tidak tersedia/i, { selector: 'h2' })).toBeInTheDocument();
  });

  it('T17 ended room is read-only and post-closure reporting remains', async () => {
    const { unmount } = renderScreen('/taaruf/tar-rahman/obrolan', 'conversation_ended');
    expect(await screen.findByText(pc.chat.disabled.ended)).toBeInTheDocument();
    expect(composer()).not.toBeInTheDocument();
    unmount();
    renderScreen('/riwayat-taaruf', 'conversation_ended');
    expect(await screen.findAllByRole('link', { name: /laporkan/i })).not.toHaveLength(0);
  });

  it('T18 wrong role or revoked staff capability cannot open protected screens', async () => {
    const a = renderScreen('/admin', 'verified_browsing', 'moderator');
    expect(await screen.findByText(/akses/i, { selector: 'h2' })).toBeInTheDocument();
    a.unmount();
    const b = renderScreen('/moderator', 'permission_denied');
    expect(await screen.findByText(/akses/i, { selector: 'h2' })).toBeInTheDocument();
    b.unmount();
    renderScreen('/masuk?alasan=sesi-berakhir', 'verified_browsing');
    const statuses = await screen.findAllByRole('status');
    expect(statuses.some((s) => /Sesi Anda telah berakhir/.test(s.textContent ?? ''))).toBe(true);
  });

  it('T20 moderator actions open by keyboard; queue shows no identity images', async () => {
    const user = userEvent.setup();
    const q = renderScreen('/moderator/verifikasi', 'verified_browsing', 'moderator');
    await screen.findByRole('table');
    expect(q.container.querySelectorAll('img')).toHaveLength(0);
    q.unmount();
    renderScreen('/moderator/laporan/rc-201', 'verified_browsing', 'moderator');
    const btn = await screen.findByRole('button', { name: 'Tangguhkan akun' });
    btn.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('T21 page modules never import mock adapters directly', () => {
    const sources = import.meta.glob(['/resources/js/modules/**/*.tsx', '/resources/js/pages/**/*.tsx', '/resources/js/components/**/*.tsx', '/resources/js/layouts/**/*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    expect(Object.keys(sources).length).toBeGreaterThan(30);
    const offenders = Object.entries(sources).filter(([, src]) => /from ['"][^'"]*services\/mock/.test(src)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });

  it('T22 error and rate-limited states offer recovery', async () => {
    const user = userEvent.setup();
    const a = renderScreen('/beranda', 'service_error');
    expect(await screen.findByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
    a.unmount();
    renderScreen('/calon/cand-fikri', 'rate_limited');
    await user.click((await screen.findAllByRole('button', { name: pc.catalog.request }))[0]!);
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: pc.requestConfirm.confirm }));
    expect(await within(screen.getByRole('dialog')).findByText(/tunggu|coba lagi/i)).toBeInTheDocument();
  });

  it.each(['retrieval failure', 'retrieval rejection', 'decoder rejection'])('keeps report and immediate safe exit on evidence %s', async (failure) => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman&akhiri=1', 'active_four_member_chat');
    const submit = vi.spyOn(mock.services.safety, 'submitReport');
    if (failure === 'decoder rejection') vi.spyOn(mock.services.codec, 'decodeForViewer').mockRejectedValue(new ServiceError('SERVICE_UNAVAILABLE'));
    else if (failure === 'retrieval rejection') vi.spyOn(mock.services.conversations, 'listEncryptedMessages').mockRejectedValue(new NetworkError());
    else vi.spyOn(mock.services.conversations, 'listEncryptedMessages').mockResolvedValue({ ok: false, code: 'SERVICE_UNAVAILABLE' });
    expect(await screen.findByText(/Bukti pesan tidak dapat dimuat/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: pc.report.alsoExit })).toBeChecked();
    await user.click(screen.getByLabelText(pc.report.categories.harassment));
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.getByText("Ruang ditutup dan ta'aruf diakhiri")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.chat.exit }));
    await waitFor(() => expect(screen.queryByRole('button', { name: pc.chat.exit })).not.toBeInTheDocument());
    expect(screen.queryByText('Setelah dikirim')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    await screen.findByText(pc.report.successTitle);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ evidence: [], alsoExit: false }));
    expect(await mock.services.conversations.getRoom('tar-rahman')).toMatchObject({ ok: true, data: { conversationStatus: 'ended', exclusiveReservation: false } });
  });

  it('does not wait for evidence to let a participant review and report with exit', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman&akhiri=1', 'active_four_member_chat');
    vi.spyOn(mock.services.conversations, 'listEncryptedMessages').mockImplementation(() => new Promise(() => {}));
    const submit = vi.spyOn(mock.services.safety, 'submitReport');
    expect(await screen.findByText(/Memuat pilihan bukti/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(pc.report.categories.harassment));
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    expect(screen.getByText("Ruang ditutup dan ta'aruf diakhiri")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pc.chat.exit })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    await screen.findByText(pc.report.successTitle);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ evidence: [], alsoExit: true }));
    expect(await mock.services.conversations.getRoom('tar-rahman')).toMatchObject({ ok: true, data: { conversationStatus: 'ended', exclusiveReservation: false } });
  });

  it('T23 failed report keeps the immediate safe exit', async () => {
    const user = userEvent.setup();
    const { mock } = renderScreen('/laporan/baru?ruang=tar-rahman&subjek=cand-rahman', 'report_submission_failed');
    await user.click(await screen.findByLabelText(pc.report.categories.harassment));
    await user.click(screen.getByRole('button', { name: pc.report.review }));
    await user.click(screen.getByRole('button', { name: pc.report.submit }));
    expect(await screen.findByText(pc.report.failedSafeExit)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pc.chat.exit }));
    await waitFor(() => expect(mock.backend.world.taaruf.find((t) => t.id === 'tar-rahman')?.conversationStatus).toBe('ended'));
  });

  it('T24 public home makes no unsupported claims', async () => {
    const { container } = renderScreen('/', 'verified_browsing');
    await screen.findByRole('heading', { level: 1 });
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+\s*%|\d+\s*(ribu|juta|rb)\b|dijamin|garansi|pasti menikah|terenkripsi end-to-end|bersertifikat|tersertifikasi/i);
    // Mentioning E2EE is allowed only as a "not yet active" disclaimer.
    for (const m of text.matchAll(/[^.]*end-to-end[^.]*\./gi)) expect(m[0]).toMatch(/belum/);
  });
});

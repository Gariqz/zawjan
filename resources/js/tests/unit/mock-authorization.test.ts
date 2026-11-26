import { describe, expect, it } from 'vitest';
import { createMockServices } from '@/services/mock/adapters';
import { IDS, MOCK_NOW } from '@/services/mock/fixtures';

const mk = (scenarioId: string, persona?: 'participant' | 'pendamping' | 'moderator' | 'admin') =>
  createMockServices({ scenarioId, latencyMs: 0, ...(persona ? { persona } : {}) });

describe('mock auth session', () => {
  it('logout ends the session; protected calls then answer UNAUTHORIZED', async () => {
    const { services, backend } = mk('verified_browsing');
    expect((await services.auth.getViewer()).ok).toBe(true);
    expect((await services.auth.logout()).ok).toBe(true);
    expect(backend.world.signedIn).toBe(false);
    const v = await services.auth.getViewer();
    expect(v.ok ? 'ok' : v.code).toBe('UNAUTHORIZED');
    const s = await services.candidates.browse({});
    expect(s.ok ? 'ok' : s.code).toBe('UNAUTHORIZED');
  });
  it('login restores the session and a demo email selects its persona', async () => {
    const { services } = mk('signed_out');
    const bad = await services.auth.login({ email: 'fatimah@contoh.id', password: 'salah-sandi' });
    expect(bad.ok ? 'ok' : bad.code).toBe('UNAUTHORIZED');
    const r = await services.auth.login({ email: 'Fatimah@contoh.id ', password: 'apa-saja' });
    expect(r.ok && r.data.roles).toEqual(['pendamping']);
    const v = await services.auth.getViewer();
    expect(v.ok && v.data.id).toBe(IDS.pendampingA);
  });
  it('network_offline rejects like a dropped connection', async () => {
    const { services } = mk('network_offline');
    await expect(services.auth.getViewer()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('photo grant ownership', () => {
  it('only permits sharing with the active partner and closes access when the room ends', async () => {
    const { services, backend } = mk('photo_authorized');
    const room = await services.conversations.getRoom('tar-rahman');
    expect(room.ok && room.data.counterpart.authorizedPhotoUrl).toBeTruthy();
    const overview = await services.photos.getOverview();
    expect(overview.ok && overview.data.eligibleRecipients.map((r) => r.id)).toEqual(['cand-rahman']);
    expect((await services.conversations.exit('tar-rahman')).ok).toBe(true);
    const ended = await services.conversations.getRoom('tar-rahman');
    expect(ended.ok && ended.data.counterpart.authorizedPhotoUrl).toBeUndefined();
    expect(backend.world.photoGrants[0]?.status).toBe('revoked');
    expect(await services.photos.requestGrant(['cand-rahman'])).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });
  it('only lists and revokes grants the viewer owns, without leaking ownerId', async () => {
    const { services, backend } = mk('photo_authorized');
    backend.world.photoGrants.push({ id: 'pg-foreign', ownerId: 'acc-p-other', recipientId: 'cand-rahman', recipientDisplayName: 'Rahman F.', recipientRole: 'participant', status: 'active', updatedAt: '2026-11-13T00:00:00.000Z' });
    const ov = await services.photos.getOverview();
    if (!ov.ok) throw new Error(ov.code);
    expect(ov.data.grants.map((g) => g.id)).toEqual(['pg-1']);
    expect(Object.keys(ov.data.grants[0]!)).not.toContain('ownerId');
    const r = await services.photos.revoke('pg-foreign');
    expect(r.ok ? 'ok' : r.code).toBe('NOT_FOUND');
    expect(backend.world.photoGrants.find((g) => g.id === 'pg-foreign')?.status).toBe('active');
    expect((await services.photos.revoke('pg-1')).ok).toBe(true);
  });
  it("a pendamping can only confirm grants of the participant they actively supervise", async () => {
    const { services, backend } = mk('photo_pending_pendamping', 'pendamping');
    backend.world.photoGrants.push({ id: 'pg-foreign', ownerId: 'acc-p-other', recipientId: 'cand-yusuf', recipientDisplayName: 'Yusuf A.', recipientRole: 'participant', status: 'pendamping_pending', updatedAt: '2026-11-13T00:00:00.000Z' });
    const home = await services.pendamping.getHome();
    if (!home.ok) throw new Error(home.code);
    expect(home.data.photoConfirmations.map((g) => g.id)).toEqual(['pg-1']);
    const foreign = await services.photos.confirmAsOwnerPendamping('pg-foreign');
    expect(foreign.ok ? 'ok' : foreign.code).toBe('NOT_FOUND');
    backend.world.guardianAssignments.forEach((a) => { a.status = 'withdrawn'; });
    const afterWithdraw = await services.photos.confirmAsOwnerPendamping('pg-1');
    expect(afterWithdraw.ok ? 'ok' : afterWithdraw.code).toBe('NOT_FOUND');
  });
  it('blocks both photo directions and confirms grants without returning an owner preview', async () => {
    const { services, backend } = mk('photo_pending_pendamping', 'pendamping');
    expect(await services.photos.confirmAsOwnerPendamping('pg-1')).toEqual({ ok: true, data: undefined });
    expect(backend.world.photoGrants[0]?.status).toBe('active');
    const authorized = mk('photo_authorized');
    expect(await authorized.services.safety.blockUser('cand-rahman')).toMatchObject({ ok: true });
    const room = await authorized.services.conversations.getRoom('tar-rahman');
    expect(room.ok && room.data.counterpart.authorizedPhotoUrl).toBeUndefined();
    expect(authorized.backend.world.photoGrants.map((g) => g.status)).toEqual(['revoked', 'revoked']);
  });
  it('reads photo access from the incoming grant, not the outgoing grant or candidate profile', async () => {
    const { services, backend } = mk('photo_authorized');
    const grant = backend.world.photoGrants.find((g) => g.ownerId === 'cand-rahman')!;
    for (const status of ['pendamping_pending', 'revoked'] as const) {
      grant.status = status;
      const room = await services.conversations.getRoom('tar-rahman');
      expect(room.ok && room.data.counterpart.authorizedPhotoUrl).toBeUndefined();
    }
    expect(backend.world.photoGrants[0]?.status).toBe('active');
  });
  it('a pendamping cannot request grants on anyone’s behalf', async () => {
    const { services } = mk('photo_pending_pendamping', 'pendamping');
    const r = await services.photos.requestGrant(['cand-rahman']);
    expect(r.ok ? 'ok' : r.code).toBe('FORBIDDEN');
  });
});

describe('room report safety', () => {
  const report = { roomId: 'tar-rahman', subjectUserId: 'cand-rahman', category: 'harassment' as const, description: '', evidence: [], alsoExit: true };

  it('rejects mismatched evidence before changing the room', async () => {
    const { services, backend } = mk('active_four_member_chat');
    const message = backend.world.messages.find((m) => m.senderId !== IDS.viewer)!;
    const evidence = [{ messageId: message.id, body: 'Bukti tidak cocok', sentAt: message.sentAt, senderRole: message.senderRole, senderDisplay: 'Rahman F.' }];
    expect(await services.safety.submitReport({ ...report, evidence })).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(await services.conversations.getRoom(report.roomId)).toMatchObject({ ok: true, data: { conversationStatus: 'active', exclusiveReservation: true } });
  });

  it('lets a pendamping freeze but not end a room, and blocks replacement from reopening it', async () => {
    const { services, backend } = mk('active_four_member_chat', 'pendamping');
    expect(await services.safety.submitReport(report)).toMatchObject({ ok: true });
    backend.simulate('own_pendamping_withdraws');
    backend.simulate('replacement_approved');
    expect(await services.conversations.getRoom(report.roomId)).toMatchObject({ ok: true, data: { conversationStatus: 'frozen_reported', exclusiveReservation: false } });
    expect(await services.conversations.exit(report.roomId)).toMatchObject({ ok: false });
    backend.world.persona = 'participant';
    expect(await services.conversations.exit(report.roomId)).toMatchObject({ ok: true });
  });
});

describe('pendamping authorization', () => {
  it('starts a 72-hour reservation on acceptance and expires it before another approval', async () => {
    const { services, backend } = mk('pending_request');
    expect((await services.introductions.get('tar-rahman')).ok).toBe(true);
    expect(backend.world.taaruf[0]?.expiresAt).toBeUndefined();
    backend.simulate('counterpart_accepts');
    const t = backend.world.taaruf[0]!;
    expect(Date.parse(t.expiresAt!) - MOCK_NOW.getTime()).toBe(72 * 60 * 60_000);
    backend.world.clockOffsetMinutes = 72 * 60;
    backend.world.persona = 'pendamping';
    expect(await services.introductions.approveAsPendamping(t.id)).toMatchObject({ ok: false });
    expect(t).toMatchObject({ requestStatus: 'expired', exclusiveReservation: false });
  });
  it('does not activate if the local assignment is no longer current', async () => {
    const { services, backend } = mk('two_pendamping_waiting', 'pendamping');
    expect(await services.introductions.approveAsPendamping('tar-rahman')).toMatchObject({ ok: true });
    backend.world.guardianAssignments[0]!.status = 'withdrawn';
    backend.simulate('other_pendamping_approves');
    backend.world.persona = 'participant';
    expect(await services.conversations.getRoom('tar-rahman')).toMatchObject({ ok: true, data: { conversationStatus: 'locked' } });
  });
  it('the assigned pendamping can approve', async () => {
    const { services } = mk('two_pendamping_waiting', 'pendamping');
    const r = await services.introductions.approveAsPendamping('tar-rahman');
    expect(r.ok).toBe(true);
  });
  it('a pendamping without an active assignment cannot see, approve or decline', async () => {
    const { services, backend } = mk('two_pendamping_waiting', 'pendamping');
    backend.world.guardianAssignments.forEach((a) => { a.status = 'withdrawn'; });
    const g = await services.introductions.get('tar-rahman');
    expect(g.ok ? 'ok' : g.code).toBe('NOT_FOUND');
    const a = await services.introductions.approveAsPendamping('tar-rahman');
    expect(a.ok ? 'ok' : a.code).toBe('NOT_FOUND');
    const d = await services.introductions.declineAsPendamping('tar-rahman');
    expect(d.ok ? 'ok' : d.code).toBe('NOT_FOUND');
    const list = await services.introductions.listRequests();
    expect(list.ok && list.data).toEqual([]);
  });
  it('a different pendamping account cannot act on the room', async () => {
    const { services, backend } = mk('two_pendamping_waiting', 'pendamping');
    backend.world.accounts.pendamping.id = 'acc-g-stranger';
    const a = await services.introductions.approveAsPendamping('tar-rahman');
    expect(a.ok ? 'ok' : a.code).toBe('NOT_FOUND');
    const m = await services.conversations.listEncryptedMessages('tar-rahman');
    expect(m.ok ? 'ok' : m.code).toBe('FORBIDDEN');
  });
  it('an unverified pendamping cannot decline either', async () => {
    const { services, backend } = mk('two_pendamping_waiting', 'pendamping');
    backend.world.accounts.pendamping.identityStatus = 'needs_manual_review';
    const d = await services.introductions.declineAsPendamping('tar-rahman');
    expect(d.ok ? 'ok' : d.code).toBe('IDENTITY_PENDING');
  });
  it('issues a new invitation only to the chosen email and requires a separate recipient response', async () => {
    const { services, backend } = mk('no_pendamping');
    const send = await services.profile.invitePendamping(' FATIMAH@contoh.id ');
    if (!send.ok) throw new Error(send.code);
    expect(await services.pendamping.acceptInvitation(send.data.id)).toMatchObject({ ok: false });
    backend.world.persona = 'pendamping';
    expect(await services.pendamping.getInvitation(send.data.id)).toMatchObject({ ok: true, data: { status: 'pending' } });
    expect(await services.pendamping.acceptInvitation(send.data.id)).toMatchObject({ ok: true, data: { status: 'accepted' } });
    expect(backend.world.nomination.status).toBe('accepted');
  });
  it('rejects self-invites and prevents acceptance before verification or after cancellation', async () => {
    const { services, backend } = mk('no_pendamping');
    expect(await services.profile.invitePendamping('aisyah@contoh.id')).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    const send = await services.profile.invitePendamping('fatimah@contoh.id');
    if (!send.ok) throw new Error(send.code);
    backend.world.persona = 'pendamping';
    backend.world.accounts.pendamping.identityStatus = 'not_started';
    expect(await services.pendamping.acceptInvitation(send.data.id)).toMatchObject({ ok: false, code: 'IDENTITY_PENDING' });
    backend.world.persona = 'participant';
    expect(await services.profile.cancelNomination()).toMatchObject({ ok: true });
    backend.world.persona = 'pendamping';
    backend.world.accounts.pendamping.identityStatus = 'approved';
    expect(await services.pendamping.acceptInvitation(send.data.id)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
  });
  it('invitations addressed to another account are not visible or answerable', async () => {
    const { services, backend } = mk('pendamping_invitation', 'pendamping');
    backend.world.guardianInvitations[0]!.inviteeAccountId = 'acc-g-someone-else';
    const g = await services.pendamping.getInvitation('inv-1');
    expect(g.ok ? 'ok' : g.code).toBe('NOT_FOUND');
    const a = await services.pendamping.acceptInvitation('inv-1');
    expect(a.ok ? 'ok' : a.code).toBe('NOT_FOUND');
    const home = await services.pendamping.getHome();
    expect(home.ok && home.data.invitations).toEqual([]);
  });
  it('accepting an invitation creates an assignment that then authorizes approvals', async () => {
    const { services, backend } = mk('pendamping_invitation', 'pendamping');
    expect((await services.pendamping.acceptInvitation('inv-1')).ok).toBe(true);
    const asg = backend.world.guardianAssignments.at(-1);
    expect(asg).toMatchObject({ participantId: IDS.viewer, pendampingAccountId: IDS.pendampingA, status: 'active' });
  });
  it("cannot withdraw another pendamping's assignment", async () => {
    const { services, backend } = mk('verified_browsing', 'pendamping');
    backend.world.guardianAssignments[0]!.pendampingAccountId = 'acc-g-other';
    const r = await services.pendamping.withdraw('asg-1');
    expect(r.ok ? 'ok' : r.code).toBe('NOT_FOUND');
    expect(backend.world.guardianAssignments[0]!.status).toBe('active');
  });
});

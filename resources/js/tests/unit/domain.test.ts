import { describe, expect, it } from 'vitest';
import { computeNextAction, type NextActionKind } from '@/domain/nextAction';
import { describeFact } from '@/domain/status';
import { groupRequests, isClosed, isOngoing } from '@/domain/taaruf';
import type { TaArufSummary } from '@/domain/types';
import { ageOn, MINIMUM_AGE, validateRegistration } from '@/domain/validation';
import { createMockServices } from '@/services/mock/adapters';

describe('ageOn / minimum age', () => {
  const today = new Date(Date.UTC(2025, 10, 15)); // 15 Nov 2025
  it('counts birthdays exactly', () => {
    expect(ageOn('2006-11-15', today)).toBe(19);
    expect(ageOn('2006-11-16', today)).toBe(18);
    expect(ageOn('2000-02-29', today)).toBe(25);
  });
  it('rejects malformed and impossible dates', () => {
    expect(ageOn('2006-02-30', today)).toBeNull();
    expect(ageOn('15/11/2006', today)).toBeNull();
  });
  it('the minimum age is 19', () => expect(MINIMUM_AGE).toBe(19));
});

describe('validateRegistration', () => {
  const ok = { role: 'participant' as const, displayName: 'Aisyah', email: 'aisyah@contoh.id', password: 'rahasia-panjang', dateOfBirth: '1998-04-02', acceptPurpose: true, acceptTerms: true, acceptPrivacy: true };
  const today = new Date(Date.UTC(2025, 10, 15));
  it('accepts a complete adult registration', () => expect(validateRegistration(ok, today)).toEqual({}));
  it('blocks under-19 and missing consents with field-level messages', () => {
    const e = validateRegistration({ ...ok, dateOfBirth: '2007-01-01', acceptTerms: false, acceptPrivacy: false, email: 'x' }, today);
    expect(Object.keys(e).sort()).toEqual(['acceptPrivacy', 'acceptTerms', 'dateOfBirth', 'email']);
    expect(e.dateOfBirth).toMatch(/19 tahun/);
  });
});

describe('describeFact', () => {
  it('never presents a declared fact as verified', () => {
    const d = describeFact({ kind: 'marital_status', status: 'declared' });
    expect(d.label).toBe('Status perkawinan: dinyatakan oleh pengguna');
    expect(d.label).not.toMatch(/terverifikasi/);
    expect(d.tone).toBe('neutral');
  });
  it('labels confirmed identity and age narrowly', () => {
    expect(describeFact({ kind: 'identity', status: 'confirmed' }).label).toBe('Identitas terverifikasi');
    expect(describeFact({ kind: 'age', status: 'confirmed' }).label).toBe('Usia 19+ terverifikasi');
  });
});

describe('taaruf grouping', () => {
  const t = (id: string, requestStatus: TaArufSummary['requestStatus'], direction: TaArufSummary['direction'], conversationStatus: TaArufSummary['conversationStatus'] = 'locked') =>
    ({ id, requestStatus, direction, conversationStatus }) as TaArufSummary;
  const list = [
    t('in', 'pending_recipient', 'incoming'),
    t('out', 'pending_recipient', 'outgoing'),
    t('wait', 'waiting_pendamping', 'outgoing'),
    t('live', 'active', 'incoming', 'active'),
    t('done', 'active', 'outgoing', 'ended'),
    t('no', 'declined', 'outgoing'),
  ];
  it('splits into ongoing / incoming / outgoing / history without overlap', () => {
    const g = groupRequests(list);
    expect(g.ongoing.map((x) => x.id)).toEqual(['wait', 'live']);
    expect(g.incoming.map((x) => x.id)).toEqual(['in']);
    expect(g.outgoing.map((x) => x.id)).toEqual(['out']);
    expect(g.history.map((x) => x.id)).toEqual(['done', 'no']);
  });
  it('an ended conversation is closed even if the request is still "active"', () => {
    expect(isClosed(list[4]!)).toBe(true);
    expect(isOngoing(list[4]!)).toBe(false);
  });
});

describe('computeNextAction across fictional scenarios', () => {
  const cases: [string, NextActionKind][] = [
    ['underage', 'age_ineligible'],
    ['unverified', 'verify_identity'],
    ['verification_manual_review', 'verification_in_review'],
    ['verification_rejected', 'verification_fix'],
    ['kyc_unavailable', 'verification_unavailable'],
    ['cv_incomplete', 'complete_cv'],
    ['no_pendamping', 'invite_pendamping'],
    ['pendamping_invite_sent', 'wait_pendamping'],
    ['two_pendamping_waiting', 'track_approvals'],
    ['active_four_member_chat', 'enter_room'],
    // The viewer's own pendamping withdrew: inviting a replacement is what unpauses the room.
    ['guardian_withdrawn', 'invite_pendamping'],
    ['report_submitted', 'room_paused'],
  ];
  it.each(cases)('%s → %s', async (scenario, expected) => {
    const { services } = createMockServices({ scenarioId: scenario, latencyMs: 0 });
    const v = await services.auth.getViewer();
    const r = await services.introductions.listRequests();
    if (!v.ok || !r.ok) throw new Error('mock call failed');
    expect(computeNextAction(v.data, r.data).kind).toBe(expected);
  });
});

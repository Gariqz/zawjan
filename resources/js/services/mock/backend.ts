/**
 * In-memory MOCK backend for UX development. It simulates server-side rules so the UI can be
 * exercised, but it is NOT a security boundary, performs NO encryption, and verifies NO identity.
 * Every real rule here must be re-implemented and enforced by the backend teams.
 */
import { NO_CAPABILITIES } from '@/domain/capabilities';
import { REPORT_CATEGORIES } from '@/domain/types';
import type {
  ActionResult, AdminUserAction, CandidateDetail, CandidateSummary, CaseFilters, ConversationMember,
  DiscoveryConsent, DiscoveryPreferences, DiscoveryProfile, EncryptedMessageEnvelope, ErrorCode,
  IdentityStatus, Page, PendampingHome, PhotoPrivacyOverview, RegisterInput, ReportCaseAction,
  ReportCaseSummary, ReportInput, TaArufSummary, UploadHandle, VerificationDecision, ViewerCapability, ViewerContext,
} from '@/domain/types';
import { validReportOtherReason, validateCv, validateRegistration } from '@/domain/validation';
import { NetworkError } from '../errors';
import ownerPortrait from './media/portrait-illustration-a.svg';
import counterpartPortrait from './media/portrait-illustration-b.svg';
import {
  CV_SCHEMA, DEMO_LOGINS, IDS, minutesAhead, type MockAccount, type MockAssignment, type MockCandidate, type MockInvitation,
  type MockPhotoGrant, type MockTaaruf, type World,
} from './fixtures';

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = <T = never>(code: ErrorCode, message?: string, fieldErrors?: Record<string, string>): ActionResult<T> => ({
  ok: false, code, ...(message ? { message } : {}), ...(fieldErrors ? { fieldErrors } : {}),
});
const clone = <T>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
const publicGrant = ({ ownerId: _o, ...g }: MockPhotoGrant) => clone(g);
const publicAssignment = ({ participantId: _p, pendampingAccountId: _g, ...a }: MockAssignment) => clone(a);
const publicInvitation = ({ inviterId: _i, inviteeAccountId: _a, ...v }: MockInvitation) => clone(v);

export const MOCK_CIPHER_PREFIX = 'mock-plaintext:';
const TERMINAL: MockTaaruf['requestStatus'][] = ['declined', 'cancelled', 'expired', 'unavailable'];
const MOCK_RESERVATION_MINUTES = 60 * 72;
const PAGE_SIZE = 10;
const isOpenReport = (report: ReportCaseSummary) => report.status !== 'closed' && report.status !== 'actioned';
const reportPriority = { high: 0, normal: 1, low: 2 } as const;

export class MockBackend {
  world: World;
  latencyMs: number;
  private listeners = new Set<() => void>();
  private seq = 1000;

  constructor(world: World, opts: { latencyMs?: number } = {}) {
    this.world = world;
    this.latencyMs = opts.latencyMs ?? 180;
  }

  subscribe(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  emit(): void {
    this.listeners.forEach((l) => l());
  }
  reset(world: World): void {
    this.world = world;
    this.emit();
  }

  private now(): string {
    this.world.clockOffsetMinutes += 1;
    return minutesAhead(this.world.clockOffsetMinutes);
  }
  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }
  private get acc(): MockAccount {
    return this.world.accounts[this.world.persona];
  }

  /**
   * Simulates one server round trip. `anonymous` marks the few calls allowed without a session
   * (login, register, logout); everything else answers UNAUTHORIZED once signed out.
   */
  async run<T>(fn: () => ActionResult<T>, opts: { mutates?: boolean; anonymous?: boolean } = {}): Promise<ActionResult<T>> {
    if (this.world.failMode === 'loading') return new Promise<ActionResult<T>>(() => undefined);
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs));
    if (this.world.failMode === 'network') throw new NetworkError('Failed to fetch (simulated offline)');
    if (this.world.failMode === 'service_unavailable') return fail('SERVICE_UNAVAILABLE');
    if (!opts.anonymous && !this.world.signedIn) return fail('UNAUTHORIZED');
    if (opts.mutates && this.world.rateLimited) return fail('RATE_LIMITED');
    this.expireReservations();
    const r = fn();
    if (opts.mutates && r.ok) this.emit();
    return clone(r);
  }

  /* ------------------------------ derived state ------------------------------ */

  private participantEligible(): boolean {
    const p = this.world.accounts.participant;
    return p.identityStatus === 'approved' && p.ageEligible;
  }
  private hasExclusive(): boolean {
    return this.world.taaruf.some((t) => t.exclusiveReservation);
  }
  private participantAssignment(pendampingId?: string): MockAssignment | undefined {
    return this.world.guardianAssignments.find((a) => a.status === 'active' && a.participantId === this.world.accounts.participant.id
      && (!pendampingId || a.pendampingAccountId === pendampingId));
  }
  private canRequestNow(): boolean {
    return this.participantEligible() && this.world.cv.status === 'published'
      && this.world.nomination.status === 'accepted' && !!this.participantAssignment() && !this.hasExclusive();
  }
  private isStaff(role: 'moderator' | 'admin'): boolean {
    return this.world.persona === role && !this.world.staffCapabilitiesRevoked;
  }

  viewerCapabilities(): ViewerCapability {
    const p = this.world.persona;
    if (p === 'participant') {
      return {
        ...NO_CAPABILITIES,
        canBrowseCandidates: this.participantEligible(),
        canSendRequest: this.canRequestNow(),
        canAcceptRequest: this.participantEligible() && !!this.participantAssignment() && !this.hasExclusive(),
      };
    }
    if (p === 'pendamping') return { ...NO_CAPABILITIES, canApproveIntroduction: this.acc.identityStatus === 'approved' };
    if (p === 'moderator' && !this.world.staffCapabilitiesRevoked) return { ...NO_CAPABILITIES, canModerateCase: true, canReadCaseEvidence: true };
    return { ...NO_CAPABILITIES };
  }

  viewer(): ViewerContext {
    const a = this.acc;
    const nom = this.world.nomination.status;
    return {
      id: a.id,
      displayName: a.displayName,
      roles: a.roles,
      identityStatus: a.identityStatus,
      ageEligible: a.ageEligible,
      emailConfirmed: a.emailConfirmed,
      cvStatus: this.world.cv.status,
      pendampingStatus: nom === 'not_invited' || nom === 'invalid' ? 'none' : nom,
      capabilities: this.viewerCapabilities(),
      isDevelopmentMock: true,
    };
  }

  private candidate(id: string): MockCandidate | undefined {
    return this.world.candidates.find((c) => c.summary.id === id);
  }
  taarufView(t: MockTaaruf): TaArufSummary {
    const c = this.candidate(t.counterpartId);
    const counterpart: CandidateSummary = c ? clone(c.summary) : { id: t.counterpartId, displayName: 'Pengguna', age: 0, declaredCriteria: {}, verificationFacts: [], photoVisibility: 'hidden' };
    const isActiveRoom = t.requestStatus === 'active' && t.conversationStatus === 'active';
    const canSeePhoto = this.world.persona === 'participant' && isActiveRoom && !c?.blocked && this.world.photoGrants.some((g) =>
      g.ownerId === t.counterpartId && g.recipientId === this.acc.id && g.status === 'active');
    delete counterpart.authorizedPhotoUrl;
    counterpart.photoVisibility = canSeePhoto ? 'authorized' : 'hidden';
    if (canSeePhoto) counterpart.authorizedPhotoUrl = counterpartPortrait;
    const cp = c?.pendamping ?? { accountId: 'acc-g-unknown', displayName: 'Pendamping' };
    const viewerP = this.world.accounts.participant;
    const aMembership: ConversationMember['membership'] =
      t.pendampingA.membership === 'withdrawn' ? 'withdrawn'
        : t.pendampingA.membership === 'replacement_pending' ? 'replacement_pending'
          : t.approvalA === 'approved' ? 'approved' : 'pending';
    const members: ConversationMember[] = [
      { accountId: viewerP.id, displayName: viewerP.displayName, role: 'participant', side: 'A', membership: t.acceptedA ? 'approved' : 'pending' },
      { accountId: t.pendampingA.accountId, displayName: t.pendampingA.displayName, role: 'pendamping', side: 'A', membership: aMembership, authorizedFrom: t.pendampingA.authorizedFrom },
      { accountId: counterpart.id, displayName: counterpart.displayName, role: 'participant', side: 'B', membership: t.acceptedB ? 'approved' : 'pending' },
      { accountId: cp.accountId, displayName: cp.displayName, role: 'pendamping', side: 'B', membership: t.approvalB === 'approved' ? 'approved' : 'pending' },
    ];
    const caps = { ...NO_CAPABILITIES, canCancel: false, canDecline: false, canExit: false, canReport: false };
    if (this.world.persona === 'participant') {
      const pendingIncoming = t.direction === 'incoming' && t.requestStatus === 'pending_recipient';
      caps.canAcceptRequest = pendingIncoming && this.participantEligible() && !!this.participantAssignment(t.pendampingA.accountId) && !this.hasExclusive();
      caps.canDecline = pendingIncoming;
      caps.canCancel = (t.direction === 'outgoing' && t.requestStatus === 'pending_recipient')
        || t.requestStatus === 'mutually_accepted_reserved' || t.requestStatus === 'waiting_pendamping';
      caps.canSendMessage = isActiveRoom;
      caps.canExit = t.requestStatus === 'active' && t.conversationStatus !== 'ended';
      caps.canReport = !TERMINAL.includes(t.requestStatus) || t.requestStatus === 'cancelled' || t.conversationStatus === 'ended';
      caps.canViewProtectedPhoto = counterpart.photoVisibility === 'authorized';
    } else if (this.world.persona === 'pendamping' && this.isPendampingMember(t)) {
      caps.canApproveIntroduction = t.approvalA === 'pending' && t.requestStatus === 'waiting_pendamping' && this.acc.identityStatus === 'approved';
      caps.canSendMessage = isActiveRoom && this.world.pendampingMayCompose;
      caps.canReport = t.requestStatus === 'active';
    }
    return {
      id: t.id,
      direction: t.direction,
      createdAt: t.createdAt,
      counterpart,
      requestStatus: t.requestStatus,
      conversationStatus: t.conversationStatus,
      participantAcceptances: [
        { participantId: viewerP.id, displayName: viewerP.displayName, accepted: t.acceptedA },
        { participantId: counterpart.id, displayName: counterpart.displayName, accepted: t.acceptedB },
      ],
      approvals: [
        { assignmentId: `asg-a-${t.id}`, participantId: viewerP.id, pendampingAccountId: t.pendampingA.accountId, displayName: t.pendampingA.displayName, status: t.approvalA, ...(t.approvalAAt ? { actedAt: t.approvalAAt } : {}) },
        { assignmentId: `asg-b-${t.id}`, participantId: counterpart.id, pendampingAccountId: cp.accountId, displayName: cp.displayName, status: t.approvalB, ...(t.approvalBAt ? { actedAt: t.approvalBAt } : {}) },
      ],
      members,
      exclusiveReservation: t.exclusiveReservation,
      ...(t.expiresAt && !TERMINAL.includes(t.requestStatus) && t.requestStatus !== 'active' ? { expiresAt: t.expiresAt } : {}),
      ...(t.closedReason ? { closedReason: t.closedReason } : {}),
      ...(t.closedAt ? { closedAt: t.closedAt } : {}),
      capabilities: caps,
    };
  }

  /** Active assignment between the signed-in pendamping and a participant (server-side relation). */
  private activeAssignmentFor(participantId: string): MockAssignment | undefined {
    if (this.world.persona !== 'pendamping') return undefined;
    return this.world.guardianAssignments.find((a) => a.status === 'active' && a.pendampingAccountId === this.acc.id && a.participantId === participantId);
  }
  /**
   * A pendamping may see or act on a ta'aruf only while they are the approved side-A member AND
   * hold an active assignment for that participant. Withdrawn or replaced pendamping lose access.
   */
  private isPendampingMember(t: MockTaaruf): boolean {
    return t.pendampingA.accountId === this.acc.id && t.pendampingA.membership === 'approved'
      && !!this.activeAssignmentFor(this.world.accounts.participant.id);
  }
  private findTaaruf(id: string): MockTaaruf | undefined {
    const t = this.world.taaruf.find((x) => x.id === id);
    if (!t) return undefined;
    if (this.world.persona === 'participant') return t;
    if (this.world.persona === 'pendamping' && this.isPendampingMember(t)) return t;
    return undefined;
  }
  private expireReservations() {
    const clock = minutesAhead(this.world.clockOffsetMinutes);
    for (const t of this.world.taaruf) {
      if (!t.exclusiveReservation || t.requestStatus === 'active' || !t.expiresAt || t.expiresAt > clock) continue;
      t.requestStatus = 'expired';
      t.closedReason = 'expired';
      t.closedAt = t.expiresAt;
      this.release(t);
    }
  }
  private release(t: MockTaaruf) {
    t.exclusiveReservation = false;
    const participant = this.world.accounts.participant.id;
    for (const g of this.world.photoGrants) {
      const matches = (g.ownerId === participant && g.recipientId === t.counterpartId)
        || (g.ownerId === t.counterpartId && g.recipientId === participant);
      if (matches && g.status !== 'revoked') {
        g.status = 'revoked';
        g.updatedAt = t.closedAt ?? this.now();
      }
    }
  }
  private syncAssignment(t: MockTaaruf) {
    const asg = this.world.guardianAssignments.find((a) => a.status === 'active' && a.pendampingAccountId === t.pendampingA.accountId);
    if (asg && (t.conversationStatus === 'active' || asg.activeTaArufId === t.id)) {
      asg.activeTaArufId = t.id;
      asg.roomStatus = t.conversationStatus;
    }
  }

  /* --------------------------------- auth ---------------------------------- */

  login(email: string, password: string) {
    return this.run(() => {
      const fe: Record<string, string> = {};
      if (!email) fe.email = 'Masukkan email.';
      if (!password) fe.password = 'Masukkan kata sandi.';
      if (Object.keys(fe).length) return fail('VALIDATION_ERROR', undefined, fe);
      if (this.world.rateLimited) return fail('RATE_LIMITED');
      // Generic failure: never reveal whether the email exists.
      if (password === 'salah-sandi') return fail('UNAUTHORIZED', 'Email atau kata sandi tidak sesuai.');
      const demo = DEMO_LOGINS.find((d) => d.email === email.trim().toLowerCase());
      if (demo) this.world.persona = demo.persona;
      this.world.signedIn = true;
      return ok(this.viewer());
    }, { anonymous: true });
  }
  logout() {
    return this.run<void>(() => {
      this.world.signedIn = false;
      return ok(undefined);
    }, { anonymous: true });
  }
  register(input: RegisterInput) {
    return this.run(() => {
      const fe = validateRegistration(input);
      if (Object.keys(fe).length) return fail('VALIDATION_ERROR', undefined, fe);
      this.startFreshAccount(input);
      // Same response for new and existing emails (no account enumeration).
      return ok({ emailConfirmationPending: true });
    }, { mutates: true, anonymous: true });
  }

  /**
   * Demo continuity: a registration replaces the signed-in persona with a brand-new, unverified
   * account so the onboarding flow can be walked end to end. The email link is treated as clicked.
   */
  private startFreshAccount(input: RegisterInput) {
    const w = this.world;
    const name = input.displayName.trim();
    w.signedIn = true;
    if (input.role === 'pendamping') {
      w.persona = 'pendamping';
      w.accounts.pendamping = { ...w.accounts.pendamping, id: this.id('acc-g'), email: input.email.trim().toLowerCase(), displayName: name, identityStatus: 'not_started', emailConfirmed: true };
      return;
    }
    w.persona = 'participant';
    w.accounts.participant = { ...w.accounts.participant, email: input.email.trim().toLowerCase(), displayName: name, identityStatus: 'not_started', ageEligible: true, emailConfirmed: true };
    w.cv = { values: {}, status: 'empty' };
    w.discoveryOptIn = false;
    w.nomination = { id: 'nom-new', status: 'not_invited' };
    w.taaruf = [];
    w.messages = [];
    w.photoGrants = [];
    w.photoUploaded = false;
    w.guardianAssignments = [];
    w.guardianInvitations = [];
  }

  /* -------------------------------- identity -------------------------------- */

  upload(kind: 'document' | 'selfie', file: File) {
    return this.run<UploadHandle>(() => {
      const allowed = kind === 'document' ? ['image/jpeg', 'image/png', 'application/pdf'] : ['image/jpeg', 'image/png'];
      if (!allowed.includes(file.type)) return fail('VALIDATION_ERROR', kind === 'document' ? 'Gunakan berkas JPG, PNG, atau PDF.' : 'Gunakan foto JPG atau PNG.');
      if (file.size > 8 * 1024 * 1024) return fail('VALIDATION_ERROR', 'Ukuran berkas maksimal 8 MB.');
      // Only an opaque handle is retained; the bytes are discarded by the mock.
      return ok({ uploadId: this.id(`upl-${kind}`), fileName: file.name, sizeBytes: file.size });
    }, { mutates: true });
  }
  submitVerification(documentUploadId: string, selfieUploadId: string) {
    return this.run<{ status: IdentityStatus }>(() => {
      if (!documentUploadId || !selfieUploadId) return fail('VALIDATION_ERROR', 'Unggah dokumen dan swafoto terlebih dahulu.');
      const acc = this.acc;
      if (this.world.kycOutcome === 'temporarily_unavailable') {
        acc.identityStatus = 'temporarily_unavailable';
        return ok({ status: acc.identityStatus });
      }
      acc.identityStatus = 'automated_check';
      setTimeout(() => {
        acc.identityStatus = this.world.kycOutcome;
        this.emit();
      }, 2000);
      return ok({ status: acc.identityStatus });
    }, { mutates: true });
  }

  /* --------------------------------- profile -------------------------------- */

  saveCv(values: Record<string, string>) {
    return this.run(() => {
      this.world.cv = { values: { ...this.world.cv.values, ...values }, status: this.world.cv.status === 'published' ? 'published' : 'draft', updatedAt: this.now() };
      return ok(this.world.cv);
    }, { mutates: true });
  }
  publishCv() {
    return this.run(() => {
      const fe = validateCv(CV_SCHEMA, this.world.cv);
      if (Object.keys(fe).length) return fail('VALIDATION_ERROR', 'Beberapa bagian wajib belum diisi.', fe);
      this.world.cv = { ...this.world.cv, status: 'published', updatedAt: this.now() };
      return ok(this.world.cv);
    }, { mutates: true });
  }
  invitePendamping(contact: string) {
    return this.run(() => {
      if (this.world.persona !== 'participant') return fail('FORBIDDEN');
      const email = contact.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail('VALIDATION_ERROR', undefined, { contact: 'Masukkan alamat email yang valid.' });
      }
      if (email === (this.acc.email ?? DEMO_LOGINS.find((d) => d.persona === 'participant')?.email)) {
        return fail('VALIDATION_ERROR', undefined, { contact: 'Undangan tidak dapat dikirim ke akun sendiri.' });
      }
      if (['sent', 'accepted'].includes(this.world.nomination.status)) return fail('FORBIDDEN');
      const id = this.id('inv');
      const sentAt = this.now();
      const expiresAt = minutesAhead(this.world.clockOffsetMinutes + 60 * 24 * 7);
      const guardian = this.world.accounts.pendamping;
      // ponytail: one recipient account in demo; production matches verified emails via backend.
      const guardianEmail = guardian.email ?? DEMO_LOGINS.find((d) => d.persona === 'pendamping')?.email;
      if (email === guardianEmail) {
        this.world.guardianInvitations.push({ id, inviterId: this.acc.id, inviteeAccountId: guardian.id, inviterDisplayName: this.acc.displayName, status: 'pending', sentAt, expiresAt, viewerIdentityStatus: guardian.identityStatus });
      }
      this.world.nomination = { id, status: 'sent', inviteeMasked: `${email[0]}•••••@${email.split('@')[1]}`, sentAt, expiresAt, pendampingIdentity: 'not_started' };
      return ok(this.world.nomination);
    }, { mutates: true });
  }
  cancelNomination() {
    return this.run(() => {
      if (this.world.persona !== 'participant') return fail('FORBIDDEN');
      const id = this.world.nomination.id;
      this.world.guardianInvitations = this.world.guardianInvitations.filter((i) => i.id !== id || i.status !== 'pending');
      for (const a of this.world.guardianAssignments.filter((a) => a.participantId === this.acc.id && a.status === 'active')) {
        a.status = 'withdrawn';
        for (const t of this.world.taaruf.filter((t) => t.pendampingA.accountId === a.pendampingAccountId && t.conversationStatus !== 'ended')) {
          t.pendampingA.membership = 'withdrawn';
          t.approvalA = 'withdrawn';
          if (t.conversationStatus === 'active') t.conversationStatus = 'paused_guardian_missing';
        }
      }
      this.world.nomination = { id, status: 'not_invited' };
      return ok(this.world.nomination);
    }, { mutates: true });
  }

  /* ------------------------------- candidates ------------------------------- */

  private guardBrowse<T>(): ActionResult<T> | null {
    if (this.world.persona !== 'participant') return fail('FORBIDDEN');
    if (!this.world.accounts.participant.ageEligible) return fail('FORBIDDEN', 'Belum memenuhi ketentuan usia.');
    if (!this.participantEligible()) return fail('IDENTITY_PENDING');
    return null;
  }
  getVisibility() {
    return this.run(() => this.world.persona === 'participant' ? ok({ visible: this.world.discoveryOptIn }) : fail('FORBIDDEN'));
  }
  setVisibility(input: DiscoveryConsent) {
    return this.run(() => {
      if (this.world.persona !== 'participant') return fail('FORBIDDEN');
      if (input?.visible === true) {
        if (input.consent !== true) return fail('VALIDATION_ERROR');
        const g = this.guardBrowse<{ visible: boolean }>();
        if (g) return g;
        if (this.world.cv.status !== 'published') return fail('VALIDATION_ERROR');
      } else if (input?.visible !== false) {
        return fail('VALIDATION_ERROR');
      }
      this.world.discoveryOptIn = input.visible;
      return ok({ visible: input.visible });
    }, { mutates: true });
  }
  browse(f: DiscoveryPreferences) {
    return this.run<{ items: DiscoveryProfile[] }>(() => {
      const g = this.guardBrowse<{ items: DiscoveryProfile[] }>();
      if (g) return g;
      const validAge = (age?: number) => age === undefined || (Number.isInteger(age) && age >= 19 && age <= 80);
      if (!f || !validAge(f.ageMin) || !validAge(f.ageMax) || (f.ageMin ?? 19) > (f.ageMax ?? 80)
        || [f.region, f.maritalStatus, f.relocation].some((v) => v !== undefined && (typeof v !== 'string' || v.length > 80))) {
        return fail('VALIDATION_ERROR');
      }
      const region = f.region?.trim().toLowerCase();
      // ponytail: small mock fixture set; add bounded pagination before any live browse endpoint.
      const items = this.world.candidates.filter(({ summary: s, blocked, discoveryOptIn }) => discoveryOptIn && !blocked
        && (f.ageMin === undefined || s.age >= f.ageMin) && (f.ageMax === undefined || s.age <= f.ageMax)
        && (!region || (s.city ?? '').toLowerCase().includes(region))
        && (!f.maritalStatus || s.declaredCriteria.maritalStatus === f.maritalStatus)
        && (!f.relocation || s.declaredCriteria.relocation === f.relocation))
        .map(({ summary: { id, displayName, age, city, summary } }) => ({ id, displayName, age, region: city ?? '', introduction: summary ?? '' }));
      return ok({ items });
    });
  }
  getDetail(id: string) {
    return this.run<CandidateDetail>(() => {
      const g = this.guardBrowse<CandidateDetail>();
      if (g) return g;
      const c = this.candidate(id);
      if (!c || c.blocked) return fail('NOT_FOUND');
      const t = this.world.taaruf.find((x) => x.counterpartId === id && !TERMINAL.includes(x.requestStatus) && x.conversationStatus !== 'ended');
      if (!c.discoveryOptIn && !t) return fail('NOT_FOUND');
      const relation: CandidateDetail['relation'] = !t ? 'none'
        : t.requestStatus === 'pending_recipient' ? (t.direction === 'outgoing' ? 'pending_outgoing' : 'pending_incoming')
          : 'in_taaruf_with_you';
      const unlocked = relation === 'in_taaruf_with_you';
      const caps = this.viewerCapabilities();
      const { displayName, age, city, verificationFacts } = c.summary;
      return ok({
        id, displayName, age, city, verificationFacts,
        sections: unlocked
          ? [...c.sections,
            { id: 'tujuan', title: 'Tujuan dan kesiapan menikah', fields: [{ label: 'Kesiapan menikah', value: 'Ingin membangun keluarga yang tenang dan saling menguatkan, dengan restu keluarga.', declared: true }] },
            { id: 'kriteria', title: 'Kriteria calon', fields: [{ label: 'Kriteria', value: 'Jujur, sabar, dan terbuka berdiskusi.', declared: true }] }]
          : c.sections,
        lockedSections: unlocked ? [] : c.lockedSections,
        relation,
        ...(t ? { relatedTaArufId: t.id } : {}),
        capabilities: { ...caps, canSendRequest: caps.canSendRequest && relation === 'none' },
      });
    });
  }

  /* ------------------------------ introductions ----------------------------- */

  listRequests() {
    return this.run(() => {
      if (this.world.persona === 'participant') return ok(this.world.taaruf.map((t) => this.taarufView(t)));
      if (this.world.persona === 'pendamping') return ok(this.world.taaruf.filter((t) => this.isPendampingMember(t)).map((t) => this.taarufView(t)));
      return fail<TaArufSummary[]>('FORBIDDEN');
    });
  }
  getTaaruf(id: string) {
    return this.run(() => {
      if (this.world.persona !== 'participant' && this.world.persona !== 'pendamping') return fail<TaArufSummary>('FORBIDDEN');
      const t = this.findTaaruf(id);
      return t ? ok(this.taarufView(t)) : fail<TaArufSummary>('NOT_FOUND');
    });
  }
  request(candidateId: string) {
    return this.run<TaArufSummary>(() => {
      const g = this.guardBrowse<TaArufSummary>();
      if (g) return g;
      const c = this.candidate(candidateId);
      if (!c || c.blocked) return fail('NOT_FOUND');
      const existing = this.world.taaruf.find((t) => t.counterpartId === candidateId && t.requestStatus === 'pending_recipient');
      if (existing) return ok(this.taarufView(existing)); // idempotent: double tap never creates duplicates
      if (!c.discoveryOptIn) return fail('NOT_FOUND');
      if (this.hasExclusive()) return fail('EXCLUSIVITY_CONFLICT');
      const assignment = this.participantAssignment();
      if (this.world.nomination.status !== 'accepted' || !assignment) return fail('PENDAMPING_REQUIRED');
      if (this.world.cv.status !== 'published') return fail('VALIDATION_ERROR', 'Terbitkan CV Anda terlebih dahulu.');
      const t: MockTaaruf = {
        id: this.id('tar'), direction: 'outgoing', createdAt: this.now(), counterpartId: candidateId,
        requestStatus: 'pending_recipient', conversationStatus: 'locked', exclusiveReservation: false,
        acceptedA: true, acceptedB: false, approvalA: 'invited', approvalB: 'invited',
        pendampingA: { accountId: assignment.pendampingAccountId, displayName: this.world.nomination.pendampingDisplayName ?? 'Pendamping', authorizedFrom: assignment.authorizedFrom, membership: 'approved' },
      };
      this.world.taaruf.unshift(t);
      return ok(this.taarufView(t));
    }, { mutates: true });
  }
  private reserve(t: MockTaaruf) {
    t.acceptedA = true;
    t.acceptedB = true;
    t.requestStatus = 'waiting_pendamping';
    t.exclusiveReservation = true;
    t.approvalA = 'pending';
    t.approvalB = 'pending';
    t.expiresAt = minutesAhead(this.world.clockOffsetMinutes + MOCK_RESERVATION_MINUTES);
    for (const o of this.world.taaruf) {
      if (o !== t && o.requestStatus === 'pending_recipient') {
        o.requestStatus = 'unavailable';
        o.closedReason = 'exclusivity_unavailable';
        o.closedAt = this.now();
      }
    }
  }
  accept(id: string) {
    return this.run<TaArufSummary>(() => {
      const t = this.findTaaruf(id);
      if (!t || this.world.persona !== 'participant') return fail('NOT_FOUND');
      if (t.direction !== 'incoming' || t.requestStatus !== 'pending_recipient') return fail('EXPIRED');
      if (!this.participantEligible()) return fail('IDENTITY_PENDING');
      if (!this.participantAssignment(t.pendampingA.accountId)) return fail('PENDAMPING_REQUIRED');
      if (this.hasExclusive() || t.conflictOnAccept) {
        // Server lost the atomic race: neutral, non-personal outcome.
        t.requestStatus = 'unavailable';
        t.closedReason = 'exclusivity_unavailable';
        t.closedAt = this.now();
        this.emit();
        return fail('EXCLUSIVITY_CONFLICT');
      }
      this.reserve(t);
      return ok(this.taarufView(t));
    }, { mutates: true });
  }
  decline(id: string) {
    return this.run<void>(() => {
      const t = this.findTaaruf(id);
      if (!t || t.direction !== 'incoming' || t.requestStatus !== 'pending_recipient') return fail('NOT_FOUND');
      t.requestStatus = 'declined';
      t.closedReason = 'declined_by_recipient';
      t.closedAt = this.now();
      return ok(undefined);
    }, { mutates: true });
  }
  cancel(id: string) {
    return this.run<void>(() => {
      const t = this.findTaaruf(id);
      if (!t || this.world.persona !== 'participant') return fail('NOT_FOUND');
      if (!this.taarufView(t).capabilities.canCancel) return fail('FORBIDDEN');
      t.requestStatus = 'cancelled';
      t.closedReason = 'cancelled_by_requester';
      t.closedAt = this.now();
      this.release(t);
      return ok(undefined);
    }, { mutates: true });
  }
  approveAsPendamping(id: string) {
    return this.run<TaArufSummary>(() => {
      if (this.world.persona !== 'pendamping') return fail('FORBIDDEN');
      const t = this.findTaaruf(id);
      if (!t) return fail('NOT_FOUND');
      if (this.acc.identityStatus !== 'approved') return fail('IDENTITY_PENDING');
      if (t.approvalA !== 'pending' || t.requestStatus !== 'waiting_pendamping') return fail('FORBIDDEN');
      t.approvalA = 'approved';
      t.approvalAAt = this.now();
      this.maybeActivate(t);
      return ok(this.taarufView(t));
    }, { mutates: true });
  }
  declineAsPendamping(id: string) {
    return this.run<void>(() => {
      if (this.world.persona !== 'pendamping') return fail('FORBIDDEN');
      const t = this.findTaaruf(id);
      if (!t) return fail('NOT_FOUND');
      if (this.acc.identityStatus !== 'approved') return fail('IDENTITY_PENDING');
      if (t.approvalA !== 'pending' || t.requestStatus !== 'waiting_pendamping') return fail('FORBIDDEN');
      t.approvalA = 'declined';
      t.approvalAAt = this.now();
      t.requestStatus = 'cancelled';
      t.closedReason = 'pendamping_declined';
      t.closedAt = this.now();
      this.release(t);
      return ok(undefined);
    }, { mutates: true });
  }
  private maybeActivate(t: MockTaaruf) {
    // Side B's assignment is seeded with the fictional candidate; real backend rechecks both sides.
    if (t.acceptedA && t.acceptedB && t.exclusiveReservation && t.approvalA === 'approved' && t.approvalB === 'approved' && t.requestStatus === 'waiting_pendamping'
      && t.pendampingA.membership === 'approved' && this.participantAssignment(t.pendampingA.accountId) && this.candidate(t.counterpartId)?.pendamping.accountId) {
      t.requestStatus = 'active';
      t.conversationStatus = 'active';
      delete t.expiresAt;
      this.syncAssignment(t);
    }
  }

  /* ------------------------------ conversation ------------------------------ */

  getRoom(id: string) {
    return this.getTaaruf(id);
  }
  private visibleMessages(t: MockTaaruf) {
    if (t.conversationStatus === 'locked') return [];
    const from = this.world.persona === 'pendamping' ? t.pendampingA.authorizedFrom : '';
    return this.world.messages.filter((m) => m.roomId === t.id && m.sentAt >= from);
  }
  listEnvelopes(id: string) {
    return this.run<EncryptedMessageEnvelope[]>(() => {
      const t = this.findTaaruf(id);
      if (!t) return fail('FORBIDDEN');
      return ok(this.visibleMessages(t)
        .map((m) => ({ id: m.id, roomId: m.roomId, senderId: m.senderId, senderRole: m.senderRole, sentAt: m.sentAt, keyEpochId: m.keyEpochId, ciphertext: MOCK_CIPHER_PREFIX + encodeURIComponent(m.body) })));
    });
  }
  sendEnvelope(id: string, env: EncryptedMessageEnvelope) {
    return this.run<{ messageId: string }>(() => {
      const t = this.findTaaruf(id);
      if (!t) return fail('FORBIDDEN');
      if (!this.taarufView(t).capabilities.canSendMessage) return fail('FORBIDDEN', 'Percakapan sedang tidak dapat menerima pesan.');
      const body = env.ciphertext.startsWith(MOCK_CIPHER_PREFIX) ? decodeURIComponent(env.ciphertext.slice(MOCK_CIPHER_PREFIX.length)) : '';
      if (!body.trim()) return fail('VALIDATION_ERROR', 'Pesan kosong.');
      const messageId = this.id('msg');
      this.world.messages.push({ id: messageId, roomId: id, senderId: this.acc.id, senderRole: this.world.persona === 'pendamping' ? 'pendamping' : 'participant', sentAt: this.now(), body, keyEpochId: env.keyEpochId });
      return ok({ messageId });
    }, { mutates: true });
  }
  exit(id: string) {
    return this.run<void>(() => {
      const t = this.findTaaruf(id);
      if (!t || this.world.persona !== 'participant') return fail('NOT_FOUND');
      if (!this.taarufView(t).capabilities.canExit) return fail('FORBIDDEN');
      t.conversationStatus = 'ended';
      t.closedReason = t.closedReason === 'reported' ? 'reported' : 'participant_exit';
      t.closedAt = this.now();
      this.release(t);
      this.syncAssignment(t);
      return ok(undefined);
    }, { mutates: true });
  }
  pauseOrResume() {
    return this.run<void>(() => fail('FORBIDDEN', 'Kebijakan jeda belum ditetapkan.'));
  }

  /* --------------------------------- photos --------------------------------- */

  private photoRecipient() {
    const room = this.world.taaruf.find((t) => t.requestStatus === 'active' && t.conversationStatus === 'active');
    const candidate = room && this.candidate(room.counterpartId);
    return candidate && !candidate.blocked ? candidate.summary : undefined;
  }

  private photoOverview(): PhotoPrivacyOverview {
    const recipient = this.photoRecipient();
    return {
      hasPhoto: this.world.photoUploaded,
      ...(this.world.photoUploaded ? { ownerPreviewUrl: ownerPortrait } : {}),
      grants: this.world.photoGrants.filter((g) => g.ownerId === this.acc.id).map(publicGrant),
      eligibleRecipients: recipient ? [{ id: recipient.id, displayName: recipient.displayName, role: 'participant' }] : [],
    };
  }
  getPhotoOverview() {
    return this.run(() => (this.world.persona === 'participant' ? ok(this.photoOverview()) : fail<PhotoPrivacyOverview>('FORBIDDEN')));
  }
  requestGrant(ids: string[]) {
    return this.run(() => {
      if (this.world.persona !== 'participant') return fail<PhotoPrivacyOverview>('FORBIDDEN');
      const ov = this.photoOverview();
      if (!ov.hasPhoto) return fail<PhotoPrivacyOverview>('VALIDATION_ERROR', 'Unggah foto terlebih dahulu.');
      if (ids.length !== 1) return fail<PhotoPrivacyOverview>('VALIDATION_ERROR', 'Pilih pasangan ta’aruf aktif Anda.');
      const r = ov.eligibleRecipients.find((x) => x.id === ids[0]);
      if (!r) return fail<PhotoPrivacyOverview>('FORBIDDEN');
      const existing = this.world.photoGrants.some((g) => g.ownerId === this.acc.id && g.recipientId === r.id && g.status !== 'revoked');
      if (!existing) this.world.photoGrants.unshift({ id: this.id('pg'), ownerId: this.acc.id, recipientId: r.id, recipientDisplayName: r.displayName, recipientRole: r.role, status: 'pendamping_pending', updatedAt: this.now() });
      return ok(this.photoOverview());
    }, { mutates: true });
  }
  confirmGrant(grantId: string) {
    return this.run<void>(() => {
      if (this.world.persona !== 'pendamping') return fail('FORBIDDEN');
      if (this.acc.identityStatus !== 'approved') return fail('IDENTITY_PENDING');
      const g = this.world.photoGrants.find((x) => x.id === grantId);
      // Confirmation returns no photo. Only the owner's assigned pendamping may act.
      if (!g || g.status !== 'pendamping_pending' || !this.world.photoUploaded || g.recipientId !== this.photoRecipient()?.id || !this.activeAssignmentFor(g.ownerId)) return fail('NOT_FOUND');
      g.status = 'active';
      g.updatedAt = this.now();
      return ok(undefined);
    }, { mutates: true });
  }
  revokeGrant(grantId: string) {
    return this.run(() => {
      const g = this.world.photoGrants.find((x) => x.id === grantId);
      if (!g || this.world.persona !== 'participant' || g.ownerId !== this.acc.id) return fail<PhotoPrivacyOverview>('NOT_FOUND');
      if (g.status === 'revoked') return ok(this.photoOverview());
      g.status = 'revoked';
      g.updatedAt = this.now();
      return ok(this.photoOverview());
    }, { mutates: true });
  }

  /* --------------------------------- safety --------------------------------- */

  submitReport(input: ReportInput) {
    return this.run(() => {
      const { otherReason } = input;
      if (this.world.persona !== 'participant' && !(this.world.persona === 'pendamping' && input.roomId)) return fail<{ reportId: string; status: 'received' }>('FORBIDDEN');
      if (!REPORT_CATEGORIES.includes(input.category)) return fail<{ reportId: string; status: 'received' }>('VALIDATION_ERROR', undefined, { category: 'Pilih kategori laporan.' });
      if (input.category === 'other' && !validReportOtherReason(otherReason)) return fail<{ reportId: string; status: 'received' }>('VALIDATION_ERROR', 'Tulis alasan dalam satu baris, maksimal 100 karakter.');
      const t = input.roomId ? this.findTaaruf(input.roomId) : undefined;
      const room = t && this.taarufView(t);
      if (!this.candidate(input.subjectUserId) || (input.roomId && (!room || room.counterpart.id !== input.subjectUserId || !room.capabilities.canReport))) return fail<{ reportId: string; status: 'received' }>('NOT_FOUND');
      // Mock has plaintext; production validates provenance without access to room plaintext.
      const visible = t && input.evidence.length ? this.visibleMessages(t) : [];
      const evidence: ReportInput['evidence'] = [];
      for (const item of input.evidence) {
        const m = visible.find((m) => m.id === item.messageId && m.senderId !== this.acc.id);
        if (!m || m.body !== item.body || evidence.some((e) => e.messageId === m.id)) return fail<{ reportId: string; status: 'received' }>('VALIDATION_ERROR', 'Bukti tidak cocok dengan pesan yang dapat Anda pilih.');
        evidence.push({ messageId: m.id, body: m.body, sentAt: m.sentAt, senderRole: m.senderRole, senderDisplay: room?.members.find((member) => member.accountId === m.senderId)?.displayName ?? 'Anggota sebelumnya' });
      }
      if (this.world.reportSubmissionFails) return fail<{ reportId: string; status: 'received' }>('SERVICE_UNAVAILABLE');
      const ref = `LAP-2611-${this.seq + 1}`;
      this.world.reportCases.unshift({
        id: this.id('rc'), ref, reporterDisplay: `${this.acc.displayName} (pelapor)`, subjectDisplay: this.candidate(input.subjectUserId)?.summary.displayName ?? 'Pengguna',
        category: input.category, receivedAt: this.now(), priority: ['scam_or_money', 'harassment'].includes(input.category) ? 'high' : 'normal',
        status: 'received', description: input.description, ...(input.category === 'other' && otherReason ? { otherReason: otherReason.trim() } : {}), evidence, notes: [],
        audit: [{ id: this.id('au'), at: this.now(), actor: 'Sistem', action: 'Laporan diterima', entity: ref }],
      });
      if (t?.requestStatus === 'active' && t.conversationStatus !== 'ended') {
        const alsoExit = input.alsoExit && room?.capabilities.canExit;
        if (alsoExit || t.conversationStatus !== 'frozen_reported') {
          t.conversationStatus = alsoExit ? 'ended' : 'frozen_reported';
          t.closedReason = 'reported';
          t.closedAt = this.now();
          this.release(t);
          this.syncAssignment(t);
        }
      }
      return ok({ reportId: ref, status: 'received' as const });
    }, { mutates: true });
  }
  block(userId: string) {
    return this.run<void>(() => {
      if (this.world.persona !== 'participant') return fail('FORBIDDEN');
      const c = this.candidate(userId);
      if (!c) return fail('NOT_FOUND');
      c.blocked = true;
      for (const t of this.world.taaruf.filter((x) => x.counterpartId === userId)) {
        if (t.requestStatus === 'active') t.conversationStatus = 'ended';
        else if (!TERMINAL.includes(t.requestStatus)) t.requestStatus = 'cancelled';
        t.closedReason = 'participant_exit';
        t.closedAt = this.now();
        this.release(t);
        this.syncAssignment(t);
      }
      return ok(undefined);
    }, { mutates: true });
  }

  /* -------------------------------- pendamping ------------------------------ */

  pendampingHome() {
    return this.run<PendampingHome>(() => {
      if (this.world.persona !== 'pendamping') return fail('FORBIDDEN');
      const mine = this.world.taaruf.filter((t) => this.isPendampingMember(t));
      return ok({
        invitations: this.world.guardianInvitations.filter((i) => i.inviteeAccountId === this.acc.id).map(publicInvitation),
        pendingApprovals: mine.filter((t) => t.approvalA === 'pending' && t.requestStatus === 'waiting_pendamping').map((t) => this.taarufView(t)),
        assignments: this.world.guardianAssignments.filter((a) => a.pendampingAccountId === this.acc.id).map(publicAssignment),
        history: mine.filter((t) => TERMINAL.includes(t.requestStatus) || t.conversationStatus === 'ended').map((t) => this.taarufView(t)),
        photoConfirmations: this.world.photoGrants
          .filter((g) => g.status === 'pendamping_pending' && this.world.photoUploaded && g.recipientId === this.photoRecipient()?.id && !!this.activeAssignmentFor(g.ownerId))
          .map((g) => ({ ...publicGrant(g), ownerDisplayName: this.world.accounts.participant.displayName })),
      });
    });
  }
  getInvitation(id: string) {
    return this.run(() => {
      if (this.world.persona !== 'pendamping') return fail<never>('FORBIDDEN');
      const inv = this.world.guardianInvitations.find((i) => i.id === id && i.inviteeAccountId === this.acc.id);
      return inv ? ok({ ...publicInvitation(inv), viewerIdentityStatus: this.acc.identityStatus }) : fail<never>('NOT_FOUND');
    });
  }
  respondInvitation(id: string, accept: boolean) {
    return this.run(() => {
      if (this.world.persona !== 'pendamping') return fail<never>('NOT_FOUND');
      const inv = this.world.guardianInvitations.find((i) => i.id === id && i.inviteeAccountId === this.acc.id);
      if (!inv) return fail<never>('NOT_FOUND');
      if (inv.inviterId === this.acc.id) return fail<never>('FORBIDDEN');
      if (inv.status === 'expired' || (inv.expiresAt && inv.expiresAt <= minutesAhead(this.world.clockOffsetMinutes))) return fail<never>('EXPIRED');
      if (inv.status !== 'pending') return fail<never>('FORBIDDEN');
      if (accept && this.acc.identityStatus !== 'approved') return fail<never>('IDENTITY_PENDING');
      inv.status = accept ? 'accepted' : 'declined';
      if (accept) {
        this.world.nomination = { ...this.world.nomination, status: 'accepted', pendampingDisplayName: this.acc.displayName, pendampingIdentity: 'approved' };
        this.world.guardianAssignments.push({ assignmentId: this.id('asg'), participantId: inv.inviterId, pendampingAccountId: this.acc.id, participantDisplayName: inv.inviterDisplayName, status: 'active', authorizedFrom: this.now() });
      } else {
        this.world.nomination = { ...this.world.nomination, status: 'declined' };
      }
      return ok({ ...publicInvitation(inv), viewerIdentityStatus: this.acc.identityStatus });
    }, { mutates: true });
  }
  withdraw(assignmentId: string) {
    return this.run<void>(() => {
      if (this.world.persona !== 'pendamping') return fail('NOT_FOUND');
      const a = this.world.guardianAssignments.find((x) => x.assignmentId === assignmentId && x.pendampingAccountId === this.acc.id);
      if (!a || a.status !== 'active') return fail('NOT_FOUND');
      // Collect rooms before the assignment flips, because membership depends on it.
      const rooms = this.world.taaruf.filter((x) => this.isPendampingMember(x));
      a.status = 'withdrawn';
      for (const t of rooms) {
        t.pendampingA.membership = 'withdrawn';
        if (t.requestStatus === 'active' && t.conversationStatus === 'active') t.conversationStatus = 'paused_guardian_missing';
        if (t.requestStatus === 'active') t.approvalA = 'withdrawn';
        if (t.requestStatus === 'waiting_pendamping') { t.approvalA = 'withdrawn'; }
      }
      a.roomStatus = a.roomStatus === 'active' ? 'paused_guardian_missing' : a.roomStatus;
      this.world.nomination = { id: this.world.nomination.id, status: 'not_invited' };
      return ok(undefined);
    }, { mutates: true });
  }

  /* --------------------------------- staff ---------------------------------- */

  private page<T>(items: T[], page = 1): Page<T> {
    const p = Math.max(1, page);
    return { items: items.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), total: items.length, page: p, pageSize: PAGE_SIZE };
  }
  private audit(action: string, entity: string, reason?: string) {
    const e = { id: this.id('au'), at: this.now(), actor: this.acc.displayName, action, entity, ...(reason ? { reason } : {}) };
    this.world.audit.unshift(e);
    return e;
  }
  staffOverview() {
    return this.run(() => {
      if (!this.isStaff('moderator') && !this.isStaff('admin')) return fail<never>('FORBIDDEN');
      return ok({
        pendingVerification: this.world.verificationCases.filter((c) => c.state === 'pending').length,
        pendingReports: this.world.reportCases.filter(isOpenReport).length,
        highPriorityReports: this.world.reportCases.filter((c) => c.priority === 'high' && isOpenReport(c)).length,
        handledToday: this.world.audit.filter((a) => a.actor === this.acc.displayName).length,
      });
    });
  }
  listVerification(f: CaseFilters) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      const items = this.world.verificationCases
        .filter((c) => !f.status || f.status === 'all' || c.state === f.status)
        .map(({ id, caseRef, submittedAt, stage, assignee, ageEligibility, state }) => ({ id, caseRef, submittedAt, stage, ageEligibility, state, ...(assignee ? { assignee } : {}) }));
      return ok(this.page(items, f.page));
    });
  }
  getVerification(id: string) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      const c = this.world.verificationCases.find((x) => x.id === id);
      return c ? ok(c) : fail<never>('NOT_FOUND');
    });
  }
  reviewVerification(id: string, d: VerificationDecision) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      const c = this.world.verificationCases.find((x) => x.id === id);
      if (!c) return fail<never>('NOT_FOUND');
      if (c.state !== 'pending') return fail<never>('VALIDATION_ERROR', 'Kasus ini sudah diputuskan.');
      if (d.kind !== 'approve' && d.reason.trim().length < 10) return fail<never>('VALIDATION_ERROR', undefined, { reason: 'Tuliskan alasan minimal 10 karakter.' });
      c.state = d.kind === 'approve' ? 'approved' : d.kind === 'reject' ? 'rejected' : 'resubmission_requested';
      c.stage = d.kind === 'approve' ? 'approved' : d.kind === 'reject' ? 'rejected' : 'resubmission_required';
      c.assignee = this.acc.displayName;
      const label = d.kind === 'approve' ? 'Verifikasi disetujui' : d.kind === 'reject' ? 'Verifikasi ditolak' : 'Diminta perbaikan dokumen';
      c.audit.unshift(this.audit(label, c.caseRef, d.kind === 'approve' ? undefined : d.reason));
      return ok(c);
    }, { mutates: true });
  }
  listReportCases(f: CaseFilters) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      const items = this.world.reportCases
        .filter((c) => (!f.status || f.status === 'all' || (f.status === 'open' ? isOpenReport(c) : c.status === f.status)))
        .filter((c) => !f.priority || f.priority === 'all' || c.priority === f.priority)
        .sort((a, b) => reportPriority[a.priority] - reportPriority[b.priority] || b.receivedAt.localeCompare(a.receivedAt))
        .map(({ id, ref, reporterDisplay, category, receivedAt, priority, assignee, status }) => ({ id, ref, reporterDisplay, category, receivedAt, priority, status, ...(assignee ? { assignee } : {}) }));
      return ok(this.page(items, f.page));
    });
  }
  getReportCase(id: string) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      const c = this.world.reportCases.find((x) => x.id === id);
      return c ? ok(c) : fail<never>('NOT_FOUND');
    });
  }
  updateReport(id: string, a: ReportCaseAction) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      const c = this.world.reportCases.find((x) => x.id === id);
      if (!c) return fail<never>('NOT_FOUND');
      if (a.kind === 'note') {
        if (!a.text.trim()) return fail<never>('VALIDATION_ERROR', undefined, { text: 'Catatan kosong.' });
        c.notes.push({ at: this.now(), author: this.acc.displayName, text: a.text.trim() });
        return ok(c);
      }
      if (a.reason.trim().length < 10) return fail<never>('VALIDATION_ERROR', undefined, { reason: 'Tuliskan alasan minimal 10 karakter.' });
      const labels = { warn: 'Peringatan dikirim', suspend: 'Akun ditangguhkan', ban: 'Akun diblokir permanen', close: 'Laporan ditutup' } as const;
      c.status = a.kind === 'close' ? 'closed' : 'actioned';
      c.assignee = this.acc.displayName;
      c.audit.unshift(this.audit(labels[a.kind], c.ref, a.reason));
      return ok(c);
    }, { mutates: true });
  }
  listMyActions(page?: number) {
    return this.run(() => {
      if (!this.isStaff('moderator')) return fail<never>('FORBIDDEN');
      return ok(this.page(this.world.audit.filter((a) => a.actor === this.acc.displayName), page));
    });
  }
  listUsers(query: string, page?: number) {
    return this.run(() => {
      if (!this.isStaff('admin')) return fail<never>('FORBIDDEN');
      const q = query.trim().toLowerCase();
      return ok(this.page(this.world.users.filter((u) => !q || u.displayName.toLowerCase().includes(q)), page));
    });
  }
  actOnUser(id: string, a: AdminUserAction) {
    return this.run(() => {
      if (!this.isStaff('admin')) return fail<never>('FORBIDDEN');
      const u = this.world.users.find((x) => x.id === id);
      if (!u) return fail<never>('NOT_FOUND');
      if (a.reason.trim().length < 10) return fail<never>('VALIDATION_ERROR', undefined, { reason: 'Tuliskan alasan minimal 10 karakter.' });
      u.accountState = a.kind === 'restore' ? 'active' : a.kind === 'suspend' ? 'suspended' : 'banned';
      this.audit(a.kind === 'restore' ? 'Akun dipulihkan' : a.kind === 'suspend' ? 'Akun ditangguhkan' : 'Akun diblokir permanen', u.displayName, a.reason);
      return ok(u);
    }, { mutates: true });
  }
  listRoles() {
    return this.run(() => (this.isStaff('admin') ? ok({ items: this.world.roles, editable: false }) : fail<never>('FORBIDDEN')));
  }
  listAudit(f: { actor?: string; action?: string; page?: number }) {
    return this.run(() => {
      if (!this.isStaff('admin')) return fail<never>('FORBIDDEN');
      const items = this.world.audit
        .filter((a) => !f.actor || a.actor.toLowerCase().includes(f.actor.toLowerCase()))
        .filter((a) => !f.action || a.action.toLowerCase().includes(f.action.toLowerCase()));
      return ok(this.page(items, f.page));
    });
  }

  /* ---------------------- dev-only simulation controls ---------------------- */

  private current(): MockTaaruf | undefined {
    return this.world.taaruf.find((t) => t.exclusiveReservation && !TERMINAL.includes(t.requestStatus) && t.requestStatus !== 'pending_recipient')
      ?? this.world.taaruf.find((t) => t.direction === 'outgoing' && t.requestStatus === 'pending_recipient');
  }
  simulate(kind: SimulationKind): string {
    this.expireReservations();
    const t = this.current();
    const done = (msg: string) => { this.emit(); return msg; };
    switch (kind) {
      case 'counterpart_accepts':
        if (!t || t.requestStatus !== 'pending_recipient') return 'Tidak ada pengajuan keluar yang menunggu.';
        if (this.hasExclusive()) return 'Sudah ada reservasi eksklusif.';
        if (!this.participantAssignment(t.pendampingA.accountId)) return 'Pendamping Anda belum aktif.';
        this.reserve(t);
        return done('Calon menerima pengajuan (simulasi).');
      case 'own_pendamping_approves':
        if (!t || t.approvalA !== 'pending' || !this.participantAssignment(t.pendampingA.accountId)
          || this.world.accounts.pendamping.id !== t.pendampingA.accountId || this.world.accounts.pendamping.identityStatus !== 'approved') return 'Tidak ada pendamping terverifikasi yang dapat menyetujui.';
        t.approvalA = 'approved'; t.approvalAAt = this.now(); this.maybeActivate(t);
        return done('Pendamping Anda menyetujui (simulasi).');
      case 'other_pendamping_approves':
        if (!t || t.approvalB !== 'pending') return 'Tidak ada persetujuan pendamping pihak lain yang tertunda.';
        t.approvalB = 'approved'; t.approvalBAt = this.now(); this.maybeActivate(t);
        return done('Pendamping pihak lain menyetujui (simulasi).');
      case 'other_pendamping_declines':
        if (!t || t.approvalB !== 'pending') return 'Tidak ada persetujuan pendamping pihak lain yang tertunda.';
        t.approvalB = 'declined'; t.requestStatus = 'cancelled'; t.closedReason = 'pendamping_declined'; t.closedAt = this.now(); this.release(t);
        return done('Pendamping pihak lain tidak menyetujui (simulasi).');
      case 'own_pendamping_withdraws':
        if (!t || t.conversationStatus !== 'active') return 'Tidak ada ruang aktif.';
        t.pendampingA.membership = 'withdrawn'; t.approvalA = 'withdrawn'; t.conversationStatus = 'paused_guardian_missing';
        for (const a of this.world.guardianAssignments) if (a.pendampingAccountId === t.pendampingA.accountId && a.status === 'active') { a.status = 'withdrawn'; a.roomStatus = 'paused_guardian_missing'; }
        this.world.nomination = { id: this.world.nomination.id, status: 'not_invited' };
        return done('Pendamping Anda mengundurkan diri (simulasi).');
      case 'replacement_approved':
        if (!t || t.conversationStatus !== 'paused_guardian_missing') return 'Ruang tidak sedang menunggu pengganti.';
        t.pendampingA = { accountId: IDS.replacementA, displayName: 'Ibu Khadijah N.', authorizedFrom: this.now(), membership: 'approved' };
        t.approvalA = 'approved'; t.conversationStatus = 'active';
        this.world.guardianAssignments.push({ assignmentId: this.id('asg'), participantId: this.world.accounts.participant.id, pendampingAccountId: IDS.replacementA, participantDisplayName: this.world.accounts.participant.displayName, status: 'active', activeTaArufId: t.id, roomStatus: 'active', authorizedFrom: t.pendampingA.authorizedFrom });
        this.world.nomination = { id: 'nom-r', status: 'accepted', pendampingDisplayName: 'Ibu Khadijah N.', pendampingIdentity: 'approved' };
        return done('Pendamping pengganti disetujui; kunci keanggotaan perlu dirotasi oleh protokol nyata (simulasi).');
      case 'counterpart_message': {
        if (!t || t.conversationStatus !== 'active') return 'Tidak ada ruang aktif.';
        this.world.messages.push({ id: this.id('msg'), roomId: t.id, senderId: t.counterpartId, senderRole: 'participant', sentAt: this.now(), body: 'Terima kasih atas jawabannya. Insyaallah saya akan diskusikan juga dengan keluarga.', keyEpochId: 'epoch-1' });
        return done('Pesan fiktif dari calon ditambahkan (simulasi).');
      }
      case 'kyc_approve':
        this.world.accounts[this.world.persona].identityStatus = 'approved';
        return done('Verifikasi disetujui (simulasi).');
    }
  }
}

export type SimulationKind =
  | 'counterpart_accepts' | 'own_pendamping_approves' | 'other_pendamping_approves' | 'other_pendamping_declines'
  | 'own_pendamping_withdraws' | 'replacement_approved' | 'counterpart_message' | 'kyc_approve';

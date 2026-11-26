/**
 * HTTP adapters: implement every service interface against the PROPOSED endpoints in ./endpoints.
 * Pages are unchanged; only this layer knows about URLs. Until the backend exists, calls fail
 * honestly (SERVICE_UNAVAILABLE / NETWORK_ERROR / NOT_FOUND) and nothing falls back to mock data.
 *
 * The message codec is NOT implemented here: real E2EE needs a separately reviewed protocol, so
 * the pending codec refuses to encode/decode and chat screens show "service unavailable".
 */
import type {
  ActionResult, AdminUser, AuditEntry, CandidateDetail, CvDraft, CvSchema, EncryptedMessageEnvelope,
  GuardianInvitationView, IdentityStatus, Page, PendampingHome, PendampingNomination, PhotoPrivacyOverview, ReportCaseDetail,
  ReportCaseSummary, ReportReceipt, RoleAssignment, StaffOverview, TaArufSummary, UploadHandle, VerificationCaseDetail,
  VerificationCaseSummary, ViewerContext,
} from '@/domain/types';
import { ServiceError } from '../errors';
import type { MessageCodec, ServiceEvents, Services } from '../interfaces';
import { createHttpClient, type HttpClient, type HttpClientOptions } from './client';
import { API } from './endpoints';

export interface HttpServicesOptions extends HttpClientOptions {
  /** Pre-built client (tests). Otherwise one is created from the other options. */
  client?: HttpClient;
  /** Change notifications, e.g. Inertia `router.on('navigate')` or a websocket. Default: none. */
  events?: ServiceEvents;
  /** Reviewed E2EE codec once it exists. Default: a codec that refuses to run. */
  codec?: MessageCodec;
}

/** Refuses to decode or encode: there is no reviewed E2EE implementation yet. */
export const pendingCodec: MessageCodec = {
  isReviewedE2EE: false,
  decodeForViewer: async () => { throw new ServiceError('SERVICE_UNAVAILABLE', 'E2EE codec not integrated'); },
  encodeForRoom: async () => { throw new ServiceError('SERVICE_UNAVAILABLE', 'E2EE codec not integrated'); },
};

const noEvents: ServiceEvents = { subscribe: () => () => undefined };

export function createHttpServices(opts: HttpServicesOptions = {}): Services {
  const http = opts.client ?? createHttpClient(opts);
  const then = async <A, B>(p: Promise<ActionResult<A>>, f: (a: A) => Promise<ActionResult<B>> | ActionResult<B>): Promise<ActionResult<B>> => {
    const r = await p;
    return r.ok ? f(r.data) : r;
  };

  return {
    mode: 'http',
    auth: { // @owner Marinasi
      getViewer: () => http.get<ViewerContext>(API.viewer),
      // Fortify answers a JSON login with 200/204 and no viewer, so read it right after.
      login: (i) => then(http.post<unknown>(API.login, { email: i.email, password: i.password }), () => http.get<ViewerContext>(API.viewer)),
      register: (i) => then(http.post<unknown>(API.register, {
        role: i.role, name: i.displayName, email: i.email, password: i.password, password_confirmation: i.password,
        date_of_birth: i.dateOfBirth, accept_purpose: i.acceptPurpose, accept_terms: i.acceptTerms, accept_privacy: i.acceptPrivacy,
      }), () => ({ ok: true, data: { emailConfirmationPending: true } })),
      logout: () => http.post<void>(API.logout),
    },
    identity: { // @owner BrandyKeun + EAAA
      getStatus: () => http.get<IdentityStatus>(API.identityStatus),
      upload: (kind, file) => {
        const form = new FormData();
        form.append('kind', kind);
        form.append('file', file);
        return http.upload<UploadHandle>(API.identityUploads, form);
      },
      submitVerification: (i) => http.post<{ status: IdentityStatus }>(API.identityVerifications, i),
    },
    profile: { // @owner Marinasi
      getCvSchema: () => http.get<CvSchema>(API.cvSchema),
      getCv: () => http.get<CvDraft>(API.cv),
      saveCvDraft: (values) => http.put<CvDraft>(API.cvDraft, { values }),
      publishCv: () => http.post<CvDraft>(API.cvPublish),
      getNomination: () => http.get<PendampingNomination>(API.nomination),
      invitePendamping: (contact) => http.post<PendampingNomination>(API.nomination, { contact }),
      cancelNomination: () => http.delete<PendampingNomination>(API.nomination),
    },
    candidates: { // @owner BrandyKeun
      // Mock-only until a real contract can keep preferences out of URLs and enforce opt-in.
      browse: async () => ({ ok: false, code: 'SERVICE_UNAVAILABLE' }),
      getDetail: (cid) => http.get<CandidateDetail>(API.candidate(cid)),
      getVisibility: async () => ({ ok: false, code: 'SERVICE_UNAVAILABLE' }),
      setVisibility: async () => ({ ok: false, code: 'SERVICE_UNAVAILABLE' }),
    },
    introductions: { // @owner Khaslana
      listRequests: () => http.get<TaArufSummary[]>(API.taaruf),
      get: (tid) => http.get<TaArufSummary>(API.taarufItem(tid)),
      request: (candidateId) => http.post<TaArufSummary>(API.taaruf, { candidateId }),
      accept: (tid) => http.post<TaArufSummary>(API.taarufAction(tid, 'accept')),
      decline: (tid) => http.post<void>(API.taarufAction(tid, 'decline')),
      cancel: (tid) => http.post<void>(API.taarufAction(tid, 'cancel')),
      approveAsPendamping: (tid) => http.post<TaArufSummary>(API.taarufAction(tid, 'pendamping-approve')),
      declineAsPendamping: (tid) => http.post<void>(API.taarufAction(tid, 'pendamping-decline')),
    },
    conversations: { // @owner Khaslana (lifecycle) + BrandyKeun (envelopes)
      getRoom: (tid) => http.get<TaArufSummary>(API.room(tid)),
      listEncryptedMessages: (tid) => http.get<EncryptedMessageEnvelope[]>(API.roomMessages(tid)),
      sendEncryptedMessage: (tid, envelope) => http.post<{ messageId: string }>(API.roomMessages(tid), envelope),
      exit: (tid) => http.post<void>(API.roomAction(tid, 'exit')),
      pause: (tid) => http.post<void>(API.roomAction(tid, 'pause')),
      resume: (tid) => http.post<void>(API.roomAction(tid, 'resume')),
    },
    codec: opts.codec ?? pendingCodec, // @owner BrandyKeun + security review
    photos: { // @owner BrandyKeun
      getOverview: () => http.get<PhotoPrivacyOverview>(API.photoGrants),
      requestGrant: (recipientIds) => http.post<PhotoPrivacyOverview>(API.photoGrants, { recipientIds }),
      confirmAsOwnerPendamping: (gid) => http.post<void>(API.photoGrantConfirm(gid)),
      revoke: (gid) => http.post<PhotoPrivacyOverview>(API.photoGrantRevoke(gid)),
    },
    safety: { // @owner BrandyKeun + EAAA
      submitReport: (input) => http.post<ReportReceipt>(API.reports, input),
      blockUser: (userId) => http.post<void>(API.blocks, { userId }),
    },
    pendamping: { // @owner Marinasi + Khaslana
      getHome: () => http.get<PendampingHome>(API.pendampingHome),
      getInvitation: (iid) => http.get<GuardianInvitationView>(API.invitation(iid)),
      acceptInvitation: (iid) => http.post<GuardianInvitationView>(API.invitationAction(iid, 'accept')),
      declineInvitation: (iid) => http.post<GuardianInvitationView>(API.invitationAction(iid, 'decline')),
      withdraw: (aid) => http.post<void>(API.assignmentWithdraw(aid)),
    },
    moderator: { // @owner EAAA
      getOverview: () => http.get<StaffOverview>(API.modOverview),
      listVerificationCases: (f) => http.get<Page<VerificationCaseSummary>>(API.verificationCases, { ...f }),
      getVerificationCase: (cid) => http.get<VerificationCaseDetail>(API.verificationCase(cid)),
      reviewVerification: (cid, decision) => http.post<VerificationCaseDetail>(API.verificationDecision(cid), decision),
      listReports: (f) => http.get<Page<ReportCaseSummary>>(API.reportCases, { ...f }),
      getReportEvidence: (cid) => http.get<ReportCaseDetail>(API.reportCase(cid)),
      updateReportCase: (cid, action) => http.post<ReportCaseDetail>(API.reportCaseActions(cid), action),
      listMyActions: (page) => http.get<Page<AuditEntry>>(API.myActions, { page }),
    },
    admin: { // @owner EAAA
      listUsers: (q, page) => http.get<Page<AdminUser>>(API.adminUsers, { q, page }),
      actOnUser: (uid, action) => http.post<AdminUser>(API.adminUserActions(uid), action),
      listRoleAssignments: () => http.get<{ items: RoleAssignment[]; editable: boolean }>(API.adminRoles),
      listAudit: (f) => http.get<Page<AuditEntry>>(API.adminAudit, { ...f }),
    },
    events: opts.events ?? noEvents,
  };
}

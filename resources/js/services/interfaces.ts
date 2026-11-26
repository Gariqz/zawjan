/**
 * Replaceable frontend service facade (design.md §9.1).
 * Pages depend ONLY on these interfaces. The bootstrap layer picks mock or real adapters once.
 * Ownership tags reference the backend lead for each contract (see INTEGRATION_NOTES.md).
 */
import type {
  ActionResult, AdminUser, AdminUserAction, AuditEntry, CandidateDetail, CaseFilters, CvDraft, CvSchema,
  DiscoveryConsent, DiscoveryPreferences, DiscoveryProfile, EncryptedMessageEnvelope, GuardianInvitationView, IdentityStatus, LoginInput,
  MessageView, Page, PendampingHome, PendampingNomination, PhotoPrivacyOverview, RegisterInput, ReportCaseAction,
  ReportCaseDetail, ReportCaseSummary, ReportInput, ReportReceipt, RoleAssignment, StaffOverview, TaArufSummary,
  UploadHandle, VerificationCaseDetail, VerificationCaseSummary, VerificationDecision, VerificationSubmission,
  ViewerContext,
} from '@/domain/types';

/** @owner Marinasi */
export interface AuthService {
  getViewer(): Promise<ActionResult<ViewerContext>>;
  login(input: LoginInput): Promise<ActionResult<ViewerContext>>;
  register(input: RegisterInput): Promise<ActionResult<{ emailConfirmationPending: boolean }>>;
  logout(): Promise<ActionResult<void>>;
}

/** @owner BrandyKeun (initiation) + EAAA (manual review) + Marinasi (account state) */
export interface IdentityService {
  getStatus(): Promise<ActionResult<IdentityStatus>>;
  /** Uploads go straight to the protected document store; the UI keeps only the opaque handle. */
  upload(kind: 'document' | 'selfie', file: File): Promise<ActionResult<UploadHandle>>;
  submitVerification(input: VerificationSubmission): Promise<ActionResult<{ status: IdentityStatus }>>;
}

/** @owner Marinasi */
export interface ProfileService {
  getCvSchema(): Promise<ActionResult<CvSchema>>;
  getCv(): Promise<ActionResult<CvDraft>>;
  saveCvDraft(values: Record<string, string>): Promise<ActionResult<CvDraft>>;
  publishCv(): Promise<ActionResult<CvDraft>>;
  getNomination(): Promise<ActionResult<PendampingNomination>>;
  invitePendamping(contact: string): Promise<ActionResult<PendampingNomination>>;
  cancelNomination(): Promise<ActionResult<PendampingNomination>>;
}

/** @owner BrandyKeun */
export interface CandidateService {
  browse(preferences: DiscoveryPreferences): Promise<ActionResult<{ items: DiscoveryProfile[] }>>;
  getDetail(id: string): Promise<ActionResult<CandidateDetail>>;
  getVisibility(): Promise<ActionResult<{ visible: boolean }>>;
  setVisibility(input: DiscoveryConsent): Promise<ActionResult<{ visible: boolean }>>;
}

/** @owner Khaslana */
export interface IntroductionService {
  listRequests(): Promise<ActionResult<TaArufSummary[]>>;
  get(id: string): Promise<ActionResult<TaArufSummary>>;
  request(candidateId: string): Promise<ActionResult<TaArufSummary>>;
  accept(requestId: string): Promise<ActionResult<TaArufSummary>>;
  decline(requestId: string): Promise<ActionResult<void>>;
  cancel(requestId: string): Promise<ActionResult<void>>;
  approveAsPendamping(introductionId: string): Promise<ActionResult<TaArufSummary>>;
  declineAsPendamping(introductionId: string): Promise<ActionResult<void>>;
}

/** @owner Khaslana (lifecycle) + BrandyKeun (crypto boundary) */
export interface ConversationService {
  getRoom(id: string): Promise<ActionResult<TaArufSummary>>;
  listEncryptedMessages(id: string): Promise<ActionResult<EncryptedMessageEnvelope[]>>;
  sendEncryptedMessage(id: string, envelope: EncryptedMessageEnvelope): Promise<ActionResult<{ messageId: string }>>;
  exit(id: string): Promise<ActionResult<void>>;
  pause(id: string): Promise<ActionResult<void>>;
  resume(id: string): Promise<ActionResult<void>>;
}

/**
 * Client-side message codec boundary. The real implementation MUST be a separately reviewed
 * E2EE protocol (key management, rotation on membership change). `isReviewedE2EE` gates any
 * "Terenkripsi end-to-end" wording in the UI.
 */
export interface MessageCodec {
  readonly isReviewedE2EE: boolean;
  decodeForViewer(envelopes: EncryptedMessageEnvelope[], room: TaArufSummary, viewerId: string): Promise<MessageView[]>;
  encodeForRoom(room: TaArufSummary, viewerId: string, body: string): Promise<EncryptedMessageEnvelope>;
}

/** @owner BrandyKeun */
export interface PhotoGrantService {
  getOverview(): Promise<ActionResult<PhotoPrivacyOverview>>;
  requestGrant(recipientIds: string[]): Promise<ActionResult<PhotoPrivacyOverview>>;
  confirmAsOwnerPendamping(grantId: string): Promise<ActionResult<void>>;
  revoke(grantId: string): Promise<ActionResult<PhotoPrivacyOverview>>;
}

/** @owner BrandyKeun (submission) + EAAA (review) */
export interface SafetyService {
  submitReport(input: ReportInput): Promise<ActionResult<ReportReceipt>>;
  blockUser(userId: string): Promise<ActionResult<void>>;
}

/** @owner Marinasi (assignment) + Khaslana (approvals/supervision) */
export interface PendampingService {
  getHome(): Promise<ActionResult<PendampingHome>>;
  getInvitation(id: string): Promise<ActionResult<GuardianInvitationView>>;
  acceptInvitation(id: string): Promise<ActionResult<GuardianInvitationView>>;
  declineInvitation(id: string): Promise<ActionResult<GuardianInvitationView>>;
  withdraw(assignmentId: string): Promise<ActionResult<void>>;
}

/** @owner EAAA */
export interface ModeratorService {
  getOverview(): Promise<ActionResult<StaffOverview>>;
  listVerificationCases(filters: CaseFilters): Promise<ActionResult<Page<VerificationCaseSummary>>>;
  getVerificationCase(caseId: string): Promise<ActionResult<VerificationCaseDetail>>;
  reviewVerification(caseId: string, decision: VerificationDecision): Promise<ActionResult<VerificationCaseDetail>>;
  listReports(filters: CaseFilters): Promise<ActionResult<Page<ReportCaseSummary>>>;
  /** Returns ONLY reporter-submitted evidence. There is no whole-room decrypt capability. */
  getReportEvidence(caseId: string): Promise<ActionResult<ReportCaseDetail>>;
  updateReportCase(caseId: string, action: ReportCaseAction): Promise<ActionResult<ReportCaseDetail>>;
  /** Actions performed by the signed-in moderator only. */
  listMyActions(page?: number): Promise<ActionResult<Page<AuditEntry>>>;
}

/** @owner EAAA */
export interface AdminService {
  listUsers(query: string, page?: number): Promise<ActionResult<Page<AdminUser>>>;
  actOnUser(userId: string, action: AdminUserAction): Promise<ActionResult<AdminUser>>;
  listRoleAssignments(): Promise<ActionResult<{ items: RoleAssignment[]; editable: boolean }>>;
  listAudit(filters: { actor?: string; action?: string; page?: number }): Promise<ActionResult<Page<AuditEntry>>>;
}

/** Optional push channel so screens refresh when server state changes (websocket, Inertia reload, mock). */
export interface ServiceEvents {
  subscribe(listener: () => void): () => void;
}

/** Present ONLY on mock adapters, so demo helpers never reach a real build. */
export interface DemoInfo {
  logins: { email: string; label: string }[];
}

export interface Services {
  mode: 'mock' | 'http';
  demo?: DemoInfo;
  auth: AuthService;
  identity: IdentityService;
  profile: ProfileService;
  candidates: CandidateService;
  introductions: IntroductionService;
  conversations: ConversationService;
  codec: MessageCodec;
  photos: PhotoGrantService;
  safety: SafetyService;
  pendamping: PendampingService;
  moderator: ModeratorService;
  admin: AdminService;
  events: ServiceEvents;
}

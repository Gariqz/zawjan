/**
 * UI-facing domain contract. Illustrative, NOT a finalized wire API or DB schema.
 * Backend teams map their canonical values to these DTOs (see INTEGRATION_NOTES.md).
 * Permissions are never derived from status strings: use `capabilities` from the server.
 */

export type AccountRole = 'participant' | 'pendamping' | 'moderator' | 'admin';

export type IdentityStatus =
  | 'not_started' | 'submitting' | 'automated_check'
  | 'needs_manual_review' | 'approved' | 'rejected'
  | 'resubmission_required' | 'temporarily_unavailable';

export type RequestStatus =
  | 'pending_recipient' | 'mutually_accepted_reserved'
  | 'waiting_pendamping' | 'active'
  | 'declined' | 'cancelled' | 'expired' | 'unavailable';

export type ConversationStatus =
  | 'locked' | 'active' | 'paused_guardian_missing'
  | 'paused_user' | 'frozen_reported' | 'ended';

export interface VerificationFact {
  kind: 'email' | 'identity' | 'age' | 'marital_status';
  status: 'confirmed' | 'declared' | 'not_checked' | 'pending' | 'rejected';
  checkedAt?: string;
  explanation?: string;
}

export interface ViewerCapability {
  canBrowseCandidates: boolean;
  canSendRequest: boolean;
  canAcceptRequest: boolean;
  canSendMessage: boolean;
  canPauseConversation: boolean;
  canResumeConversation: boolean;
  canReadCaseEvidence: boolean;
  canViewProtectedPhoto: boolean;
  canApproveIntroduction: boolean;
  canModerateCase: boolean;
}

export type CvStatus = 'empty' | 'draft' | 'published';
export type PendampingLinkStatus = 'none' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface ViewerContext {
  id: string;
  displayName: string;
  roles: AccountRole[];
  identityStatus: IdentityStatus;
  ageEligible: boolean;
  emailConfirmed: boolean;
  cvStatus: CvStatus;
  pendampingStatus: PendampingLinkStatus;
  capabilities: ViewerCapability;
  isDevelopmentMock: boolean;
}

export interface CandidateSummary {
  id: string;
  displayName: string;
  age: number;
  city?: string;
  summary?: string;
  declaredCriteria: Record<string, string | number | boolean | null>;
  verificationFacts: VerificationFact[];
  photoVisibility: 'hidden' | 'authorized';
  /** Present ONLY when the server authorized this viewer. Never a blurred public asset. */
  authorizedPhotoUrl?: string;
}

export interface CvFieldView { label: string; value: string; declared: boolean }
export interface CvSectionView { id: string; title: string; fields: CvFieldView[] }

export type CandidateRelation = 'none' | 'pending_outgoing' | 'pending_incoming' | 'in_taaruf_with_you';

export interface CandidateDetail extends Pick<CandidateSummary, 'id' | 'displayName' | 'age' | 'city' | 'verificationFacts'> {
  sections: CvSectionView[];
  /** Sections that exist but are not yet visible to this viewer (staged disclosure). */
  lockedSections: { id: string; title: string }[];
  relation: CandidateRelation;
  relatedTaArufId?: string;
  capabilities: ViewerCapability;
}

/** Allowlisted preview for Jelajahi. Separate from staged CVs and request summaries. */
export interface DiscoveryProfile {
  id: string;
  displayName: string;
  age: number;
  region: string;
  introduction: string;
}

/** Private browse preferences, never part of the shared CV or URL. */
export interface DiscoveryPreferences {
  ageMin?: number;
  ageMax?: number;
  region?: string;
  maritalStatus?: string;
  relocation?: string;
}

export type DiscoveryConsent = { visible: true; consent: true } | { visible: false };

export interface PendampingApproval {
  assignmentId: string;
  participantId: string;
  pendampingAccountId: string;
  displayName: string;
  status: 'invited' | 'verified' | 'pending' | 'approved' | 'declined' | 'withdrawn';
  actedAt?: string;
}

export interface ParticipantAcceptance {
  participantId: string;
  displayName: string;
  accepted: boolean;
  actedAt?: string;
}

export interface ConversationMember {
  accountId: string;
  displayName: string;
  role: 'participant' | 'pendamping';
  side: 'A' | 'B';
  membership: 'approved' | 'pending' | 'withdrawn' | 'replacement_pending';
  /** Replacement members are authorized from this point onward only. */
  authorizedFrom?: string;
}

export type TaArufCloseReason =
  | 'declined_by_recipient' | 'cancelled_by_requester' | 'pendamping_declined'
  | 'expired' | 'participant_exit' | 'reported' | 'exclusivity_unavailable' | 'completed';

export interface TaArufSummary {
  id: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  counterpart: CandidateSummary;
  requestStatus: RequestStatus;
  conversationStatus: ConversationStatus;
  participantAcceptances: ParticipantAcceptance[];
  approvals: PendampingApproval[];
  members: ConversationMember[];
  exclusiveReservation: boolean;
  /** Server authoritative. Never hardcode an interval in the client. */
  expiresAt?: string;
  closedReason?: TaArufCloseReason;
  closedAt?: string;
  capabilities: ViewerCapability & {
    canCancel: boolean;
    canDecline: boolean;
    canExit: boolean;
    canReport: boolean;
  };
}

export interface EncryptedMessageEnvelope {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: 'participant' | 'pendamping';
  sentAt: string;
  ciphertext: string; // opaque transport payload; protocol format TBD
  keyEpochId: string; // membership/rekeying context supplied by reviewed protocol
}

export interface MessageView {
  id: string;
  roomId: string;
  senderId: string;
  senderDisplayName: string;
  senderRole: 'participant' | 'pendamping';
  sentAt: string;
  displayBody: string; // derived ONLY by the authorized client decryptor (or fictional mock)
  mayReport: boolean;
  deliveryState?: 'sending' | 'sent' | 'failed';
}

export type ErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'IDENTITY_PENDING'
  | 'EXCLUSIVITY_CONFLICT' | 'PENDAMPING_REQUIRED'
  | 'APPROVAL_DECLINED' | 'EXPIRED' | 'VALIDATION_ERROR'
  | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'UNKNOWN';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message?: string; fieldErrors?: Record<string, string> };

/* ---------- Registration / identity ---------- */

export interface RegisterInput {
  role: 'participant' | 'pendamping';
  displayName: string;
  email: string;
  password: string;
  dateOfBirth: string; // ISO yyyy-mm-dd, authoritative check is server-side
  acceptPurpose: boolean;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}
export interface LoginInput { email: string; password: string }

export interface VerificationSubmission {
  /** Opaque handles from the upload adapter. Raw document bytes never enter app state. */
  documentUploadId: string;
  selfieUploadId: string;
}

export interface UploadHandle { uploadId: string; fileName: string; sizeBytes: number }

/* ---------- CV ---------- */

export type CvAudience = 'catalog' | 'after_request' | 'private';

export interface CvFieldSchema {
  id: string;
  label: string;
  kind: 'text' | 'textarea' | 'select' | 'number';
  required: boolean;
  options?: string[];
  help?: string;
  maxLength?: number;
  sensitive?: boolean;
}
export interface CvSectionSchema {
  id: string;
  title: string;
  description?: string;
  audience: CvAudience;
  fields: CvFieldSchema[];
}
export interface CvSchema { version: string; sections: CvSectionSchema[] }
export interface CvDraft { values: Record<string, string>; status: CvStatus; updatedAt?: string }

/* ---------- Pendamping ---------- */

export interface PendampingNomination {
  id: string;
  status: 'not_invited' | 'sent' | 'accepted' | 'declined' | 'expired' | 'invalid';
  inviteeMasked?: string;
  pendampingDisplayName?: string;
  pendampingIdentity?: IdentityStatus;
  sentAt?: string;
  expiresAt?: string;
}

export interface GuardianInvitationView {
  id: string;
  inviterDisplayName: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'already_assigned' | 'invalid';
  sentAt: string;
  expiresAt?: string;
  viewerIdentityStatus: IdentityStatus;
}

export interface GuardianAssignmentSummary {
  assignmentId: string;
  participantDisplayName: string;
  status: 'active' | 'withdrawn';
  activeTaArufId?: string;
  roomStatus?: ConversationStatus;
  authorizedFrom: string;
}

export interface PendampingHome {
  invitations: GuardianInvitationView[];
  pendingApprovals: TaArufSummary[];
  assignments: GuardianAssignmentSummary[];
  history: TaArufSummary[];
  /** Photo grants requested by the participant this pendamping supervises, awaiting their confirmation. */
  photoConfirmations: (PhotoGrant & { ownerDisplayName: string })[];
}

/* ---------- Photo privacy ---------- */

export type PhotoGrantStatus = 'requested' | 'owner_approved' | 'pendamping_pending' | 'active' | 'revoked';

export interface PhotoGrant {
  id: string;
  recipientId: string;
  recipientDisplayName: string;
  recipientRole: 'participant' | 'pendamping';
  status: PhotoGrantStatus;
  updatedAt: string;
}
export interface PhotoRecipientOption { id: string; displayName: string; role: 'participant' | 'pendamping' }
export interface PhotoPrivacyOverview {
  hasPhoto: boolean;
  /** Owner-only protected preview URL; fictional placeholder in mock mode. */
  ownerPreviewUrl?: string;
  grants: PhotoGrant[];
  eligibleRecipients: PhotoRecipientOption[];
}

/* ---------- Safety ---------- */

export const REPORT_CATEGORIES = ['harassment', 'inappropriate_content', 'scam_or_money', 'fake_identity', 'pressure', 'other'] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export interface ReportInput {
  subjectUserId: string;
  roomId?: string;
  category: ReportCategory;
  /** Required for `other`: one line, at most 100 characters. */
  otherReason?: string;
  description: string;
  /** Prepared on the reporter's device from messages they chose. Never a room-wide export. */
  evidence: EvidenceItem[];
  alsoExit: boolean;
}
export interface ReportReceipt { reportId: string; status: 'received' }

/* ---------- Moderation / admin ---------- */

export interface StaffOverview {
  pendingVerification: number;
  pendingReports: number;
  handledToday: number;
  highPriorityReports: number;
}

export type CaseState = 'pending' | 'approved' | 'rejected' | 'resubmission_requested';

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  reason?: string;
}

export interface VerificationCaseSummary {
  id: string;
  caseRef: string;
  submittedAt: string;
  stage: IdentityStatus;
  assignee?: string;
  ageEligibility: 'eligible' | 'ineligible' | 'unknown';
  state: CaseState;
}
export interface VerificationCaseDetail extends VerificationCaseSummary {
  applicantDisplayName: string;
  applicantRole: 'participant' | 'pendamping';
  maskedDocumentNumber: string;
  automatedResult: { outcome: 'face_mismatch' | 'low_quality' | 'timeout' | 'data_mismatch'; reason: string };
  documents: { id: string; label: string; protectedUrl: string }[];
  audit: AuditEntry[];
}
export type VerificationDecision =
  | { kind: 'approve' }
  | { kind: 'reject'; reason: string }
  | { kind: 'request_resubmission'; reason: string };

export type ReportCaseStatus = 'received' | 'triaged' | 'reviewing' | 'actioned' | 'closed';

export interface ReportCaseSummary {
  id: string;
  ref: string;
  reporterDisplay: string;
  category: ReportCategory;
  receivedAt: string;
  priority: 'high' | 'normal' | 'low';
  assignee?: string;
  status: ReportCaseStatus;
}
export interface EvidenceItem {
  messageId: string;
  senderDisplay: string;
  senderRole: 'participant' | 'pendamping';
  sentAt: string;
  body: string;
}
export interface ReportCaseDetail extends ReportCaseSummary {
  subjectDisplay: string;
  otherReason?: string;
  description: string;
  evidence: EvidenceItem[];
  notes: { at: string; author: string; text: string }[];
  audit: AuditEntry[];
}
export type ReportCaseAction =
  | { kind: 'note'; text: string }
  | { kind: 'warn' | 'suspend' | 'ban' | 'close'; reason: string };

export interface CaseFilters { status?: string; priority?: string; page?: number }
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }

export interface AdminUser {
  id: string;
  displayName: string;
  roles: AccountRole[];
  accountState: 'active' | 'suspended' | 'banned';
  identityStatus: IdentityStatus;
  createdAt: string;
}
export type AdminUserAction = { kind: 'suspend' | 'ban' | 'restore'; reason: string };
export interface RoleAssignment { userId: string; displayName: string; roles: AccountRole[]; capabilities: string[] }

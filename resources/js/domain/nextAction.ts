import type { TaArufSummary, ViewerContext } from './types';

export type NextActionKind =
  | 'age_ineligible' | 'verify_identity' | 'verification_in_review' | 'verification_fix'
  | 'verification_unavailable' | 'complete_cv' | 'invite_pendamping' | 'wait_pendamping'
  | 'review_incoming' | 'track_approvals' | 'enter_room' | 'room_paused' | 'browse';

export interface NextAction { kind: NextActionKind; taArufId?: string }

/** Presentation ordering of server-provided state; does not grant any permission. */
export function computeNextAction(viewer: ViewerContext, taaruf: TaArufSummary[]): NextAction {
  if (!viewer.ageEligible) return { kind: 'age_ineligible' };
  switch (viewer.identityStatus) {
    case 'not_started': return { kind: 'verify_identity' };
    case 'submitting':
    case 'automated_check':
    case 'needs_manual_review': return { kind: 'verification_in_review' };
    case 'rejected':
    case 'resubmission_required': return { kind: 'verification_fix' };
    case 'temporarily_unavailable': return { kind: 'verification_unavailable' };
    case 'approved': break;
  }
  if (viewer.cvStatus !== 'published') return { kind: 'complete_cv' };
  if (viewer.pendampingStatus === 'sent') return { kind: 'wait_pendamping' };
  if (viewer.pendampingStatus !== 'accepted') return { kind: 'invite_pendamping' };
  const active = taaruf.find((t) => t.requestStatus === 'active');
  if (active) {
    return active.conversationStatus === 'active'
      ? { kind: 'enter_room', taArufId: active.id }
      : { kind: 'room_paused', taArufId: active.id };
  }
  const waiting = taaruf.find((t) => t.requestStatus === 'waiting_pendamping' || t.requestStatus === 'mutually_accepted_reserved');
  if (waiting) return { kind: 'track_approvals', taArufId: waiting.id };
  const incoming = taaruf.find((t) => t.direction === 'incoming' && t.requestStatus === 'pending_recipient');
  if (incoming) return { kind: 'review_incoming', taArufId: incoming.id };
  return { kind: 'browse' };
}

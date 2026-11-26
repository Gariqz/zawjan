import type { ViewerCapability } from './types';

/** Safe default: nothing permitted until the server says otherwise. */
export const NO_CAPABILITIES: ViewerCapability = Object.freeze({
  canBrowseCandidates: false,
  canSendRequest: false,
  canAcceptRequest: false,
  canSendMessage: false,
  canPauseConversation: false,
  canResumeConversation: false,
  canReadCaseEvidence: false,
  canViewProtectedPhoto: false,
  canApproveIntroduction: false,
  canModerateCase: false,
});

export function withCapabilities(overrides: Partial<ViewerCapability>): ViewerCapability {
  return { ...NO_CAPABILITIES, ...overrides };
}

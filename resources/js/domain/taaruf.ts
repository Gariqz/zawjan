import type { TaArufSummary } from './types';

const TERMINAL_REQUEST: TaArufSummary['requestStatus'][] = ['declined', 'cancelled', 'expired', 'unavailable'];

/** Presentation grouping only. Permissions always come from `capabilities`. */
export function isClosed(t: TaArufSummary): boolean {
  return TERMINAL_REQUEST.includes(t.requestStatus) || t.conversationStatus === 'ended';
}

/** The exclusive, in-progress process (reserved, awaiting pendamping, or an open room). */
export function isOngoing(t: TaArufSummary): boolean {
  return !isClosed(t) && t.requestStatus !== 'pending_recipient';
}

export function groupRequests(list: TaArufSummary[]) {
  return {
    ongoing: list.filter(isOngoing),
    incoming: list.filter((t) => !isClosed(t) && t.direction === 'incoming' && t.requestStatus === 'pending_recipient'),
    outgoing: list.filter((t) => !isClosed(t) && t.direction === 'outgoing' && t.requestStatus === 'pending_recipient'),
    history: list.filter(isClosed),
  };
}

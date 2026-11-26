import { CheckCircle2, Clock, MinusCircle, XCircle } from 'lucide-react';
import { ProgressSteps, StatusBadge, type StepState } from '@/components/shared';
import { participantCopy } from '@/content/id/participant';
import { approvalStatusLabel, countApproved } from '@/domain/status';
import type { PendampingApproval, TaArufSummary } from '@/domain/types';
import { cn, formatDateTime } from '@/lib/utils';

const c = participantCopy.approvals;

function ApprovalIcon({ status }: { status: PendampingApproval['status'] | 'accepted' | 'waiting' }) {
  if (status === 'approved' || status === 'accepted') return <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />;
  if (status === 'declined') return <XCircle className="h-5 w-5 text-danger" aria-hidden />;
  if (status === 'withdrawn') return <MinusCircle className="h-5 w-5 text-ink-subtle" aria-hidden />;
  return <Clock className="h-5 w-5 text-accent-amber-text" aria-hidden />;
}

/**
 * Four-person status tracker: both participants' acceptance and both pendamping approvals.
 * `viewerSide` decides which labels say "Anda".
 */
export function GuardianApprovalTracker({ summary, viewerSide = 'A', perspective = 'participant' }: { summary: TaArufSummary; viewerSide?: 'A' | 'B'; perspective?: 'participant' | 'pendamping' }) {
  const [accA, accB] = summary.participantAcceptances;
  const [apA, apB] = summary.approvals;
  const approved = countApproved(summary.approvals);
  const rows = [
    { key: 'pa', who: accA?.displayName ?? '', role: perspective === 'participant' && viewerSide === 'A' ? c.you : 'Peserta', status: accA?.accepted ? 'accepted' as const : 'waiting' as const, label: accA?.accepted ? c.participantAccepted : c.participantPending, tone: accA?.accepted ? 'success' as const : 'warning' as const },
    { key: 'pb', who: accB?.displayName ?? '', role: c.counterpart, status: accB?.accepted ? 'accepted' as const : 'waiting' as const, label: accB?.accepted ? c.participantAccepted : c.participantPending, tone: accB?.accepted ? 'success' as const : 'warning' as const },
    ...(apA ? [{ key: 'ga', who: apA.displayName, role: perspective === 'pendamping' ? c.youAsPendamping : c.yourPendamping, status: apA.status, label: approvalStatusLabel[apA.status].label, tone: approvalStatusLabel[apA.status].tone, at: apA.actedAt }] : []),
    ...(apB ? [{ key: 'gb', who: apB.displayName, role: c.theirPendamping, status: apB.status, label: approvalStatusLabel[apB.status].label, tone: approvalStatusLabel[apB.status].tone, at: apB.actedAt }] : []),
  ];
  return (
    <section aria-labelledby="tracker-title" className="rounded-card border border-line bg-surface-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <h2 id="tracker-title" className="text-lg font-semibold">{c.tracker}</h2>
        <p className="text-sm font-semibold text-brand-primary" aria-live="polite">{c.count(approved)}</p>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 p-4">
            <ApprovalIcon status={r.status} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.who}</p>
              <p className="text-sm text-ink-muted">{r.role}{'at' in r && r.at ? ` · ${formatDateTime(r.at)}` : ''}</p>
            </div>
            <StatusBadge status={{ label: r.label, tone: r.tone }} className={cn('shrink-0')} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TaArufStatusTimeline({ summary }: { summary: TaArufSummary }) {
  const s = summary.requestStatus;
  const reserved = s === 'mutually_accepted_reserved' || s === 'waiting_pendamping';
  const active = s === 'active';
  const state = (i: number): StepState => {
    const reached = active ? 4 : reserved ? 2 : s === 'pending_recipient' ? 1 : 0;
    if (i < reached) return 'done';
    if (i === reached && !['declined', 'cancelled', 'expired', 'unavailable'].includes(s)) return reserved && i === 2 ? 'submitted' : 'current';
    return 'todo';
  };
  return <ProgressSteps orientation="vertical" label={c.timeline} steps={c.steps.map((label, i) => ({ label, state: state(i) }))} />;
}

/** Who must act next, derived from server statuses for display only. */
export function nextDecisionOwner(summary: TaArufSummary): string | null {
  if (summary.requestStatus !== 'waiting_pendamping') return null;
  const pending = summary.approvals.filter((a) => a.status === 'pending' || a.status === 'invited' || a.status === 'verified');
  return pending.length ? pending.map((p) => p.displayName).join(' dan ') : null;
}

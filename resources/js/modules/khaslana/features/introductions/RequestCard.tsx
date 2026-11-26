import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import { closeReasonLabel, conversationStatusLabel, requestStatusLabel } from '@/domain/status';
import type { TaArufSummary } from '@/domain/types';
import { formatDateTime } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { PhotoPrivacyGate } from '@/modules/brandykeun/features/discovery/PhotoPrivacyGate';

const c = participantCopy.requests;

export function RequestCard({ summary, actions }: { summary: TaArufSummary; actions?: ReactNode }) {
  const status = summary.requestStatus === 'active' ? conversationStatusLabel[summary.conversationStatus] : requestStatusLabel[summary.requestStatus];
  const Dir = summary.direction === 'incoming' ? ArrowDownLeft : ArrowUpRight;
  return (
    <Card>
      <div className="flex gap-3 p-4">
        <PhotoPrivacyGate url={summary.counterpart.authorizedPhotoUrl} name={summary.counterpart.displayName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AppLink to={ROUTES.candidate(summary.counterpart.id)} className="text-lg font-semibold text-brand-forest hover:underline">{summary.counterpart.displayName}, {summary.counterpart.age}</AppLink>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted"><Dir className="h-3.5 w-3.5" aria-hidden />{summary.direction === 'incoming' ? c.directionIn : c.directionOut} · {formatDateTime(summary.createdAt)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={status} />
            {summary.exclusiveReservation && <StatusBadge status={{ label: 'Proses eksklusif', tone: 'brand' }} />}
          </div>
          {summary.closedReason && <p className="mt-2 text-sm text-ink-muted">{summary.closedReason === 'exclusivity_unavailable' ? c.unavailableNote : closeReasonLabel[summary.closedReason]}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 border-t border-line p-3">{actions}</div>}
    </Card>
  );
}

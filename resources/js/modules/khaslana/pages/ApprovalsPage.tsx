import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import { closeReasonLabel, requestStatusLabel } from '@/domain/status';
import type { TaArufSummary } from '@/domain/types';
import { GuardianApprovalTracker, nextDecisionOwner, TaArufStatusTimeline } from '@/modules/khaslana/features/introductions/GuardianApprovalTracker';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { formatDateTime } from '@/lib/utils';
import { AppLink, useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.approvals;

/** PAR-05 — four-party tracker; the room stays locked until both pendamping approve. */
export default function ApprovalsPage() {
  const id = useRouteParam('id');
  const { introductions } = useServices();
  const q = useQuery(() => introductions.get(id), [id]);
  return (
    <ParticipantLayout>
      <QueryView query={q} skeleton="detail" backTo={ROUTES.requests}>{(t) => <Approvals t={t} />}</QueryView>
    </ParticipantLayout>
  );
}

function Approvals({ t }: { t: TaArufSummary }) {
  const { introductions } = useServices();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const cancel = useAction(introductions.cancel);
  const owner = nextDecisionOwner(t);
  const status = (() => {
    if (t.requestStatus === 'active') return <Callout tone="success" title={c.active} action={<AppLink to={ROUTES.chat(t.id)} className={buttonVariants()}><MessageCircle className="h-4 w-4" aria-hidden />{c.openChat}</AppLink>} />;
    if (t.closedReason === 'pendamping_declined') return <Callout tone="info" title={c.declined} action={<AppLink to={ROUTES.catalog} className={buttonVariants({ variant: 'outline' })}>{participantCopy.requests.backToCatalog}</AppLink>} />;
    if (t.requestStatus === 'expired') return <Callout tone="info" title={c.expired} />;
    if (t.requestStatus === 'cancelled' || t.requestStatus === 'declined' || t.requestStatus === 'unavailable') return <Callout tone="info" title={t.closedReason ? closeReasonLabel[t.closedReason] : c.cancelled} />;
    return <Callout tone="privacy" title={c.locked}>{owner && <p>{c.nextOwner}: <strong>{owner}</strong></p>}</Callout>;
  })();

  return (
    <>
      <PageHeader backTo={ROUTES.requests} backLabel={participantCopy.requests.title} eyebrow={`${t.counterpart.displayName}, ${t.counterpart.age}`} title={c.title} description={c.lead} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex flex-col gap-4">
          {status}
          <GuardianApprovalTracker summary={t} />
          {t.expiresAt && <p className="text-sm text-ink-muted">{c.expires}: <strong className="text-ink">{formatDateTime(t.expiresAt)}</strong></p>}
          {t.capabilities.canCancel && <Button variant="danger-outline" className="sm:w-fit" onClick={() => setConfirm(true)}>{c.cancel}</Button>}
        </div>
        <Card className="h-fit"><CardContent>
          <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">{c.timeline}</h2><StatusBadge status={requestStatusLabel[t.requestStatus]} /></div>
          <TaArufStatusTimeline summary={t} />
        </CardContent></Card>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={participantCopy.requests.cancelTitle} description={participantCopy.requests.cancelBody}
        confirmLabel={participantCopy.requests.cancelConfirm} tone="danger" busy={cancel.busy}
        onConfirm={async () => { const r = await cancel.run(t.id); if (r?.ok) { setConfirm(false); toast('Proses dibatalkan.', 'info'); } }}>
        {cancel.error && <ActionErrorCallout code={cancel.error.code} />}
      </ConfirmDialog>
    </>
  );
}

import { useState } from 'react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { PageHeader, StatusBadge, VerificationFacts } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import { pendampingCopy } from '@/content/id/pendamping';
import { closeReasonLabel, requestStatusLabel } from '@/domain/status';
import type { TaArufSummary } from '@/domain/types';
import { PhotoPrivacyGate } from '@/modules/brandykeun/features/discovery/PhotoPrivacyGate';
import { GuardianApprovalTracker } from '@/modules/khaslana/features/introductions/GuardianApprovalTracker';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { formatDateTime } from '@/lib/utils';
import { useAppNavigate, useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = pendampingCopy.approval;

/** GUA-03 — per-introduction approval decision by the participant's pendamping. */
export default function GuardianApprovalPage() {
  const id = useRouteParam('id');
  const { introductions } = useServices();
  const q = useQuery(() => introductions.get(id), [id]);
  return (
    <PendampingLayout>
      <QueryView query={q} skeleton="detail" backTo={ROUTES.guardianHome}>{(t) => <Approval t={t} />}</QueryView>
    </PendampingLayout>
  );
}

function Approval({ t }: { t: TaArufSummary }) {
  const { introductions } = useServices();
  const toast = useToast();
  const nav = useAppNavigate();
  const [confirm, setConfirm] = useState<'approve' | 'decline' | null>(null);
  const approve = useAction(introductions.approveAsPendamping);
  const decline = useAction(introductions.declineAsPendamping);
  const active = confirm === 'decline' ? decline : approve;
  const participant = t.participantAcceptances[0]?.displayName ?? 'Peserta';
  const canDecide = t.capabilities.canApproveIntroduction;
  const closed = ['declined', 'cancelled', 'expired', 'unavailable'].includes(t.requestStatus);

  const onConfirm = async () => {
    if (confirm === 'approve') {
      const r = await approve.run(t.id);
      if (r?.ok) { setConfirm(null); toast(c.approved); }
    } else {
      const r = await decline.run(t.id);
      if (r?.ok) { setConfirm(null); toast(c.declinedToast, 'info'); nav(ROUTES.guardianHome); }
    }
  };

  return (
    <>
      <PageHeader backTo={ROUTES.guardianHome} backLabel="Beranda" title={c.title} description={c.lead(participant, t.counterpart.displayName)} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          {closed && <Callout tone="info" title={t.closedReason ? closeReasonLabel[t.closedReason] : requestStatusLabel[t.requestStatus].label} />}
          {!closed && !canDecide && <Callout tone="info">{t.requestStatus === 'active' ? participantCopy.approvals.active : c.done}</Callout>}
          <GuardianApprovalTracker summary={t} perspective="pendamping" />
          {t.expiresAt && <p className="text-sm text-ink-muted">{participantCopy.approvals.expires}: <strong className="text-ink">{formatDateTime(t.expiresAt)}</strong></p>}
          {canDecide && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="danger-outline" onClick={() => { decline.clearError(); setConfirm('decline'); }}>{c.decline}</Button>
              <Button onClick={() => { approve.clearError(); setConfirm('approve'); }}>{c.approve}</Button>
            </div>
          )}
        </div>
        <Card className="h-fit"><CardContent className="flex flex-col gap-3">
          <h2 className="font-semibold">{c.counterpartTitle}</h2>
          <div className="flex items-center gap-3">
            <PhotoPrivacyGate url={t.counterpart.authorizedPhotoUrl} name={t.counterpart.displayName} size="sm" />
            <div><p className="font-semibold">{t.counterpart.displayName}, {t.counterpart.age}</p>{t.counterpart.city && <p className="text-sm text-ink-muted">{t.counterpart.city}</p>}</div>
          </div>
          {t.counterpart.summary && <p className="text-sm text-ink-muted">{t.counterpart.summary}</p>}
          <VerificationFacts facts={t.counterpart.verificationFacts} />
          <StatusBadge status={requestStatusLabel[t.requestStatus]} className="w-fit" />
        </CardContent></Card>
      </div>
      <ConfirmDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)} busy={active.busy}
        title={confirm === 'decline' ? c.declineTitle : c.approveTitle} description={confirm === 'decline' ? c.declineBody : c.approveBody}
        confirmLabel={confirm === 'decline' ? c.decline : c.approve} tone={confirm === 'decline' ? 'danger' : 'primary'} onConfirm={() => void onConfirm()}>
        {active.error && <ActionErrorCallout code={active.error.code} {...(active.error.message ? { message: active.error.message } : {})} />}
      </ConfirmDialog>
    </>
  );
}

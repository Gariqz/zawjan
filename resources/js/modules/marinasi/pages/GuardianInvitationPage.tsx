import { useState } from 'react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { pendampingCopy } from '@/content/id/pendamping';
import type { GuardianInvitationView } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { formatDateTime } from '@/lib/utils';
import { AppLink, useAppNavigate, useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { invitationTone } from './GuardianInvitationsPage';

const c = pendampingCopy.invitation;

/** GUA-02 — accept or decline an invitation; requires the pendamping's own verified identity. */
export default function GuardianInvitationPage() {
  const id = useRouteParam('id');
  const { pendamping } = useServices();
  const q = useQuery(() => pendamping.getInvitation(id), [id]);
  return (
    <PendampingLayout>
      <PageHeader backTo={ROUTES.guardianInvitations} backLabel={pendampingCopy.invitations.title} title={c.title} />
      <QueryView query={q} skeleton="detail" backTo={ROUTES.guardianInvitations}>{(inv) => <Invitation inv={inv} />}</QueryView>
    </PendampingLayout>
  );
}

function Invitation({ inv }: { inv: GuardianInvitationView }) {
  const { pendamping } = useServices();
  const toast = useToast();
  const nav = useAppNavigate();
  const [declineOpen, setDeclineOpen] = useState(false);
  const accept = useAction(pendamping.acceptInvitation);
  const decline = useAction(pendamping.declineInvitation);
  const verified = inv.viewerIdentityStatus === 'approved';
  const pending = inv.status === 'pending';

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card><CardContent>
        <p className="text-lg font-semibold text-brand-forest">{c.from(inv.inviterDisplayName)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={{ label: pendampingCopy.invitations.status[inv.status], tone: invitationTone[inv.status] }} />
          <span className="text-sm text-ink-muted">Dikirim {formatDateTime(inv.sentAt)}{inv.expiresAt ? ` · berlaku sampai ${formatDateTime(inv.expiresAt)}` : ''}</span>
        </div>
        <h2 className="mt-5 font-semibold">{c.whatTitle}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">{c.what.map((w) => <li key={w}>{w}</li>)}</ul>
      </CardContent></Card>
      <Callout tone="privacy" title="Bukan wali nikah otomatis">{c.notWhat}</Callout>
      {inv.status === 'expired' && <Callout tone="info">{c.expiredNote}</Callout>}
      {pending && !verified && (
        <Callout tone="warning" title={c.identityNeeded} action={<AppLink to={ROUTES.verification} className={buttonVariants({ size: 'sm' })}>{pendampingCopy.home.identityCta}</AppLink>} />
      )}
      {accept.error && <ActionErrorCallout code={accept.error.code} />}
      {pending && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => { decline.clearError(); setDeclineOpen(true); }}>{c.decline}</Button>
          <Button disabled={!verified} busy={accept.busy} onClick={async () => { const r = await accept.run(inv.id); if (r?.ok) { toast(c.accepted); nav(ROUTES.guardianHome); } }}>{c.accept}</Button>
        </div>
      )}
      <ConfirmDialog open={declineOpen} onOpenChange={setDeclineOpen} title={c.declineTitle} description={c.declineBody} confirmLabel={c.decline} tone="danger" busy={decline.busy}
        onConfirm={async () => { const r = await decline.run(inv.id); if (r?.ok) { setDeclineOpen(false); toast(c.declined, 'info'); } }}>
        {decline.error && <ActionErrorCallout code={decline.error.code} />}
      </ConfirmDialog>
    </div>
  );
}

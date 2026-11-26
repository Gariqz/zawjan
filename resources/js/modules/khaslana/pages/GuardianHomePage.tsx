import { useState } from 'react';
import { ArrowRight, ImageIcon, Mail, UserCheck } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { EmptyState, PageHeader, SectionTitle, StatusBadge } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { pendampingCopy } from '@/content/id/pendamping';
import { conversationStatusLabel, requestStatusLabel } from '@/domain/status';
import type { PendampingHome } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { formatDateTime } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { useViewer } from '@/state/viewer';

const c = pendampingCopy.home;

/** GUA-01 — what needs this pendamping's decision, in priority order. */
export default function GuardianHomePage() {
  return <PendampingLayout><HomeInner /></PendampingLayout>;
}

function HomeInner() {
  const viewer = useViewer();
  const { pendamping } = useServices();
  const q = useQuery(() => pendamping.getHome(), []);
  return (
    <>
      <PageHeader title={c.greeting(viewer.displayName)} description={c.lead} />
      {viewer.identityStatus !== 'approved' && (
        <Callout tone="warning" title={c.identityTitle} className="mb-5"
          action={<AppLink to={ROUTES.verification} className={buttonVariants({ size: 'sm' })}>{c.identityCta}</AppLink>}>{c.identityBody}</Callout>
      )}
      <QueryView query={q} skeleton="list">{(h) => <Home h={h} />}</QueryView>
    </>
  );
}

function Home({ h }: { h: PendampingHome }) {
  const pendingInv = h.invitations.filter((i) => i.status === 'pending');
  const nothing = !pendingInv.length && !h.pendingApprovals.length && !h.photoConfirmations.length;
  return (
    <div className="flex flex-col gap-6">
      {nothing && <EmptyState icon={UserCheck} title={c.noTasks} />}
      {pendingInv.length > 0 && (
        <section aria-labelledby="inv-title">
          <SectionTitle id="inv-title">{c.invitations}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {pendingInv.map((i) => (
              <li key={i.id}>
                <AppLink to={ROUTES.guardianInvitation(i.id)} className="flex min-h-touch items-center gap-3 rounded-card border border-line bg-surface-white p-4 hover:border-brand-primary">
                  <Mail className="h-5 w-5 text-brand-primary" aria-hidden />
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{i.inviterDisplayName}</span><span className="block text-sm text-ink-muted">Dikirim {formatDateTime(i.sentAt)}</span></span>
                  <span className="text-sm font-semibold text-brand-primary">{c.viewInvitation}</span>
                </AppLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      {h.pendingApprovals.length > 0 && (
        <section aria-labelledby="appr-title">
          <SectionTitle id="appr-title">{c.approvals}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {h.pendingApprovals.map((t) => (
              <li key={t.id}>
                <Card><CardContent className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t.participantAcceptances[0]?.displayName} &amp; {t.counterpart.displayName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={requestStatusLabel[t.requestStatus]} /></div>
                    {t.expiresAt && <p className="mt-1 text-xs text-ink-subtle">Batas waktu dari sistem: {formatDateTime(t.expiresAt)}</p>}
                  </div>
                  <AppLink to={ROUTES.guardianApproval(t.id)} className={buttonVariants({ size: 'sm' })}>{c.review}<ArrowRight className="h-4 w-4" aria-hidden /></AppLink>
                </CardContent></Card>
              </li>
            ))}
          </ul>
        </section>
      )}
      {h.photoConfirmations.length > 0 && <PhotoConfirmations items={h.photoConfirmations} />}
      <section aria-labelledby="asg-title">
        <SectionTitle id="asg-title" action={<AppLink to={ROUTES.guardianAssignments} className="text-sm font-semibold text-brand-primary hover:underline">Lihat semua</AppLink>}>{c.assignments}</SectionTitle>
        {h.assignments.filter((a) => a.status === 'active').length === 0
          ? <p className="text-sm text-ink-muted">{pendampingCopy.assignments.empty}</p>
          : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {h.assignments.filter((a) => a.status === 'active').map((a) => (
                <li key={a.assignmentId} className="rounded-card border border-line bg-surface-white p-4">
                  <p className="font-semibold">{a.participantDisplayName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {a.roomStatus ? <StatusBadge status={conversationStatusLabel[a.roomStatus]} /> : <span className="text-sm text-ink-muted">{c.roomNone}</span>}
                    {a.activeTaArufId && a.roomStatus && a.roomStatus !== 'locked' && <AppLink to={ROUTES.guardianRoom(a.activeTaArufId)} className="text-sm font-semibold text-brand-primary hover:underline">{c.open}</AppLink>}
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}

function PhotoConfirmations({ items }: { items: PendampingHome['photoConfirmations'] }) {
  const { photos } = useServices();
  const toast = useToast();
  const confirm = useAction(photos.confirmAsOwnerPendamping);
  const [busyId, setBusyId] = useState<string | null>(null);
  return (
    <section aria-labelledby="photo-title">
      <SectionTitle id="photo-title">{c.photos}</SectionTitle>
      <p className="mb-2 text-sm text-ink-muted">{c.photoNote}</p>
      <ul className="flex flex-col gap-2">
        {items.map((g) => (
          <li key={g.id}>
            <Card><CardContent className="flex flex-wrap items-center gap-3">
              <ImageIcon className="h-5 w-5 text-brand-primary" aria-hidden />
              <p className="min-w-0 flex-1 text-sm">{c.photoLine(g.ownerDisplayName, g.recipientDisplayName)}</p>
              <Button size="sm" busy={confirm.busy && busyId === g.id} onClick={async () => { setBusyId(g.id); const r = await confirm.run(g.id); setBusyId(null); if (r?.ok) toast(c.photoConfirmed); }}>{c.photoConfirm}</Button>
            </CardContent></Card>
          </li>
        ))}
      </ul>
      {confirm.error && <ActionErrorCallout className="mt-2" code={confirm.error.code} />}
    </section>
  );
}

import { useState } from 'react';
import { HeartHandshake, Inbox, Send } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { EmptyState, PageHeader, SectionTitle } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { TabPanel, Tabs } from '@/components/ui/tabs';
import { participantCopy } from '@/content/id/participant';
import { groupRequests } from '@/domain/taaruf';
import type { TaArufSummary } from '@/domain/types';
import { RequestCard } from '@/modules/khaslana/features/introductions/RequestCard';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { AppLink, useAppNavigate, useQueryParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.requests;
type Tab = 'incoming' | 'outgoing' | 'history';
type Pending = { kind: 'accept' | 'decline' | 'cancel'; t: TaArufSummary } | null;

/** PAR-04 — incoming, outgoing and history; acceptance explains exclusivity before confirming. */
export default function RequestsPage() {
  return <ParticipantLayout><RequestsInner /></ParticipantLayout>;
}

function RequestsInner() {
  const { introductions } = useServices();
  const q = useQuery(() => introductions.listRequests(), []);
  const [tabParam, setTab] = useQueryParam('tab');
  const tab: Tab = tabParam === 'outgoing' || tabParam === 'history' ? tabParam : 'incoming';
  const [pending, setPending] = useState<Pending>(null);
  const nav = useAppNavigate();
  const toast = useToast();
  const accept = useAction(introductions.accept);
  const decline = useAction(introductions.decline);
  const cancel = useAction(introductions.cancel);
  const active = pending?.kind === 'accept' ? accept : pending?.kind === 'decline' ? decline : cancel;

  const confirm = async () => {
    if (!pending) return;
    const id = pending.t.id;
    if (pending.kind === 'accept') {
      const r = await accept.run(id);
      if (r?.ok) { setPending(null); toast(c.accepted); nav(ROUTES.approvals(id)); }
      return;
    }
    const r = pending.kind === 'decline' ? await decline.run(id) : await cancel.run(id);
    if (r?.ok) { setPending(null); toast(pending.kind === 'decline' ? 'Pengajuan ditolak.' : 'Pengajuan dibatalkan.', 'info'); }
  };
  const open = (kind: 'accept' | 'decline' | 'cancel', t: TaArufSummary) => { accept.clearError(); decline.clearError(); cancel.clearError(); setPending({ kind, t }); };

  return (
    <>
      <PageHeader title={c.title} description={c.lead} />
      <QueryView query={q}>
        {(list) => {
          const g = groupRequests(list);
          const items = g[tab];
          return (
            <div className="flex flex-col gap-6">
              {g.ongoing.length > 0 && (
                <section aria-labelledby="ongoing-title">
                  <SectionTitle id="ongoing-title">{c.activeTitle}</SectionTitle>
                  <ul className="flex flex-col gap-3">
                    {g.ongoing.map((t) => (
                      <li key={t.id}>
                        <RequestCard summary={t} actions={(
                          <>
                            {t.requestStatus === 'active'
                              ? <AppLink to={ROUTES.chat(t.id)} className={buttonVariants({ size: 'sm' })}>{c.openChat}</AppLink>
                              : <AppLink to={ROUTES.approvals(t.id)} className={buttonVariants({ size: 'sm' })}>{c.viewApprovals}</AppLink>}
                            {t.capabilities.canCancel && <Button size="sm" variant="ghost" onClick={() => open('cancel', t)}>{c.cancel}</Button>}
                          </>
                        )} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <div className="flex flex-col gap-4">
                <Tabs<Tab> idBase="req" label={c.tabsLabel} value={tab} onChange={(v) => setTab(v === 'incoming' ? null : v)}
                  items={[
                    { value: 'incoming', label: c.tabs.incoming, count: g.incoming.length },
                    { value: 'outgoing', label: c.tabs.outgoing, count: g.outgoing.length },
                    { value: 'history', label: c.tabs.history },
                  ]} />
                <TabPanel idBase="req" activeValue={tab}>
                  {items.length === 0 ? (
                    <EmptyState icon={tab === 'incoming' ? Inbox : tab === 'outgoing' ? Send : HeartHandshake}
                      title={tab === 'incoming' ? c.emptyIncoming : tab === 'outgoing' ? c.emptyOutgoing : c.emptyHistory}
                      action={tab !== 'history' ? <AppLink to={ROUTES.catalog} className={buttonVariants({ variant: 'outline' })}>{c.backToCatalog}</AppLink> : undefined} />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {items.map((t) => (
                        <li key={t.id}>
                          <RequestCard summary={t} actions={tab === 'history' ? undefined : (
                            <>
                              {t.capabilities.canAcceptRequest && <Button size="sm" onClick={() => open('accept', t)}>{c.accept}</Button>}
                              {t.direction === 'incoming' && !t.capabilities.canAcceptRequest && <p className="w-full text-sm text-ink-muted">{participantCopy.catalog.lockedRequests}</p>}
                              {t.capabilities.canDecline && <Button size="sm" variant="outline" onClick={() => open('decline', t)}>{c.decline}</Button>}
                              {t.capabilities.canCancel && <Button size="sm" variant="ghost" onClick={() => open('cancel', t)}>{c.cancel}</Button>}
                              <AppLink to={ROUTES.candidate(t.counterpart.id)} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>{participantCopy.catalog.viewCv}</AppLink>
                            </>
                          )} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {tab === 'history' && items.length > 0 && <p className="mt-4 text-sm"><AppLink to={ROUTES.history} className="font-semibold text-brand-primary hover:underline">{c.viewHistory}</AppLink></p>}
                </TabPanel>
              </div>
            </div>
          );
        }}
      </QueryView>
      <ConfirmDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)} busy={active.busy}
        tone={pending?.kind === 'accept' ? 'primary' : 'danger'}
        title={pending?.kind === 'accept' ? c.acceptTitle : pending?.kind === 'decline' ? c.declineTitle : c.cancelTitle}
        description={pending ? `${pending.t.counterpart.displayName}, ${pending.t.counterpart.age}` : undefined}
        confirmLabel={pending?.kind === 'accept' ? c.acceptConfirm : pending?.kind === 'decline' ? c.declineConfirm : c.cancelConfirm}
        onConfirm={() => void confirm()}>
        <p className="text-sm text-ink-muted">{pending?.kind === 'accept' ? c.acceptBody : pending?.kind === 'decline' ? c.declineBody : c.cancelBody}</p>
        {active.error && <ActionErrorCallout className="mt-3" code={active.error.code} {...(active.error.message ? { message: active.error.message } : {})} />}
      </ConfirmDialog>
    </>
  );
}

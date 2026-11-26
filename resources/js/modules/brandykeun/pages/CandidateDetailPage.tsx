import { useState } from 'react';
import { Ban, Flag, MapPin } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { PageHeader, PrivacyNotice, VerificationFacts } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import type { CandidateDetail } from '@/domain/types';
import { RequestConfirmDialog } from '@/modules/brandykeun/features/discovery/RequestConfirmDialog';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { cn } from '@/lib/utils';
import { AppLink, useAppNavigate, useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.candidate;

/** PAR-03 — read-focused CV with honest verification scope and staged disclosure. */
export default function CandidateDetailPage() {
  const id = useRouteParam('id');
  return <ParticipantLayout><CandidateById key={id} id={id} /></ParticipantLayout>;
}

function CandidateById({ id }: { id: string }) {
  const { candidates } = useServices();
  const q = useQuery(() => candidates.getDetail(id), [id]);
  return <QueryView query={q} skeleton="detail" backTo={ROUTES.catalog}>{(d) => <Detail d={d} />}</QueryView>;
}

function Detail({ d }: { d: CandidateDetail }) {
  const { safety } = useServices();
  const toast = useToast();
  const nav = useAppNavigate();
  const [requesting, setRequesting] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const block = useAction(safety.blockUser);

  const cta = (() => {
    if (d.relation === 'pending_outgoing') return { note: c.pendingOut, el: <AppLink to={`${ROUTES.requests}?tab=outgoing`} className={buttonVariants({ variant: 'outline', block: true })}>{c.viewRequests}</AppLink> };
    if (d.relation === 'pending_incoming') return { note: c.pendingIn, el: <AppLink to={`${ROUTES.requests}?tab=incoming`} className={buttonVariants({ block: true })}>{c.viewRequests}</AppLink> };
    if (d.relation === 'in_taaruf_with_you' && d.relatedTaArufId) return { note: c.inTaaruf, el: <AppLink to={ROUTES.approvals(d.relatedTaArufId)} className={buttonVariants({ block: true })}>{c.viewProcess}</AppLink> };
    if (d.capabilities.canSendRequest) return { note: undefined, el: <Button block size="lg" onClick={() => setRequesting(true)}>{participantCopy.catalog.request}</Button> };
    return { note: c.cannotRequest, el: <Button block size="lg" disabled>{participantCopy.catalog.request}</Button> };
  })();

  return (
    <>
      <PageHeader backTo={ROUTES.catalog} backLabel={participantCopy.catalog.title} title={`${d.displayName}, ${d.age}`}
        description={d.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{d.city}</span> : undefined} />
      <div className="grid gap-6 pb-24 md:grid-cols-[260px_minmax(0,1fr)] md:pb-0">
        <aside className="flex flex-col gap-4">
          <Card><CardContent><VerificationFacts facts={d.verificationFacts} /><p className="mt-3 text-sm text-ink-muted">{c.photoNote}</p></CardContent></Card>
          <div className="hidden flex-col gap-2 md:flex">
            {cta.note && <p className="text-sm text-ink-muted">{cta.note}</p>}
            {cta.el}
          </div>
          <div className="flex gap-2">
            <AppLink to={`${ROUTES.reportNew}?subjek=${encodeURIComponent(d.id)}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-danger')}><Flag className="h-4 w-4" aria-hidden />{c.report}</AppLink>
            <Button variant="ghost" size="sm" className="text-danger" onClick={() => setBlockOpen(true)}><Ban className="h-4 w-4" aria-hidden />{c.block}</Button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          {d.sections.map((s) => (
            <section key={s.id} aria-labelledby={`sec-${s.id}`} className="rounded-card border border-line bg-surface-white p-4 md:p-5">
              <h2 id={`sec-${s.id}`} className="text-lg font-semibold">{s.title}</h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <div key={f.label} className={f.value.length > 60 ? 'sm:col-span-2' : ''}>
                    <dt className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-subtle">{f.label}{f.declared && <Badge icon={false} className="px-2 py-0.5 text-[11px]">{c.declared}</Badge>}</dt>
                    <dd className="mt-1">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {d.lockedSections.length > 0 && (
            <PrivacyNotice title={c.lockedTitle}>
              <p>{c.lockedBody}</p>
              <ul className="mt-2 list-disc pl-5">{d.lockedSections.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
            </PrivacyNotice>
          )}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface-white p-3 md:hidden">
        {cta.note && <p className="mb-2 text-center text-xs text-ink-muted">{cta.note}</p>}
        {cta.el}
      </div>
      <RequestConfirmDialog candidate={requesting ? d : null} onClose={() => setRequesting(false)} />
      <ConfirmDialog open={blockOpen} onOpenChange={setBlockOpen} title={c.blockTitle} description={c.blockBody} confirmLabel={c.blockConfirm} tone="danger" busy={block.busy}
        onConfirm={async () => { const r = await block.run(d.id); if (r?.ok) { setBlockOpen(false); toast(c.blocked); nav(ROUTES.catalog); } }}>
        {block.error && <ActionErrorCallout code={block.error.code} />}
      </ConfirmDialog>
    </>
  );
}

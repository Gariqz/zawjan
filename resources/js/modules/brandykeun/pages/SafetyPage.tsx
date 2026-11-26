import { useState, type ReactNode } from 'react';
import { Ban, Database, DoorOpen, Flag } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { PageHeader } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import { isOngoing } from '@/domain/taaruf';
import type { TaArufSummary } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.safety;

/** PAR-09 — safety centre: report, block, unilateral exit, data requests (pending policy). */
export default function SafetyPage() {
  const { introductions } = useServices();
  const q = useQuery(() => introductions.listRequests(), []);
  return (
    <ParticipantLayout>
      <PageHeader backTo={ROUTES.account} backLabel="Akun" title={c.title} description={c.lead} />
      <QueryView query={q} skeleton="list">{(list) => <Safety ongoing={list.find(isOngoing)} />}</QueryView>
    </ParticipantLayout>
  );
}

function SafetyCard({ icon: Icon, title, body, action }: { icon: typeof Flag; title: string; body: string; action?: ReactNode }) {
  return (
    <Card><CardContent className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mint text-brand-primary"><Icon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1"><CardTitle className="text-base">{title}</CardTitle><CardDescription className="mt-1">{body}</CardDescription>{action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}</div>
    </CardContent></Card>
  );
}

function Safety({ ongoing }: { ongoing: TaArufSummary | undefined }) {
  const { conversations, introductions } = useServices();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const exitRoom = useAction(conversations.exit);
  const cancel = useAction(introductions.cancel);
  const busy = exitRoom.busy || cancel.busy;
  const error = exitRoom.error ?? cancel.error;
  const canEnd = !!ongoing && (ongoing.capabilities.canExit || ongoing.capabilities.canCancel);
  const reportUrl = ongoing ? `${ROUTES.reportNew}?ruang=${encodeURIComponent(ongoing.id)}&subjek=${encodeURIComponent(ongoing.counterpart.id)}` : ROUTES.reportNew;

  const end = async () => {
    if (!ongoing) return;
    const r = ongoing.capabilities.canExit ? await exitRoom.run(ongoing.id) : await cancel.run(ongoing.id);
    if (r?.ok) { setConfirm(false); toast(participantCopy.chat.exited); }
  };

  return (
    <div className="flex flex-col gap-3">
      <SafetyCard icon={Flag} title={c.report.title} body={c.report.body} action={<AppLink to={reportUrl} className={buttonVariants({ variant: 'danger-outline', size: 'sm' })}>{c.report.cta}</AppLink>} />
      <SafetyCard icon={DoorOpen} title={c.exit.title} body={ongoing ? `${c.exit.body} (${ongoing.counterpart.displayName})` : c.exit.none}
        action={canEnd ? <Button size="sm" variant="danger" onClick={() => setConfirm(true)}>{c.exit.cta}</Button> : undefined} />
      <SafetyCard icon={Ban} title={c.block.title} body={c.block.body} />
      <SafetyCard icon={Database} title={c.data.title} body={c.data.body} action={<Button size="sm" variant="outline" disabled>{c.data.cta}</Button>} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={participantCopy.chat.exitTitle} description={participantCopy.chat.exitBody}
        confirmLabel={participantCopy.chat.exitConfirm} tone="danger" busy={busy} onConfirm={() => void end()}>
        {error && <ActionErrorCallout code={error.code} />}
      </ConfirmDialog>
    </div>
  );
}

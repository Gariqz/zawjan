import { ArrowRight, Compass, Lock } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { PageHeader, SectionTitle, StatusBadge } from '@/components/shared';
import ZawjanMascot from '@/components/shared/ZawjanMascot';
import { buttonVariants } from '@/components/ui/button';
import { onboardingCopy } from '@/content/id/onboarding';
import { participantCopy } from '@/content/id/participant';
import { computeNextAction, type NextAction, type NextActionKind } from '@/domain/nextAction';
import { approvalStatusLabel, conversationStatusLabel, requestStatusLabel } from '@/domain/status';
import { groupRequests, isClosed } from '@/domain/taaruf';
import type { TaArufSummary, ViewerContext } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { cn } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useViewer } from '@/state/viewer';
import { onboardingSteps } from './StartPage';

const c = participantCopy.home;
const h = onboardingCopy.home;
const guideTo = `${ROUTES.start}?panduan=1`;

function nextActionTarget(a: NextAction): string | undefined {
  switch (a.kind) {
    case 'age_ineligible': case 'verify_identity': case 'verification_in_review': case 'verification_fix': case 'verification_unavailable': return ROUTES.verification;
    case 'complete_cv': return ROUTES.cvNew;
    case 'invite_pendamping': case 'wait_pendamping': return ROUTES.invitePendamping;
    case 'review_incoming': return ROUTES.requests;
    case 'track_approvals': return a.taArufId ? ROUTES.approvals(a.taArufId) : undefined;
    case 'enter_room': case 'room_paused': return a.taArufId ? ROUTES.chat(a.taArufId) : undefined;
    case 'browse': return undefined;
  }
}

/** PAR-01 — current process and its next real action. */
export default function ParticipantHomePage() {
  return <ParticipantLayout><HomeInner /></ParticipantLayout>;
}

function HomeInner() {
  const viewer = useViewer();
  const { introductions } = useServices();
  const q = useQuery(() => introductions.listRequests(), []);
  return (
    <>
      <PageHeader title={c.greeting(viewer.displayName)} />
      <QueryView query={q} skeleton="detail">
        {(list) => <HomeProcess viewer={viewer} list={list} />}
      </QueryView>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2">
        <ZawjanMascot pose="guide" className="w-10 shrink-0" />
        <AppLink to={guideTo} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-brand-primary')}>{h.guideLink}</AppLink>
        <AppLink to={ROUTES.privacy} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Lock className="h-4 w-4" aria-hidden />{c.privacy}</AppLink>
      </div>
    </>
  );
}

function HomeProcess({ viewer, list }: { viewer: ViewerContext; list: TaArufSummary[] }) {
  const { ongoing, incoming, outgoing } = groupRequests(list);
  const next = computeNextAction(viewer, list.filter((t) => !isClosed(t)));
  const process = ongoing[0] ?? incoming[0] ?? outgoing[0];
  const nextProcess = list.find((t) => t.id === next.taArufId);
  const pendingOutgoing = next.kind === 'browse' ? outgoing[0] : undefined;
  const focusedProcess = nextProcess ?? pendingOutgoing;
  const steps = onboardingSteps(viewer);
  const canExplore = viewer.capabilities.canBrowseCandidates;
  const nextCopy = c.next[next.kind];
  const copyByKind: Partial<Record<NextActionKind, { title: string; body: string; cta: string }>> = {
    age_ineligible: { ...nextCopy, body: onboardingCopy.verification.outcomes.underage.body },
    verify_identity: { ...nextCopy, body: h.verifyToExplore },
    verification_in_review: { ...nextCopy, body: h.reviewVerification },
    verification_unavailable: { ...nextCopy, body: h.retryVerification },
    verification_fix: viewer.identityStatus === 'rejected'
      ? { ...onboardingCopy.verification.outcomes.rejected, cta: c.next.age_ineligible.cta }
      : nextCopy,
    room_paused: { ...nextCopy, body: nextProcess ? participantCopy.chat.disabled[nextProcess.conversationStatus] : nextCopy.body },
    browse: pendingOutgoing
      ? { title: h.outgoing, body: h.outgoingBody, cta: h.viewOutgoing }
      : { title: h.noProcess, body: canExplore ? h.noProcessBody : h.browseUnavailable, cta: '' },
  };
  const copy = copyByKind[next.kind] ?? nextCopy;
  const outgoingTo = `${ROUTES.requests}?tab=outgoing`;
  const target = pendingOutgoing ? outgoingTo : nextActionTarget(next);
  const approvals = next.kind === 'track_approvals' ? nextProcess?.approvals : undefined;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="process-title">
        <SectionTitle id="process-title">{h.processTitle}</SectionTitle>
        <div className="rounded-card border border-brand-primary/20 bg-brand-mint p-5 sm:p-6">
          <h3 className="max-w-xl text-balance font-display text-2xl font-semibold leading-tight text-brand-forest sm:text-3xl">{copy.title}</h3>
          <p className="mt-2 max-w-prose leading-relaxed text-ink-muted">{copy.body}</p>
          {focusedProcess && <ProcessStatus process={focusedProcess} />}
          {!!approvals?.length && <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {approvals.map((a) => <div key={a.assignmentId}>
              <dt className="font-semibold text-ink">{a.participantId === viewer.id ? participantCopy.approvals.yourPendamping : participantCopy.approvals.theirPendamping}</dt>
              <dd className="mt-0.5 text-ink-muted">{approvalStatusLabel[a.status].label}</dd>
            </div>)}
          </dl>}
          {target && <AppLink to={target} className={cn(buttonVariants(), 'mt-4 whitespace-normal')}>
            {copy.cta}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </AppLink>}
        </div>
        {process && !focusedProcess && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 rounded-card border border-line bg-surface-white px-4 py-2">
            <ProcessStatus process={process} />
            <AppLink to={process === outgoing[0] ? outgoingTo : ROUTES.requests} className={buttonVariants({ variant: 'link' })}>
              {process === outgoing[0] ? h.viewOutgoing : h.viewProcess}<ArrowRight className="h-4 w-4" aria-hidden />
            </AppLink>
          </div>
        )}
      </section>

      <section aria-labelledby="home-preparation-title">
        <SectionTitle id="home-preparation-title" action={
          <AppLink to={ROUTES.start} className={cn(buttonVariants({ variant: 'link' }), 'whitespace-normal text-right')}>{h.stepsLink}</AppLink>
        }>{onboardingCopy.start.checklist}</SectionTitle>
        <dl className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-white">
          {steps.map((s) => <div key={s.key} className="grid gap-x-4 gap-y-0.5 px-4 py-3 text-sm sm:grid-cols-[1fr_1.2fr] sm:px-5">
            <dt className="font-semibold text-ink">{s.label}</dt>
            <dd className="text-ink-muted">{s.detail}</dd>
          </div>)}
        </dl>
      </section>

      {canExplore && <section aria-labelledby="explore-title" className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface-white p-4 sm:p-5">
        <Compass className="h-6 w-6 shrink-0 text-brand-primary" aria-hidden />
        <div className="min-w-0 flex-1 basis-48">
          <h2 id="explore-title" className="text-base font-semibold text-brand-forest">{h.exploreTitle}</h2>
          <p className="mt-1 text-sm text-ink-muted">{h.exploreBody}</p>
        </div>
        <AppLink to={ROUTES.catalog} className={buttonVariants({ variant: 'outline', size: 'sm' })}>{h.exploreAction}<ArrowRight className="h-4 w-4" aria-hidden /></AppLink>
      </section>}
    </div>
  );
}

function ProcessStatus({ process }: { process: TaArufSummary }) {
  const status = process.requestStatus === 'active' ? conversationStatusLabel[process.conversationStatus] : requestStatusLabel[process.requestStatus];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="break-words text-sm font-semibold text-ink">{process.counterpart.displayName}</p>
      <StatusBadge status={status} />
    </div>
  );
}

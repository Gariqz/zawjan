import { ArrowRight, Check, Clock } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { RequireRole } from '@/components/navigation/RequireRole';
import { PageHeader, PrivacyNotice, type StepState } from '@/components/shared';
import { buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { onboardingCopy } from '@/content/id/onboarding';
import { identityStatusLabel } from '@/domain/status';
import type { IdentityStatus, ViewerContext } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { FocusedLayout } from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import { AppLink, useQueryParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { OnboardingGuide } from './OnboardingGuide';

const c = onboardingCopy.start;

function identityStep(s: IdentityStatus): StepState {
  if (s === 'approved') return 'done';
  if (s === 'automated_check' || s === 'needs_manual_review' || s === 'submitting') return 'submitted';
  return 'current';
}

export function onboardingSteps(v: ViewerContext) {
  const id = v.ageEligible ? identityStep(v.identityStatus) : 'current';
  const identity = c.steps.identity;
  const identityActions: Partial<Record<IdentityStatus, string>> = {
    not_started: identity.action,
    resubmission_required: identity.fix,
    temporarily_unavailable: identity.retry,
  };
  const identityCta = (v.ageEligible && identityActions[v.identityStatus]) || identity.view;
  return [
    { key: 'account', label: c.steps.account.label, state: (v.emailConfirmed ? 'done' : 'current') as StepState, detail: v.emailConfirmed ? c.steps.account.done : c.steps.account.todo },
    { key: 'identity', label: identity.label, state: id, detail: v.ageEligible ? identityStatusLabel[v.identityStatus].label : identity.underage, to: ROUTES.verification, cta: identityCta },
    { key: 'cv', label: c.steps.cv.label, state: (v.cvStatus === 'published' ? 'done' : v.cvStatus === 'draft' ? 'current' : 'todo') as StepState, detail: v.cvStatus === 'published' ? 'Terbit' : v.cvStatus === 'draft' ? 'Draf tersimpan' : 'Belum diisi', to: v.cvStatus === 'published' ? ROUTES.myCv : ROUTES.cvNew, cta: v.cvStatus === 'published' ? c.steps.cv.view : c.steps.cv.action },
    { key: 'pendamping', label: c.steps.pendamping.label, state: (v.pendampingStatus === 'accepted' ? 'done' : v.pendampingStatus === 'sent' ? 'submitted' : 'todo') as StepState, detail: onboardingCopy.invite.status[v.pendampingStatus === 'none' ? 'not_invited' : v.pendampingStatus], to: ROUTES.invitePendamping, cta: v.pendampingStatus === 'accepted' || v.pendampingStatus === 'sent' ? c.steps.pendamping.view : c.steps.pendamping.action },
  ];
}

/** ONB-01 — progress from real server status; "submitted" is distinct from "completed". */
export default function StartPage() {
  const { auth } = useServices();
  const q = useQuery(() => auth.getViewer(), []);
  const [guide, setGuide] = useQueryParam('panduan');
  return (
    <RequireRole roles={['participant']}>
      <FocusedLayout exitTo={ROUTES.home} exitLabel="Ke beranda" aside={<PrivacyNotice title={c.privacyTitle}>{c.privacyBody}</PrivacyNotice>}>
        <PageHeader title={c.title} description={c.lead} />
        <div className="flex flex-col gap-6">
          <OnboardingGuide initiallyOpen={guide === '1'} onClose={() => { if (guide !== null) setGuide(null); }} />
          <QueryView query={q} skeleton="list">
            {(v) => <OnboardingChecklist viewer={v} />}
          </QueryView>
        </div>
      </FocusedLayout>
    </RequireRole>
  );
}

function OnboardingChecklist({ viewer }: { viewer: ViewerContext }) {
  const steps = onboardingSteps(viewer);
  const done = steps.filter((s) => s.state === 'done').length;
  const next = steps.find((s) => s.state === 'current' || s.state === 'todo');
  return (
    <section aria-labelledby="preparation-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="preparation-title" className="text-lg font-semibold text-brand-forest">{c.checklist}</h2>
        <p className="text-sm text-ink-muted">{c.progress(done, steps.length)}</p>
      </div>
      <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-white" aria-labelledby="preparation-title">
        {steps.map((s, i) => (
          <li key={s.key} aria-current={s === next ? 'step' : undefined} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 p-4', s === next && 'bg-brand-mint/60')}>
            <span aria-hidden className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              s.state === 'done' ? 'bg-brand-primary text-white'
                : s.state === 'submitted' ? 'bg-accent-amber-soft text-accent-amber-text'
                  : s === next ? 'border border-brand-primary text-brand-primary' : 'border border-line-strong text-ink-muted')}>
              {s.state === 'done' ? <Check className="h-4 w-4" /> : s.state === 'submitted' ? <Clock className="h-4 w-4" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="text-sm font-semibold text-ink">{s.label}</h3>
              <p className="mt-0.5 text-sm text-ink-muted">{s.detail}</p>
            </div>
            {s.to && <AppLink to={s.to} className={cn(buttonVariants({ variant: s === next ? 'primary' : 'outline', size: 'sm' }), 'ml-11 whitespace-normal sm:ml-0')}>
              {s.cta}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </AppLink>}
          </li>
        ))}
      </ol>
      {done === steps.length && <Callout className="mt-4" tone="success" title={c.ready}
        action={viewer.capabilities.canBrowseCandidates ? <AppLink to={ROUTES.catalog} className={buttonVariants()}>{c.toCatalog}</AppLink> : undefined} />}
    </section>
  );
}

import { useState } from 'react';
import { CheckCircle2, Clock, CloudOff, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { RequireRole } from '@/components/navigation/RequireRole';
import { PageHeader, PrivacyNotice } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { onboardingCopy } from '@/content/id/onboarding';
import type { IdentityStatus, UploadHandle } from '@/domain/types';
import { DocumentCapture } from '@/modules/brandykeun/features/identity/DocumentCapture';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { FocusedLayout } from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import { AppLink, useQueryParam } from '@/routing/navigation';
import { roleHome } from '@/routing/roleHome';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useViewer } from '@/state/viewer';

const c = onboardingCopy.verification;

/** ONB-02 — provider-agnostic identity + age verification with honest outcomes. */
export default function VerificationPage() {
  return (
    <RequireRole roles={['participant', 'pendamping']}>
      <VerificationInner />
    </RequireRole>
  );
}

function VerificationInner() {
  const viewer = useViewer();
  const { identity } = useServices();
  const status = useQuery(() => identity.getStatus(), []);
  const [langkah] = useQueryParam('langkah');
  const [step, setStep] = useState<'outcome' | 'intro' | 'capture'>(langkah === 'unggah' ? 'capture' : 'outcome');
  const home = roleHome(viewer.roles);

  return (
    <FocusedLayout exitTo={home} aside={<PrivacyNotice title="Data identitas Anda">{c.notVerified}</PrivacyNotice>}>
      <PageHeader title={c.title} />
      <QueryView query={status} skeleton="detail">
        {(s) => {
          if (!viewer.ageEligible) return <Outcome status="rejected" underage home={home} />;
          const canCapture = s === 'not_started' || s === 'resubmission_required' || s === 'temporarily_unavailable';
          const effective = step !== 'outcome' && canCapture ? step : s === 'not_started' ? 'intro' : 'outcome';
          if (effective === 'intro') return <Intro onStart={() => setStep('capture')} />;
          if (effective === 'capture') return <Capture onSubmitted={() => setStep('outcome')} />;
          return <Outcome status={s} home={home} onRetry={() => setStep('capture')} />;
        }}
      </QueryView>
    </FocusedLayout>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{c.introTitle}</h2>
        <ul className="flex flex-col gap-3">
          {c.introPoints.map((p) => <li key={p} className="flex gap-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden />{p}</li>)}
        </ul>
        <Callout tone="info">{c.notVerified}</Callout>
        <Button size="lg" onClick={onStart} className="sm:w-fit">{c.start}</Button>
      </CardContent>
    </Card>
  );
}

function Capture({ onSubmitted }: { onSubmitted: () => void }) {
  const { identity } = useServices();
  const [doc, setDoc] = useState<UploadHandle | null>(null);
  const [selfie, setSelfie] = useState<UploadHandle | null>(null);
  const action = useAction(identity.submitVerification);
  const submit = async () => {
    if (!doc || !selfie) return;
    const r = await action.run({ documentUploadId: doc.uploadId, selfieUploadId: selfie.uploadId });
    if (r?.ok) onSubmitted();
  };
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{c.captureTitle}</h2>
      <DocumentCapture kind="document" label={c.documentLabel} hint={c.documentHint} onChange={setDoc} />
      <DocumentCapture kind="selfie" label={c.selfieLabel} hint={c.selfieHint} onChange={setSelfie} />
      {action.error && <ActionErrorCallout code={action.error.code} {...(action.error.message ? { message: action.error.message } : {})} />}
      <Button size="lg" onClick={submit} disabled={!doc || !selfie} busy={action.busy} className="sm:w-fit">{c.submit}</Button>
    </div>
  );
}

function Outcome({ status, home, onRetry, underage }: { status: IdentityStatus; home: string; onRetry?: () => void; underage?: boolean }) {
  const viewer = useViewer();
  const isParticipant = viewer.roles.includes('participant');
  if (status === 'submitting' || status === 'automated_check') {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" aria-hidden />
        <h2 className="text-xl font-semibold">{c.checkingTitle}</h2>
        <p className="max-w-md text-ink-muted">{c.checkingBody}</p>
        {isParticipant && <AppLink to={ROUTES.cvNew} className={buttonVariants({ variant: 'outline' })}>{c.editCv}</AppLink>}
      </CardContent></Card>
    );
  }
  const map = {
    approved: { icon: CheckCircle2, color: 'text-success', ...c.outcomes.approved },
    needs_manual_review: { icon: Clock, color: 'text-accent-amber-text', ...c.outcomes.manual },
    resubmission_required: { icon: ShieldAlert, color: 'text-accent-amber-text', ...c.outcomes.resubmit },
    temporarily_unavailable: { icon: CloudOff, color: 'text-ink-muted', ...c.outcomes.unavailable },
    rejected: { icon: XCircle, color: 'text-danger', ...(underage ? c.outcomes.underage : c.outcomes.rejected) },
    not_started: { icon: ShieldAlert, color: 'text-ink-muted', ...c.outcomes.resubmit },
  } as const;
  const m = map[status as keyof typeof map] ?? map.not_started;
  const Icon = m.icon;
  return (
    <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center" role="status">
      <Icon className={cn('h-10 w-10', m.color)} aria-hidden />
      <h2 className="text-xl font-semibold">{m.title}</h2>
      <p className="max-w-md text-ink-muted">{m.body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {(status === 'resubmission_required' || status === 'temporarily_unavailable') && onRetry && <Button onClick={onRetry}>{c.retry}</Button>}
        {status === 'approved' && <AppLink to={isParticipant ? ROUTES.start : home} className={buttonVariants()}>{c.continue}</AppLink>}
        {status === 'needs_manual_review' && isParticipant && <AppLink to={ROUTES.cvNew} className={buttonVariants({ variant: 'outline' })}>{c.editCv}</AppLink>}
        {status !== 'approved' && <AppLink to={home} className={buttonVariants({ variant: 'ghost' })}>Ke beranda</AppLink>}
      </div>
    </CardContent></Card>
  );
}

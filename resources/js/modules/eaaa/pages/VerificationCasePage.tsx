import { useState, type FormEvent } from 'react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConsentSummary, PageHeader, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/field';
import { staffCopy } from '@/content/id/staff';
import type { AuditEntry, VerificationCaseDetail, VerificationDecision } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { DesktopOnly, StaffLayout } from '@/layouts/AdminLayout';
import { cn, formatDateTime } from '@/lib/utils';
import { useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { caseStateLabel } from './VerificationQueuePage';

const c = staffCopy.verificationCase;

export function AuditList({ entries, title }: { entries: AuditEntry[]; title: string }) {
  return (
    <Card><CardContent>
      <CardTitle className="text-base">{title}</CardTitle>
      {entries.length === 0 ? <p className="mt-2 text-sm text-ink-muted">Belum ada entri.</p> : (
        <ol className="mt-3 flex flex-col gap-3 border-l-2 border-line pl-4">
          {entries.map((a) => (
            <li key={a.id} className="text-sm">
              <p className="font-semibold">{a.action}</p>
              <p className="text-ink-muted">{a.actor} · {formatDateTime(a.at)}</p>
              {a.reason && <p className="mt-0.5 text-ink-muted">“{a.reason}”</p>}
            </li>
          ))}
        </ol>
      )}
    </CardContent></Card>
  );
}

/** MOD-03 — document review with recorded decision. Desktop only. */
export default function VerificationCasePage() {
  const id = useRouteParam('id');
  const { moderator } = useServices();
  const q = useQuery(() => moderator.getVerificationCase(id), [id]);
  return (
    <StaffLayout role="moderator">
      <QueryView query={q} skeleton="detail" backTo={ROUTES.modVerification}>
        {(d) => (
          <>
            <PageHeader backTo={ROUTES.modVerification} backLabel={staffCopy.verification.title} title={d.caseRef}
              description={`Masuk ${formatDateTime(d.submittedAt)}`} actions={<StatusBadge status={caseStateLabel[d.state]} />} />
            <DesktopOnly><CaseBody d={d} /></DesktopOnly>
          </>
        )}
      </QueryView>
    </StaffLayout>
  );
}

function CaseBody({ d }: { d: VerificationCaseDetail }) {
  const { moderator } = useServices();
  const toast = useToast();
  const [kind, setKind] = useState<VerificationDecision['kind']>('approve');
  const [reason, setReason] = useState('');
  const review = useAction(moderator.reviewVerification);
  const pending = d.state === 'pending';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const decision: VerificationDecision = kind === 'approve' ? { kind } : { kind, reason };
    const r = await review.run(d.id, decision);
    if (r?.ok) toast(c.decided);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-4">
        <ConsentSummary items={[
          { label: c.applicant, value: d.applicantDisplayName },
          { label: c.role, value: staffCopy.roles[d.applicantRole] },
          { label: c.document, value: <span className="font-mono">{d.maskedDocumentNumber}</span> },
          { label: c.automated, value: <><strong className="text-ink">{c.outcomes[d.automatedResult.outcome]}</strong> — {d.automatedResult.reason}</> },
          { label: staffCopy.verification.cols.age, value: staffCopy.verification.age[d.ageEligibility] },
        ]} />
        <Card><CardContent>
          <CardTitle className="text-base">{c.documents}</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">{c.documentsNote}</p>
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {d.documents.map((doc) => (
              <li key={doc.id}>
                <figure className="overflow-hidden rounded-card border border-line">
                  <img src={doc.protectedUrl} alt={`${doc.label} (contoh fiktif)`} className="aspect-[4/3] w-full bg-surface-canvas object-contain" draggable={false} />
                  <figcaption className="border-t border-line p-2 text-sm font-semibold">{doc.label}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      </div>
      <div className="flex flex-col gap-4">
        <Card><CardContent>
          <CardTitle className="text-base">{c.decision}</CardTitle>
          {!pending ? <Callout tone="info" className="mt-3">{c.alreadyDecided}</Callout> : (
            <form onSubmit={submit} className="mt-3 flex flex-col gap-3" noValidate>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">{c.decision}</legend>
                {([['approve', c.approve], ['request_resubmission', c.resubmit], ['reject', c.reject]] as const).map(([k, label]) => (
                  <label key={k} className={cn('flex min-h-touch cursor-pointer items-center gap-3 rounded-control border px-3 text-sm font-semibold', kind === k ? 'border-brand-primary bg-brand-mint' : 'border-line-strong')}>
                    <input type="radio" name="decision" checked={kind === k} onChange={() => setKind(k)} className="h-4 w-4 accent-brand-primary" />{label}
                  </label>
                ))}
              </fieldset>
              {kind !== 'approve' && (
                <Field label={c.reason} hint={c.reasonHint} required error={review.error?.fieldErrors?.reason}>
                  {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}
                </Field>
              )}
              {review.error && !review.error.fieldErrors && <ActionErrorCallout code={review.error.code} {...(review.error.message ? { message: review.error.message } : {})} />}
              <Button type="submit" busy={review.busy} variant={kind === 'reject' ? 'danger' : 'primary'}>{c.submit}</Button>
            </form>
          )}
        </CardContent></Card>
        <AuditList entries={d.audit} title={c.audit} />
      </div>
    </div>
  );
}

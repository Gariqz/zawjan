import { useState, type FormEvent } from 'react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ConsentSummary, PageHeader, PrivacyNotice, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/field';
import { participantCopy } from '@/content/id/participant';
import { staffCopy } from '@/content/id/staff';
import { reportCaseStatusLabel } from '@/domain/status';
import type { ReportCaseAction, ReportCaseDetail } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { DesktopOnly, StaffLayout } from '@/layouts/AdminLayout';
import { formatDateTime } from '@/lib/utils';
import { useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { priorityLabel } from './ReportsQueuePage';
import { AuditList } from './VerificationCasePage';

const c = staffCopy.reportCase;
type Act = Exclude<ReportCaseAction['kind'], 'note'>;

/** MOD-05 — evidence-only case review. No whole-room decrypt path exists in the UI or contract. */
export default function ReportCasePage() {
  const id = useRouteParam('id');
  const { moderator } = useServices();
  const q = useQuery(() => moderator.getReportEvidence(id), [id]);
  return (
    <StaffLayout role="moderator">
      <QueryView query={q} skeleton="detail" backTo={ROUTES.modReports}>
        {(d) => (
          <>
            <PageHeader backTo={ROUTES.modReports} backLabel={staffCopy.reports.title} title={d.ref} description={`${participantCopy.report.categories[d.category]} · diterima ${formatDateTime(d.receivedAt)}`}
              actions={<><StatusBadge status={priorityLabel[d.priority]} /><StatusBadge status={reportCaseStatusLabel[d.status]} /></>} />
            <DesktopOnly><CaseBody d={d} /></DesktopOnly>
          </>
        )}
      </QueryView>
    </StaffLayout>
  );
}

function CaseBody({ d }: { d: ReportCaseDetail }) {
  const { moderator } = useServices();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [act, setAct] = useState<Act | null>(null);
  const [reason, setReason] = useState('');
  const addNote = useAction(moderator.updateReportCase);
  const doAct = useAction(moderator.updateReportCase);
  const closed = d.status === 'closed';

  const submitNote = async (e: FormEvent) => {
    e.preventDefault();
    const r = await addNote.run(d.id, { kind: 'note', text: note });
    if (r?.ok) setNote('');
  };
  const labels: Record<Act, string> = { warn: c.warn, suspend: c.suspend, ban: c.ban, close: c.close };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-4">
        <PrivacyNotice title={c.evidenceOnly}>{c.evidenceOnlyBody}</PrivacyNotice>
        <ConsentSummary items={[
          { label: staffCopy.reports.cols.reporter, value: d.reporterDisplay },
          { label: c.subject, value: d.subjectDisplay },
          ...(d.otherReason ? [{ label: 'Alasan lain', value: d.otherReason }] : []),
          { label: c.description, value: d.description || '—' },
        ]} />
        <Card><CardContent>
          <CardTitle className="text-base">{c.evidence} ({d.evidence.length})</CardTitle>
          {d.evidence.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{c.noEvidence}</p> : (
            <ol className="mt-3 flex flex-col gap-2">
              {d.evidence.map((e) => (
                <li key={e.messageId} className="rounded-control border border-line bg-surface-canvas p-3 text-sm">
                  <p className="text-xs text-ink-subtle">{e.senderDisplay} · {e.senderRole === 'pendamping' ? 'Pendamping' : 'Peserta'} · {formatDateTime(e.sentAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap">{e.body}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent></Card>
        <Card><CardContent>
          <CardTitle className="text-base">{c.notes}</CardTitle>
          <ul className="mt-2 flex flex-col gap-2">
            {d.notes.map((n, i) => <li key={i} className="text-sm"><span className="text-xs text-ink-subtle">{n.author} · {formatDateTime(n.at)}</span><br />{n.text}</li>)}
          </ul>
          <form onSubmit={submitNote} className="mt-3 flex flex-col gap-2" noValidate>
            <Field label={c.addNote} error={addNote.error?.fieldErrors?.text}>{(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder={c.notePlaceholder} />}</Field>
            <Button type="submit" size="sm" variant="outline" className="w-fit" busy={addNote.busy}>{c.addNote}</Button>
          </form>
        </CardContent></Card>
      </div>
      <div className="flex flex-col gap-4">
        <Card><CardContent>
          <CardTitle className="text-base">{c.actions}</CardTitle>
          <div className="mt-3 flex flex-col gap-2">
            {(['warn', 'suspend', 'ban', 'close'] as Act[]).map((k) => (
              <Button key={k} variant={k === 'ban' || k === 'suspend' ? 'danger-outline' : 'outline'} disabled={closed} onClick={() => { setReason(''); doAct.clearError(); setAct(k); }}>{labels[k]}</Button>
            ))}
          </div>
        </CardContent></Card>
        <AuditList entries={d.audit} title={c.audit} />
      </div>
      <ConfirmDialog open={act !== null} onOpenChange={(o) => !o && setAct(null)} title={act ? labels[act] : ''} confirmLabel={c.confirm}
        tone={act === 'ban' || act === 'suspend' ? 'danger' : 'primary'} busy={doAct.busy}
        onConfirm={async () => { if (!act) return; const r = await doAct.run(d.id, { kind: act, reason }); if (r?.ok) { setAct(null); toast(c.done); } }}>
        <Field label={c.reason} required error={doAct.error?.fieldErrors?.reason}>{(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}</Field>
        {doAct.error && !doAct.error.fieldErrors && <ActionErrorCallout className="mt-3" code={doAct.error.code} />}
      </ConfirmDialog>
    </div>
  );
}

import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConsentSummary, PageHeader, PrivacyNotice } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';
import { REPORT_OTHER_LIMIT, validReportOtherReason } from '@/domain/validation';
import { participantCopy } from '@/content/id/participant';
import { REPORT_CATEGORIES, type ActionResult, type EvidenceItem, type MessageView, type ReportCategory, type ReportReceipt, type TaArufSummary } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout, PendampingLayout } from '@/layouts/RoleLayouts';
import { cn, formatDateTime } from '@/lib/utils';
import { AppLink, useQueryParams } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { useViewer, useViewerState } from '@/state/viewer';

const c = participantCopy.report;
const EVIDENCE_UNAVAILABLE = 'Bukti pesan tidak dapat dimuat. Anda tetap dapat mengirim laporan tanpa bukti pesan.';

interface Context { room?: TaArufSummary; subjectId: string; subjectName: string }

/** PAR-10 — reporter-selected evidence only; safe exit stays available even if submission fails. */
export default function ReportNewPage() {
  const viewer = useViewerState();
  const pendamping = viewer.status === 'success' && !viewer.data.roles.includes('participant') && viewer.data.roles.includes('pendamping');
  const Layout = pendamping ? PendampingLayout : ParticipantLayout;
  const [params] = useQueryParams();
  const roomId = params.ruang ?? '';
  const subjectParam = params.subjek ?? '';
  const defaultExit = params.akhiri === '1';
  return <Layout><ReportLoader key={JSON.stringify([roomId, subjectParam, defaultExit])} roomId={roomId} subjectParam={subjectParam} defaultExit={defaultExit} pendamping={pendamping} /></Layout>;
}

function ReportLoader({ roomId, subjectParam, defaultExit, pendamping }: { roomId: string; subjectParam: string; defaultExit: boolean; pendamping: boolean }) {
  const { conversations, candidates } = useServices();
  const q = useQuery(async (): Promise<ActionResult<Context>> => {
    if (roomId) {
      const room = await conversations.getRoom(roomId);
      if (!room.ok) return room;
      if (!room.data.capabilities.canReport) return { ok: false, code: 'FORBIDDEN' };
      return { ok: true, data: { room: room.data, subjectId: room.data.counterpart.id, subjectName: room.data.counterpart.displayName } };
    }
    if (pendamping) return { ok: false, code: 'VALIDATION_ERROR', message: 'Buka formulir laporan dari ruang percakapan yang Anda dampingi.' };
    if (subjectParam) {
      const d = await candidates.getDetail(subjectParam);
      return { ok: true, data: { subjectId: subjectParam, subjectName: d.ok ? d.data.displayName : 'Pengguna' } };
    }
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Buka formulir laporan dari profil calon, ruang percakapan, atau riwayat ta\'aruf.' };
  }, [roomId, subjectParam, pendamping]);
  const fallback = pendamping ? ROUTES.guardianAssignments : ROUTES.safety;
  const backTo = roomId ? (pendamping ? ROUTES.guardianRoom(roomId) : ROUTES.chat(roomId)) : fallback;
  return (
    <>
      <PageHeader backTo={backTo} title={c.title} description={c.lead} />
      <QueryView query={q} skeleton="detail" backTo={fallback}>{(ctx) => <ReportFlow ctx={ctx} defaultExit={defaultExit} pendamping={pendamping} />}</QueryView>
    </>
  );
}

function ReportFlow({ ctx, defaultExit, pendamping }: { ctx: Context; defaultExit: boolean; pendamping: boolean }) {
  const { safety, conversations, codec } = useServices();
  const viewer = useViewer();
  const room = ctx.room;
  const evidenceQuery = useQuery(async (): Promise<ActionResult<MessageView[]>> => {
    if (!room) return { ok: true, data: [] };
    const env = await conversations.listEncryptedMessages(room.id);
    if (!env.ok) return env;
    return { ok: true, data: await codec.decodeForViewer(env.data, room, viewer.id) };
  }, [room?.id, viewer.id]);
  const toast = useToast();
  const [step, setStep] = useState<'form' | 'review' | 'done'>('form');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const reasonInput = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [alsoExit, setAlsoExit] = useState(defaultExit);
  const [catError, setCatError] = useState<string>();
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null);
  const [exited, setExited] = useState(false);
  const submit = useAction(safety.submitReport);
  const exit = useAction(conversations.exit);
  const reportable = evidenceQuery.data?.filter((m) => m.mayReport) ?? [];
  const evidence: EvidenceItem[] = reportable.filter((m) => picked.includes(m.id))
    .map((m) => ({ messageId: m.id, senderDisplay: m.senderDisplayName, senderRole: m.senderRole, sentAt: m.sentAt, body: m.displayBody }));
  const canExit = !pendamping && !!room?.capabilities.canExit && !exited;
  const willExit = canExit && alsoExit;
  const willFreeze = !exited && room?.requestStatus === 'active'
    && ['active', 'paused_guardian_missing', 'paused_user'].includes(room.conversationStatus);
  const roomEffect = willExit ? "Ruang ditutup dan ta'aruf diakhiri" : willFreeze ? 'Ruang dibekukan' : null;

  const toReview = (e: FormEvent) => {
    e.preventDefault();
    if (!category) { setCatError('Pilih kategori laporan.'); document.getElementById(`cat-${REPORT_CATEGORIES[0]}`)?.focus(); return; }
    setCatError(undefined);
    if (category === 'other' && !validReportOtherReason(otherReason)) {
      setReasonError('Tulis alasan dalam satu baris, maksimal 100 karakter.');
      reasonInput.current?.focus();
      return;
    }
    setReasonError(undefined);
    setStep('review');
  };
  const send = async () => {
    if (!category || exit.busy) return;
    const r = await submit.run({ subjectUserId: ctx.subjectId, ...(room ? { roomId: room.id } : {}), category, ...(category === 'other' ? { otherReason: otherReason.trim() } : {}), description: description.trim(), evidence, alsoExit: willExit });
    if (r?.ok) { setReceipt(r.data); setStep('done'); }
  };
  const safeExit = async () => {
    if (!room || !canExit) return;
    const r = await exit.run(room.id);
    if (r?.ok) { setExited(true); toast(participantCopy.chat.exited); }
  };

  if (step === 'done' && receipt) {
    return (
      <Card><CardContent className="flex flex-col items-center py-10 text-center" role="status">
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold text-brand-forest">{c.successTitle}</h2>
        <p className="mt-2 max-w-md text-ink-muted">{c.successBody(receipt.reportId)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <AppLink to={pendamping ? ROUTES.guardianHome : ROUTES.home} className={buttonVariants()}>Ke beranda</AppLink>
          <AppLink to={pendamping ? ROUTES.guardianAssignments : ROUTES.safety} className={buttonVariants({ variant: 'outline' })}>{pendamping ? 'Pendampingan' : 'Pusat keamanan'}</AppLink>
        </div>
      </CardContent></Card>
    );
  }

  const safeExitPanel = canExit && (
    <Callout tone="warning" title={c.safeExitTitle} action={<Button size="sm" variant="danger" busy={exit.busy} onClick={() => void safeExit()}>{participantCopy.chat.exit}</Button>}>
      {submit.error ? c.failedSafeExit : c.safeExitBody}
      {exit.error && <ActionErrorCallout className="mt-2" code={exit.error.code} />}
    </Callout>
  );

  if (step === 'review') {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{c.reviewTitle}</h2>
        <ConsentSummary items={[
          { label: c.subject, value: ctx.subjectName },
          { label: c.category, value: category ? c.categories[category] : '—' },
          ...(category === 'other' ? [{ label: 'Alasan lain', value: otherReason.trim() }] : []),
          { label: 'Keterangan tambahan', value: description.trim() || '—' },
          { label: 'Bukti', value: evidence.length ? c.selected(evidence.length) : 'Tanpa bukti pesan' },
          ...(roomEffect ? [{ label: 'Setelah dikirim', value: roomEffect }] : []),
        ]} />
        <PrivacyNotice title={c.scopeNote}>
          {evidenceQuery.status === 'error' && <p className="mt-2" role="status">{EVIDENCE_UNAVAILABLE}</p>}
          {evidence.length > 0 && <ul className="mt-2 flex flex-col gap-2">{evidence.map((e) => <li key={e.messageId} className="rounded-control bg-surface-white p-2 text-ink [overflow-wrap:anywhere]"><span className="text-xs text-ink-subtle">{e.senderDisplay} · {formatDateTime(e.sentAt)}</span><br />{e.body}</li>)}</ul>}
        </PrivacyNotice>
        {submit.error && <ActionErrorCallout code={submit.error.code} {...(submit.error.message ? { message: submit.error.message } : {})} />}
        {safeExitPanel}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setStep('form')} disabled={submit.busy}>{c.back}</Button>
          <Button variant="danger" busy={submit.busy} disabled={exit.busy} onClick={() => void send()}>{c.submit}</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={toReview} noValidate className="flex flex-col gap-5">
      <Callout tone="info" title={c.subject}>{ctx.subjectName}</Callout>
      <fieldset aria-describedby={catError ? 'cat-err' : undefined}>
        <legend className="mb-2 text-sm font-semibold">{c.category} <span className="font-medium text-ink-subtle">(wajib)</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_CATEGORIES.map((k) => (
            <label key={k} htmlFor={`cat-${k}`} className={cn('flex min-h-touch cursor-pointer items-center gap-3 rounded-control border bg-surface-white px-3 py-2 text-sm', category === k ? 'border-brand-primary bg-brand-mint' : 'border-line-strong')}>
              <input id={`cat-${k}`} type="radio" name="category" value={k} checked={category === k} onChange={() => setCategory(k)} className="h-4 w-4 accent-brand-primary" aria-invalid={catError ? true : undefined} />
              {c.categories[k]}
            </label>
          ))}
        </div>
        {catError && <p id="cat-err" role="alert" className="mt-1 text-sm font-medium text-danger">{catError}</p>}
      </fieldset>
      {category === 'other' && <Field label="Alasan lain" required hint="Satu baris, maksimal 100 karakter." {...(reasonError ? { error: reasonError } : {})}>
        {(p) => <Input {...p} ref={reasonInput} required value={otherReason} maxLength={REPORT_OTHER_LIMIT} onChange={(e) => { setOtherReason(e.target.value); setReasonError(undefined); }} />}
      </Field>}
      <Field label="Keterangan tambahan">{(p) => <Textarea {...p} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />}</Field>
      <fieldset className="min-w-0">
        <legend className="mb-1 text-sm font-semibold">{c.evidence}</legend>
        <p className="mb-2 text-sm text-ink-muted" aria-live="polite">
          {room && evidenceQuery.status === 'loading' ? 'Memuat pilihan bukti. Anda dapat melanjutkan tanpa bukti pesan.'
            : evidenceQuery.status === 'error' ? EVIDENCE_UNAVAILABLE : reportable.length ? c.selected(evidence.length) : c.evidenceNone}
        </p>
        {evidenceQuery.status === 'error' && <Button size="sm" variant="outline" onClick={evidenceQuery.reload}>Muat ulang bukti</Button>}
        {reportable.length > 0 && (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-card border border-line bg-surface-white p-2">
            {reportable.map((m) => (
              <li key={m.id} className="[overflow-wrap:anywhere]">
                <Checkbox checked={picked.includes(m.id)} onChange={(e) => setPicked((s) => (e.target.checked ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                  label={<span className="text-xs text-ink-subtle">{m.senderDisplayName} · {formatDateTime(m.sentAt)}</span>} description={<span className="text-ink">{m.displayBody}</span>} />
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      {canExit && <Checkbox label={c.alsoExit} checked={willExit} onChange={(e) => setAlsoExit(e.target.checked)} />}
      {safeExitPanel}
      <Button type="submit" size="lg" className="sm:w-fit">{c.review}</Button>
    </form>
  );
}

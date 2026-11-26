import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Lock, Users } from 'lucide-react';
import { ActionErrorCallout } from '@/components/feedback';
import { ProgressSteps, type StepState } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { common } from '@/content/id/common';
import { onboardingCopy } from '@/content/id/onboarding';
import type { CvAudience, CvDraft, CvFieldSchema, CvSchema } from '@/domain/types';
import { validateCvSection } from '@/domain/validation';
import { useAction } from '@/hooks/useAction';
import { formatTime } from '@/lib/utils';
import { useServices } from '@/services/registry';

const c = onboardingCopy.cv;
const audienceIcon: Record<CvAudience, typeof Eye> = { catalog: Users, after_request: Eye, private: Lock };

export function AudienceBadge({ audience }: { audience: CvAudience }) {
  const Icon = audienceIcon[audience];
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted"><Icon className="h-3.5 w-3.5" aria-hidden />{c.audience[audience]}</span>;
}

/** Schema-driven, step-by-step CV editor. Draft stays in component state if the service fails. */
export function CvEditor({ schema, draft, onPublished, onCancel }: { schema: CvSchema; draft: CvDraft; onPublished: () => void; onCancel?: () => void }) {
  const { profile } = useServices();
  const [values, setValues] = useState<Record<string, string>>(draft.values);
  const [stepIdx, setStepIdx] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<string | undefined>(draft.updatedAt);
  const save = useAction(profile.saveCvDraft);
  const publish = useAction(profile.publishCv);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sections = schema.sections;
  const isReview = stepIdx === sections.length;
  const section = sections[stepIdx];

  useEffect(() => { headingRef.current?.focus(); }, [stepIdx]);

  const steps = useMemo(() => [...sections.map((s, i) => ({
    label: s.title,
    state: (i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'todo') as StepState,
  })), { label: c.review, state: (isReview ? 'current' : 'todo') as StepState }], [sections, stepIdx, isReview]);

  const doSave = async () => {
    const r = await save.run(values);
    if (r?.ok) setSavedAt(r.data.updatedAt);
    return r?.ok ?? false;
  };
  const next = async () => {
    if (!section) return;
    const errs = validateCvSection(schema, section.id, { values, status: draft.status });
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) { document.getElementById(`cv-${first}`)?.focus(); return; }
    await doSave();
    setStepIdx((i) => i + 1);
  };
  const doPublish = async () => {
    if (!(await doSave())) return;
    const r = await publish.run();
    if (r?.ok) onPublished();
    else if (r && !r.ok && r.fieldErrors) {
      setErrors(r.fieldErrors);
      const idx = sections.findIndex((s) => s.fields.some((f) => r.fieldErrors?.[f.id]));
      if (idx >= 0) setStepIdx(idx);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ProgressSteps steps={steps} label={c.stepLabel} />
      <p className="text-sm text-ink-muted md:hidden">Bagian {Math.min(stepIdx + 1, sections.length + 1)} dari {sections.length + 1}: <strong className="text-ink">{isReview ? c.review : section?.title}</strong></p>
      <Card>
        <CardContent className="flex flex-col gap-5">
          {section && !isReview && (
            <>
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold">{section.title}</h2>
                <div className="mt-1"><AudienceBadge audience={section.audience} /></div>
                {section.description && <p className="mt-2 text-sm text-ink-muted">{section.description}</p>}
              </div>
              {section.fields.map((f) => <CvField key={f.id} field={f} value={values[f.id] ?? ''} error={errors[f.id]} onChange={(v) => setValues((x) => ({ ...x, [f.id]: v }))} />)}
            </>
          )}
          {isReview && (
            <>
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold">{c.reviewTitle}</h2>
                <p className="mt-1 text-sm text-ink-muted">{c.reviewLead}</p>
              </div>
              <CvReadView schema={schema} values={values} onEdit={(i) => setStepIdx(i)} />
            </>
          )}
          {(save.error || publish.error) && (
            save.error ? <Callout tone="warning" role="alert">{c.saveFailed}</Callout> : publish.error && <ActionErrorCallout code={publish.error.code} {...(publish.error.message ? { message: publish.error.message } : {})} />
          )}
        </CardContent>
        <div className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <div className="flex gap-2">
            {stepIdx > 0 && <Button variant="ghost" onClick={() => setStepIdx((i) => i - 1)}>{common.actions.previous}</Button>}
            {onCancel && <Button variant="ghost" onClick={onCancel}>{common.actions.cancel}</Button>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-xs text-ink-subtle" aria-live="polite">{savedAt ? `${c.savedAt} ${formatTime(savedAt)}` : ''}</span>
            <Button variant="outline" onClick={() => void doSave()} busy={save.busy}>{c.saveDraft}</Button>
            {isReview
              ? <Button onClick={doPublish} busy={publish.busy || save.busy}>{c.publish}</Button>
              : <Button onClick={next} busy={save.busy}>{stepIdx === sections.length - 1 ? c.review : c.next}</Button>}
          </div>
        </div>
      </Card>
    </div>
  );
}

function CvField({ field, value, error, onChange }: { field: CvFieldSchema; value: string; error?: string | undefined; onChange: (v: string) => void }) {
  const hint = [field.help, field.sensitive ? 'Bersifat pribadi; isi hanya bila Anda nyaman.' : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <Field label={field.label} hint={hint} required={field.required} error={error}>
      {(p) => {
        const common = { ...p, id: `cv-${field.id}` };
        if (field.kind === 'textarea') return <Textarea {...common} value={value} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />;
        if (field.kind === 'select') return (
          <Select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Pilih…</option>
            {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        );
        return <Input {...common} type={field.kind === 'number' ? 'number' : 'text'} inputMode={field.kind === 'number' ? 'numeric' : undefined} value={value} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} />;
      }}
    </Field>
  );
}

/** Read-only CV with explicit audience for every section. */
export function CvReadView({ schema, values, onEdit }: { schema: CvSchema; values: Record<string, string>; onEdit?: (sectionIndex: number) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {schema.sections.map((s, i) => (
        <section key={s.id} aria-labelledby={`cvr-${s.id}`} className="rounded-card border border-line p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 id={`cvr-${s.id}`} className="font-semibold text-brand-forest">{s.title}</h3>
              <AudienceBadge audience={s.audience} />
            </div>
            {onEdit && <Button size="sm" variant="ghost" onClick={() => onEdit(i)} aria-label={`Ubah bagian ${s.title}`}>Ubah</Button>}
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {s.fields.map((f) => (
              <div key={f.id} className={f.kind === 'textarea' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs font-semibold text-ink-subtle">{f.label}</dt>
                <dd className="mt-0.5 text-sm">{values[f.id]?.trim() ? values[f.id] : <span className="text-ink-subtle">{c.notFilled}</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function CvStatusBadge({ status }: { status: CvDraft['status'] }) {
  return status === 'published' ? <Badge tone="success">{c.statusPublished}</Badge> : status === 'draft' ? <Badge tone="warning">{c.statusDraft}</Badge> : <Badge>{c.statusEmpty}</Badge>;
}

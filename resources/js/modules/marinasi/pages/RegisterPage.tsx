import { useState, type FormEvent } from 'react';
import { MailCheck } from 'lucide-react';
import { ActionErrorCallout } from '@/components/feedback';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';
import { authCopy } from '@/content/id/auth';
import type { RegisterInput } from '@/domain/types';
import { validateRegistration } from '@/domain/validation';
import { useAction } from '@/hooks/useAction';
import { cn } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useViewerState } from '@/state/viewer';
import { AuthLayout } from './AuthLayout';

const FIELD_ORDER = ['displayName', 'email', 'password', 'dateOfBirth', 'acceptPurpose', 'acceptTerms', 'acceptPrivacy'] as const;

/** AUTH-02 — registration, 19+ eligibility hint, separate unchecked consents. */
export default function RegisterPage() {
  const c = authCopy.register;
  const { auth, mode } = useServices();
  const [form, setForm] = useState<RegisterInput>({ role: 'participant', displayName: '', email: '', password: '', dateOfBirth: '', acceptPurpose: false, acceptTerms: false, acceptPrivacy: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const action = useAction(auth.register);
  const viewer = useViewerState();
  const set = <K extends keyof RegisterInput>(k: K, v: RegisterInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const focusFirst = (errs: Record<string, string>) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateRegistration(form);
    setErrors(errs);
    if (Object.keys(errs).length) { focusFirst(errs); return; }
    const r = await action.run(form);
    if (r?.ok) { setSent(true); viewer.reload(); }
    else if (r && !r.ok && r.fieldErrors) { setErrors(r.fieldErrors); focusFirst(r.fieldErrors); }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div role="status" className="rounded-card border border-line bg-surface-white p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-brand-primary" aria-hidden />
          <h1 className="mt-3 text-2xl font-bold">{c.sentTitle}</h1>
          <p className="mt-2 text-ink-muted">{c.sentBody}</p>
          {mode === 'mock' && <AppLink to={form.role === 'pendamping' ? ROUTES.guardianHome : `${ROUTES.start}?panduan=1`} className={cn(buttonVariants(), 'mt-5')}>{c.continueDev}</AppLink>}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">{c.title}</h1>
      <p className="mt-1 text-ink-muted">{c.lead}</p>
      {action.error && !action.error.fieldErrors && <ActionErrorCallout code={action.error.code} className="mt-5" />}
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <fieldset>
          <legend className="text-sm font-semibold">{c.roleLegend}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {([['participant', c.roleParticipant, c.roleParticipantHint], ['pendamping', c.rolePendamping, c.rolePendampingHint]] as const).map(([v, label, hint]) => (
              <label key={v} className={cn('flex min-h-touch cursor-pointer gap-3 rounded-control border p-3', form.role === v ? 'border-brand-primary bg-brand-mint' : 'border-line-strong bg-surface-white')}>
                <input type="radio" name="role" value={v} checked={form.role === v} onChange={() => set('role', v)} className="mt-1 h-4 w-4 accent-brand-primary" />
                <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-ink-muted">{hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={c.displayName} hint={c.displayNameHint} required error={errors.displayName}>
          {(p) => <Input {...p} data-field="displayName" autoComplete="nickname" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />}
        </Field>
        <Field label={c.email} required error={errors.email}>
          {(p) => <Input {...p} data-field="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label={c.password} hint={c.passwordHint} required error={errors.password}>
          {(p) => <Input {...p} data-field="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />}
        </Field>
        <Field label={c.dob} hint={c.dobHint} required error={errors.dateOfBirth}>
          {(p) => <Input {...p} data-field="dateOfBirth" type="date" autoComplete="bday" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />}
        </Field>
        <div className="flex flex-col gap-1 rounded-card border border-line bg-surface-white p-3">
          <Checkbox data-field="acceptPurpose" label={c.purpose} checked={form.acceptPurpose} onChange={(e) => set('acceptPurpose', e.target.checked)} error={errors.acceptPurpose} />
          <Checkbox data-field="acceptTerms" label={<>{c.terms} <a href="#syarat" className="font-semibold text-brand-primary underline">{c.termsLink}</a>.</>} checked={form.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} error={errors.acceptTerms} />
          <Checkbox data-field="acceptPrivacy" label={<>{c.privacy} <a href="#kebijakan-privasi" className="font-semibold text-brand-primary underline">{c.privacyLink}</a>.</>} checked={form.acceptPrivacy} onChange={(e) => set('acceptPrivacy', e.target.checked)} error={errors.acceptPrivacy} />
        </div>
        <Button type="submit" size="lg" block busy={action.busy}>{c.submit}</Button>
      </form>
      <p className="mt-6 text-sm text-ink-muted">{c.haveAccount} <AppLink to={ROUTES.login} className="font-semibold text-brand-primary hover:underline">{c.login}</AppLink></p>
    </AuthLayout>
  );
}

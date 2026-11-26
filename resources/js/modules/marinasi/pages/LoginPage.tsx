import { useRef, useState, type FormEvent } from 'react';
import { ActionErrorCallout } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field, Input } from '@/components/ui/field';
import { authCopy } from '@/content/id/auth';
import { useAction } from '@/hooks/useAction';
import { AppLink, useAppNavigate, useQueryParam } from '@/routing/navigation';
import { roleHome } from '@/routing/roleHome';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useViewerState } from '@/state/viewer';
import { AuthLayout } from './AuthLayout';

/** AUTH-01 — only the credential method the backend supports; no invented OAuth/OTP. */
export default function LoginPage() {
  const c = authCopy.login;
  const { auth, mode, demo } = useServices();
  const viewer = useViewerState();
  const nav = useAppNavigate();
  const [reason] = useQueryParam('alasan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const action = useAction(auth.login);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await action.run({ email, password });
    if (r?.ok) {
      // The session changed server-side; refresh the shared viewer before entering guarded pages.
      viewer.reload();
      nav(roleHome(r.data.roles));
    } else if (r) {
      emailRef.current?.focus();
    }
  };
  const fe = action.error?.fieldErrors;

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">{c.title}</h1>
      <p className="mt-1 text-ink-muted">{c.lead}</p>
      {reason === 'sesi-berakhir' && <Callout tone="info" className="mt-5" role="status">{c.expired}</Callout>}
      {reason === 'keluar' && <Callout tone="success" className="mt-5" role="status">{c.signedOut}</Callout>}
      {action.error && !fe && <ActionErrorCallout code={action.error.code} {...(action.error.message ? { message: action.error.message } : {})} className="mt-5" />}
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label={c.email} required error={fe?.email}>
          {(p) => <Input ref={emailRef} {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={c.password} required error={fe?.password}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Button type="submit" size="lg" block busy={action.busy}>{c.submit}</Button>
      </form>
      {mode === 'mock' && demo && (
        <div className="mt-5 rounded-card border border-dashed border-accent-amber/60 bg-accent-amber-soft/40 p-3" data-demo-logins>
          <p className="text-xs font-semibold text-accent-amber-text">{c.demoTitle}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{c.devHint}</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {demo.logins.map((d) => (
              <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword('demo-zawjan'); action.clearError(); }}
                className="min-h-[40px] rounded-control border border-line bg-surface-white px-3 text-left text-xs hover:border-brand-primary">
                <span className="block font-semibold">{d.label}</span><span className="block text-ink-subtle">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-6 text-sm text-ink-muted">{c.noAccount} <AppLink to={ROUTES.register} className="font-semibold text-brand-primary hover:underline">{c.register}</AppLink></p>
    </AuthLayout>
  );
}

import type { ReactNode } from 'react';
import { ArrowLeft, Check, Clock, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { common } from '@/content/id/common';
import { describeFact, type StatusLabel } from '@/domain/status';
import type { VerificationFact } from '@/domain/types';
import { cn } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';

export function StatusBadge({ status, className }: { status: StatusLabel; className?: string }) {
  return <Badge tone={status.tone} className={className}>{status.label}</Badge>;
}

/** Narrow, factual verification statements: never a generic "Terverifikasi" seal. */
export function VerificationFacts({ facts, compact, className }: { facts: VerificationFact[]; compact?: boolean; className?: string }) {
  return (
    <div className={className}>
      {!compact && <p className="mb-2 text-sm font-semibold text-ink">{common.facts.title}</p>}
      <ul className="flex flex-wrap gap-1.5" aria-label={common.facts.title}>
        {facts.map((f) => <li key={f.kind}><StatusBadge status={describeFact(f)} /></li>)}
      </ul>
      {!compact && <p className="mt-2 text-xs text-ink-subtle">{common.facts.footnote}</p>}
    </div>
  );
}

export function PrivacyNotice({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <aside className={cn('flex gap-3 rounded-card border border-brand-primary/20 bg-brand-mint p-4 text-sm', className)}>
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" aria-hidden />
      <div><p className="font-semibold text-brand-forest">{title}</p>{children && <div className="mt-1 text-ink-muted">{children}</div>}</div>
    </aside>
  );
}

/** Audience / contents / duration / revocability summary before a sensitive action. */
export function ConsentSummary({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-line rounded-card border border-line bg-surface-canvas text-sm', className)}>
      {items.map((i) => (
        <div key={i.label} className="grid gap-1 p-3 sm:grid-cols-[160px_1fr] sm:gap-3">
          <dt className="font-semibold text-ink">{i.label}</dt>
          <dd className="text-ink-muted">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageHeader({ title, description, actions, backTo, backLabel, eyebrow }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; backTo?: string; backLabel?: string; eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 md:mb-6">
      {backTo && (
        <AppLink to={backTo} className="-ml-2 inline-flex min-h-touch w-fit items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-brand-primary hover:bg-brand-mint">
          <ArrowLeft className="h-4 w-4" aria-hidden />{backLabel ?? common.actions.back}
        </AppLink>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-sm font-semibold text-brand-primary">{eyebrow}</div>}
          <h1 className="text-2xl font-bold leading-tight text-brand-forest">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export type StepState = 'done' | 'submitted' | 'current' | 'todo';

/** Distinguishes "completed" from "submitted / awaiting review" (design.md ONB-01). */
export function ProgressSteps({ steps, label, orientation = 'horizontal' }: {
  steps: { label: string; state: StepState; detail?: string }[]; label: string; orientation?: 'horizontal' | 'vertical';
}) {
  const stateText: Record<StepState, string> = { done: 'selesai', submitted: 'menunggu tinjauan', current: 'langkah saat ini', todo: 'belum dimulai' };
  return (
    <ol aria-label={label} className={cn('flex gap-2', orientation === 'vertical' ? 'flex-col' : 'flex-row')}>
      {steps.map((s, i) => (
        <li key={s.label} aria-current={s.state === 'current' ? 'step' : undefined} className={cn('flex min-w-0 items-start gap-3', orientation === 'horizontal' && 'flex-1 flex-col gap-1.5')}>
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
            s.state === 'done' && 'border-brand-primary bg-brand-primary text-white',
            s.state === 'submitted' && 'border-accent-amber bg-accent-amber-soft text-accent-amber-text',
            s.state === 'current' && 'border-brand-primary bg-surface-white text-brand-primary',
            s.state === 'todo' && 'border-line-strong bg-surface-white text-ink-subtle')}>
            {s.state === 'done' ? <Check className="h-4 w-4" aria-hidden /> : s.state === 'submitted' ? <Clock className="h-4 w-4" aria-hidden /> : i + 1}
          </span>
          <span className="min-w-0">
            <span className={cn('block text-sm font-semibold', s.state === 'todo' ? 'text-ink-muted' : 'text-ink', orientation === 'horizontal' && 'max-md:sr-only')}>{s.label}</span>
            <span className="sr-only">: {stateText[s.state]}</span>
            {s.detail && orientation === 'vertical' && <span className="block text-sm text-ink-muted">{s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: typeof Lock; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface-white px-6 py-10 text-center', className)}>
      {Icon && <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-mint text-brand-primary"><Icon className="h-6 w-6" aria-hidden /></span>}
      <h2 className="text-lg font-semibold text-brand-forest">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Wordmark({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-2xl font-semibold tracking-tight', inverse ? 'text-white' : 'text-brand-forest', className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden><rect width="32" height="32" rx="8" fill="currentColor" className={inverse ? 'text-white/15' : 'text-brand-primary'} /><path d="M10 10h12L10 22h12" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {common.brand.name}
    </span>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold text-brand-forest">{children}</h2>
      {action}
    </div>
  );
}

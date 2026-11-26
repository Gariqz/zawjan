import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Circle, Info, ShieldCheck, XCircle } from 'lucide-react';
import type { Tone } from '@/domain/status';
import { cn } from '@/lib/utils';

const badge = cva('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none', {
  variants: {
    tone: {
      neutral: 'border-line-strong bg-surface-canvas text-ink-muted',
      success: 'border-success/30 bg-success-soft text-success',
      warning: 'border-accent-amber/40 bg-accent-amber-soft text-accent-amber-text',
      danger: 'border-danger/30 bg-danger-soft text-danger',
      info: 'border-info/30 bg-info-soft text-info',
      brand: 'border-brand-primary/30 bg-brand-mint text-brand-forest',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

/** Every tone carries an icon so status is never conveyed by colour alone. */
const toneIcon: Record<Tone, typeof Info> = {
  neutral: Circle, success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info, brand: ShieldCheck,
};

export function Badge({ tone = 'neutral', children, className, icon = true }: { tone?: Tone; children: ReactNode; className?: string; icon?: boolean }) {
  const Icon = toneIcon[tone];
  return (
    <span className={cn(badge({ tone }), className)}>
      {icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}

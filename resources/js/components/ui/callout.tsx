import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Lock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'privacy';

const styles: Record<CalloutTone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-info/25 bg-info-soft/60 text-ink', icon: Info },
  success: { box: 'border-success/25 bg-success-soft/70 text-ink', icon: CheckCircle2 },
  warning: { box: 'border-accent-amber/40 bg-accent-amber-soft/70 text-ink', icon: AlertTriangle },
  danger: { box: 'border-danger/25 bg-danger-soft/70 text-ink', icon: XCircle },
  privacy: { box: 'border-brand-primary/20 bg-brand-mint text-ink', icon: Lock },
};
const iconColor: Record<CalloutTone, string> = {
  info: 'text-info', success: 'text-success', warning: 'text-accent-amber-text', danger: 'text-danger', privacy: 'text-brand-primary',
};

export function Callout({ tone = 'info', title, children, action, className, role }: {
  tone?: CalloutTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string; role?: 'status' | 'alert';
}) {
  const { box, icon: Icon } = styles[tone];
  return (
    <div className={cn('flex gap-3 rounded-card border p-4', box, className)} role={role}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconColor[tone])} aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-brand-forest">{title}</p>}
        {children && <div className={cn('text-ink-muted', title && 'mt-1')}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

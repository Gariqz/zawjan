import * as RD from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

interface ContentProps {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** 'sheet' renders as a bottom sheet on small screens and a side panel on wide screens. */
  variant?: 'dialog' | 'sheet';
  className?: string;
}

export function DialogContent({ title, description, children, footer, variant = 'dialog', className }: ContentProps) {
  return (
    <RD.Portal>
      <RD.Overlay className="fixed inset-0 z-40 bg-ink/40" />
      <RD.Content
        className={cn(
          'fixed z-50 flex max-h-[92dvh] flex-col bg-surface-white shadow-raised focus:outline-none',
          variant === 'dialog'
            ? 'inset-x-3 bottom-3 rounded-card sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2'
            : 'inset-x-0 bottom-0 rounded-t-card md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <RD.Title className="text-lg font-semibold text-brand-forest">{title}</RD.Title>
            {description ? <RD.Description className="mt-1 text-sm text-ink-muted">{description}</RD.Description> : <RD.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</RD.Description>}
          </div>
          <RD.Close className="-m-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-muted hover:bg-surface-canvas" aria-label="Tutup">
            <X className="h-5 w-5" aria-hidden />
          </RD.Close>
        </div>
        {children && <div className="flex-1 overflow-y-auto p-4">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line p-4 safe-bottom sm:flex-row sm:justify-end">{footer}</div>}
      </RD.Content>
    </RD.Portal>
  );
}

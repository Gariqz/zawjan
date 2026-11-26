import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { common } from '@/content/id/common';

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = common.actions.cancel, tone = 'primary', onConfirm, busy, children, confirmDisabled }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; confirmLabel: string; cancelLabel?: string;
  tone?: 'primary' | 'danger'; onConfirm: () => void; busy?: boolean; children?: ReactNode; confirmDisabled?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent
        title={title}
        description={description}
        footer={(
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{cancelLabel}</Button>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} busy={busy} disabled={confirmDisabled}>{confirmLabel}</Button>
          </>
        )}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}

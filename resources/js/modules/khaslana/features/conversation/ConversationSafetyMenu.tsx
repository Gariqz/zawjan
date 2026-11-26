import { useState } from 'react';
import { Ban, DoorOpen, Flag, PauseCircle, Shield, UserMinus } from 'lucide-react';
import { ActionErrorCallout } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { participantCopy } from '@/content/id/participant';
import type { TaArufSummary } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useAppNavigate } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.chat;

/** Always reachable; never needs counterpart or pendamping permission. */
export function ConversationSafetyMenu({ room, perspective }: { room: TaArufSummary; perspective: 'participant' | 'pendamping' }) {
  const { conversations, safety } = useServices();
  const nav = useAppNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<'exit' | 'block' | null>(null);
  const exit = useAction(conversations.exit);
  const block = useAction(safety.blockUser);
  const pause = useAction(conversations.pause);
  const reportUrl = (andExit: boolean) => `${ROUTES.reportNew}?ruang=${encodeURIComponent(room.id)}&subjek=${encodeURIComponent(room.counterpart.id)}${andExit ? '&akhiri=1' : ''}`;
  const item = 'flex min-h-touch w-full items-center gap-3 rounded-control px-3 text-left text-sm font-semibold hover:bg-surface-canvas';

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Shield className="h-4 w-4" aria-hidden />{c.safety}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={c.safety} description="Tindakan keamanan tidak memerlukan izin pihak lain.">
          <div className="flex flex-col gap-1">
            {room.capabilities.canReport && <button type="button" className={item} onClick={() => nav(reportUrl(false))}><Flag className="h-5 w-5 text-danger" aria-hidden />{c.report}</button>}
            {perspective === 'participant' && room.capabilities.canReport && room.capabilities.canExit && <button type="button" className={item} onClick={() => nav(reportUrl(true))}><Flag className="h-5 w-5 text-danger" aria-hidden />{c.reportExit}</button>}
            {perspective === 'participant' && <button type="button" className={item} onClick={() => { setOpen(false); setConfirm('block'); }}><Ban className="h-5 w-5 text-danger" aria-hidden />{c.block}</button>}
            {perspective === 'participant' && room.capabilities.canExit && <button type="button" className={item} onClick={() => { setOpen(false); setConfirm('exit'); }}><DoorOpen className="h-5 w-5" aria-hidden />{c.exit}</button>}
            {room.capabilities.canPauseConversation && <button type="button" className={item} onClick={() => void pause.run(room.id)}><PauseCircle className="h-5 w-5" aria-hidden />{c.pause}</button>}
            {perspective === 'pendamping' && <button type="button" className={item} onClick={() => nav(ROUTES.guardianSettings)}><UserMinus className="h-5 w-5" aria-hidden />{c.withdraw}</button>}
            {pause.error && <ActionErrorCallout code={pause.error.code} {...(pause.error.message ? { message: pause.error.message } : {})} />}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirm === 'exit'} onOpenChange={(o) => !o && setConfirm(null)} title={c.exitTitle} description={c.exitBody} confirmLabel={c.exitConfirm} tone="danger" busy={exit.busy}
        onConfirm={async () => { const r = await exit.run(room.id); if (r?.ok) { setConfirm(null); toast(c.exited); } }}>
        {exit.error && <ActionErrorCallout code={exit.error.code} />}
      </ConfirmDialog>
      <ConfirmDialog open={confirm === 'block'} onOpenChange={(o) => !o && setConfirm(null)} title={participantCopy.candidate.blockTitle} description={participantCopy.candidate.blockBody} confirmLabel={participantCopy.candidate.blockConfirm} tone="danger" busy={block.busy}
        onConfirm={async () => { const r = await block.run(room.counterpart.id); if (r?.ok) { setConfirm(null); toast(participantCopy.candidate.blocked); nav(ROUTES.requests); } }}>
        {block.error && <ActionErrorCallout code={block.error.code} />}
      </ConfirmDialog>
    </>
  );
}

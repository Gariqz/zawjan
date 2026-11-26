import { ActionErrorCallout } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ConsentSummary } from '@/components/shared';
import { participantCopy } from '@/content/id/participant';
import type { CandidateSummary } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useAppNavigate } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.requestConfirm;

/** Lightweight confirmation before sending a request (design.md PAR-03). */
export function RequestConfirmDialog({ candidate, onClose }: { candidate: Pick<CandidateSummary, 'id' | 'displayName' | 'age' | 'city'> | null; onClose: () => void }) {
  const { introductions } = useServices();
  const toast = useToast();
  const nav = useAppNavigate();
  const action = useAction(introductions.request);
  const confirm = async () => {
    if (!candidate) return;
    const r = await action.run(candidate.id);
    if (r?.ok) { toast(c.sent); onClose(); nav(ROUTES.requests); }
  };
  return (
    <ConfirmDialog open={!!candidate} onOpenChange={(o) => { if (!o) { action.clearError(); onClose(); } }} title={c.title} confirmLabel={c.confirm} onConfirm={confirm} busy={action.busy}>
      {candidate && (
        <div className="flex flex-col gap-3">
          <ConsentSummary items={[
            { label: c.recipient, value: `${candidate.displayName}, ${candidate.age}${candidate.city ? ` · ${candidate.city}` : ''}` },
            { label: c.shared, value: c.sharedValue },
            { label: c.exclusivity, value: c.exclusivityValue },
            { label: c.next, value: c.nextValue },
          ]} />
          {action.error && <ActionErrorCallout code={action.error.code} {...(action.error.message ? { message: action.error.message } : {})} />}
        </div>
      )}
    </ConfirmDialog>
  );
}

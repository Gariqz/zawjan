import { useRef, useState } from 'react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/field';
import { participantCopy } from '@/content/id/participant';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { useServices } from '@/services/registry';
import { useViewer } from '@/state/viewer';

const c = participantCopy.catalog.visibility;

export function DiscoveryVisibility({ published }: { published: boolean }) {
  const { candidates } = useServices();
  const viewer = useViewer();
  const eligible = published && viewer.capabilities.canBrowseCandidates;
  const q = useQuery(candidates.getVisibility, [viewer.id]);
  const action = useAction(candidates.setVisibility);
  const [consent, setConsent] = useState(false);
  const status = useRef<HTMLParagraphElement>(null);

  return (
    <section className="mb-6 rounded-card border border-line bg-surface-white p-4 md:p-5" aria-labelledby="discovery-visibility">
      <h2 id="discovery-visibility" className="text-lg font-semibold text-brand-forest">{c.title}</h2>
      <p className="mt-2 max-w-[65ch] text-sm text-ink-muted">{c.scope}</p>
      <div className="mt-3">
        <QueryView query={q}>
          {({ visible }) => <>
            <p className="text-sm font-semibold" role="status" tabIndex={-1} ref={status}>{visible ? c.visible : c.hidden}</p>
            {visible ? <p className="mt-1 text-sm text-ink-muted">{c.hideNote}</p>
              : !eligible ? <p className="mt-1 text-sm text-ink-muted">{c.ready}</p>
                : <Checkbox className="mt-2" checked={consent} disabled={action.busy} onChange={(e) => setConsent(e.target.checked)} label={c.consent} />}
            {(visible || eligible) && <Button className="mt-2" variant={visible ? 'outline' : 'primary'} busy={action.busy} disabled={!visible && !consent}
              onClick={async () => {
                if (!visible && !consent) return;
                const result = await action.run(visible ? { visible: false } : { visible: true, consent: true });
                if (result?.ok) { setConsent(false); status.current?.focus(); }
              }}>{visible ? c.hide : c.show}</Button>}
            {action.error && <ActionErrorCallout className="mt-3" code={action.error.code} />}
          </>}
        </QueryView>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { ImageOff, Share2 } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { ConsentSummary, EmptyState, PageHeader, PrivacyNotice, SectionTitle, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/field';
import { participantCopy } from '@/content/id/participant';
import { photoGrantStatusLabel } from '@/domain/status';
import type { PhotoGrant, PhotoPrivacyOverview } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { formatDateTime } from '@/lib/utils';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = participantCopy.privacy;

/** PAR-08 — owner-controlled photo access: explicit recipients, pendamping confirmation, revocation. */
export default function PrivacyPage() {
  const { photos } = useServices();
  const q = useQuery(() => photos.getOverview(), []);
  return (
    <ParticipantLayout>
      <PageHeader backTo={ROUTES.account} backLabel="Akun" title={c.title} description={c.lead} />
      <QueryView query={q} skeleton="detail">{(ov) => <Privacy ov={ov} />}</QueryView>
    </ParticipantLayout>
  );
}

function Privacy({ ov }: { ov: PhotoPrivacyOverview }) {
  const { photos } = useServices();
  const toast = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [revoking, setRevoking] = useState<PhotoGrant | null>(null);
  const share = useAction(photos.requestGrant);
  const revoke = useAction(photos.revoke);
  const activeIds = new Set(ov.grants.filter((g) => g.status !== 'revoked').map((g) => g.recipientId));
  const options = ov.eligibleRecipients.filter((r) => !activeIds.has(r.id));
  const chosen = ov.eligibleRecipients.filter((r) => selected.includes(r.id));

  return (
    <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <Card className="h-fit"><CardContent className="has-[img]:flex has-[img]:flex-row-reverse has-[img]:items-center has-[img]:justify-end has-[img]:gap-3 md:has-[img]:block">
        <p className="text-sm font-semibold md:mb-2">{c.preview}</p>
        {ov.hasPhoto && ov.ownerPreviewUrl
          ? <img src={ov.ownerPreviewUrl} alt="Pratinjau foto profil Anda" className="aspect-[4/5] w-20 shrink-0 rounded-card border border-line object-cover md:w-full" />
          : <EmptyState icon={ImageOff} title={c.noPhoto} className="py-6" />}
      </CardContent></Card>
      <div className="flex min-w-0 flex-col gap-4">
        <section aria-labelledby="grants-title">
          <SectionTitle id="grants-title" action={<Button size="sm" disabled={!ov.hasPhoto || options.length === 0} onClick={() => { setSelected([]); share.clearError(); setShareOpen(true); }}><Share2 className="h-4 w-4" aria-hidden />{c.share}</Button>}>{c.grants}</SectionTitle>
          {ov.eligibleRecipients.length === 0 && <Callout tone="info" className="mb-3">{c.noRecipients}</Callout>}
          {ov.grants.length === 0 ? <p className="rounded-card border border-dashed border-line-strong bg-surface-white p-4 text-sm text-ink-muted">{c.noGrants}</p> : (
            <ul className="flex flex-col gap-2">
              {ov.grants.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface-white p-4">
                  <div className="w-full sm:w-auto sm:min-w-32 sm:flex-1">
                    <p className="font-semibold">{g.recipientDisplayName}</p>
                    <p className="text-sm text-ink-muted">{g.recipientRole === 'pendamping' ? 'Pendamping' : 'Peserta'} · {formatDateTime(g.updatedAt)}</p>
                  </div>
                  <StatusBadge status={photoGrantStatusLabel[g.status]} />
                  {g.status !== 'revoked' && <Button size="sm" variant="danger-outline" onClick={() => { revoke.clearError(); setRevoking(g); }}>{c.revokeAction}</Button>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <PrivacyNotice title={c.pendampingStep}>{c.revokeValue}</PrivacyNotice>
      </div>

      <Dialog open={shareOpen} onOpenChange={(o) => !share.busy && setShareOpen(o)}>
        <DialogContent title={c.shareTitle} description={c.shareLead}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShareOpen(false)} disabled={share.busy}>Batal</Button>
              <Button busy={share.busy} disabled={chosen.length === 0} onClick={async () => { const r = await share.run(selected); if (r?.ok) { setShareOpen(false); toast(c.requested); } }}>{c.submit}</Button>
            </>
          )}>
          <fieldset className="mb-4">
            <legend className="mb-1 text-sm font-semibold">{c.recipients}</legend>
            {options.map((r) => (
              <Checkbox key={r.id} label={r.displayName} description={r.role === 'pendamping' ? 'Pendamping pihak calon' : 'Calon'}
                checked={selected.includes(r.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
            ))}
          </fieldset>
          <ConsentSummary items={[
            { label: c.audience, value: chosen.length ? chosen.map((r) => r.displayName).join(', ') : '—' },
            { label: c.contents, value: c.contentsValue },
            { label: c.duration, value: c.durationValue },
            { label: c.revoke, value: c.revokeValue },
          ]} />
          <p className="mt-3 text-sm text-ink-muted">{c.pendampingStep}</p>
          {share.error && <ActionErrorCallout className="mt-3" code={share.error.code} {...(share.error.message ? { message: share.error.message } : {})} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={revoking !== null} onOpenChange={(o) => !o && setRevoking(null)} title={c.revokeTitle} description={revoking?.recipientDisplayName}
        confirmLabel={c.revokeAction} tone="danger" busy={revoke.busy}
        onConfirm={async () => { if (!revoking) return; const r = await revoke.run(revoking.id); if (r?.ok) { setRevoking(null); toast(c.revoked, 'info'); } }}>
        <p className="text-sm text-ink-muted">{c.revokeBody}</p>
        {revoke.error && <ActionErrorCallout className="mt-3" code={revoke.error.code} />}
      </ConfirmDialog>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { UserRoundCheck } from 'lucide-react';
import { ActionErrorCallout } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { onboardingCopy } from '@/content/id/onboarding';
import { identityStatusLabel, type Tone } from '@/domain/status';
import type { PendampingNomination } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { formatDateTime } from '@/lib/utils';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = onboardingCopy.invite;
const tone: Record<PendampingNomination['status'], Tone> = { not_invited: 'neutral', sent: 'info', accepted: 'success', declined: 'warning', expired: 'neutral', invalid: 'neutral' };

export function GuardianCard({ nomination }: { nomination: PendampingNomination }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mint text-brand-primary"><UserRoundCheck className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">{c.statusTitle}</p>
          <p className="font-semibold">{nomination.pendampingDisplayName ?? nomination.inviteeMasked ?? c.status.not_invited}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={{ label: c.status[nomination.status], tone: tone[nomination.status] }} />
            {nomination.pendampingIdentity && nomination.status !== 'not_invited' && (
              <StatusBadge status={{ label: `${c.identity}: ${identityStatusLabel[nomination.pendampingIdentity].label}`, tone: identityStatusLabel[nomination.pendampingIdentity].tone }} />
            )}
          </div>
          {nomination.sentAt && <p className="mt-2 text-xs text-ink-subtle">Dikirim {formatDateTime(nomination.sentAt)}{nomination.expiresAt ? ` · berlaku sampai ${formatDateTime(nomination.expiresAt)}` : ''}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** ONB-04 — nominate an independently verified adult pendamping. */
export function NominationPanel({ nomination }: { nomination: PendampingNomination }) {
  const { profile } = useServices();
  const toast = useToast();
  const [contact, setContact] = useState('');
  const [confirmChange, setConfirmChange] = useState(false);
  const invite = useAction(profile.invitePendamping);
  const cancel = useAction(profile.cancelNomination);
  const canInvite = ['not_invited', 'declined', 'expired', 'invalid'].includes(nomination.status);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = await invite.run(contact);
    if (r?.ok) { setContact(''); toast(c.sent); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Callout tone="privacy" title="Bukan wali nikah otomatis">{c.caveat} {c.acceptNote}</Callout>
      {nomination.status !== 'not_invited' && <GuardianCard nomination={nomination} />}
      {canInvite && (
        <Card><CardContent>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <Field label={c.contact} hint={c.contactHint} required error={invite.error?.fieldErrors?.contact}>
              {(p) => <Input {...p} type="email" value={contact} autoComplete="off" onChange={(e) => setContact(e.target.value)} />}
            </Field>
            {invite.error && !invite.error.fieldErrors && <ActionErrorCallout code={invite.error.code} />}
            <Button type="submit" busy={invite.busy} className="sm:w-fit">{c.send}</Button>
          </form>
        </CardContent></Card>
      )}
      {nomination.status === 'sent' && <Button variant="outline" className="sm:w-fit" busy={cancel.busy} onClick={() => void cancel.run()}>{c.cancelInvite}</Button>}
      {nomination.status === 'accepted' && (
        <>
          <Button variant="outline" className="sm:w-fit" onClick={() => setConfirmChange(true)}>{c.change}</Button>
          <ConfirmDialog open={confirmChange} onOpenChange={setConfirmChange} title={c.changeTitle} description={c.changeBody} confirmLabel={c.changeConfirm} busy={cancel.busy}
            onConfirm={async () => { const r = await cancel.run(); if (r?.ok) setConfirmChange(false); }} />
        </>
      )}
    </div>
  );
}

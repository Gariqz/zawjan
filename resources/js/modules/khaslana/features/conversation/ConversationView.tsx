import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { FlaskConical, Info, Lock, Send, ShieldCheck, Users } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { StatusBadge } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { common } from '@/content/id/common';
import { participantCopy } from '@/content/id/participant';
import { conversationStatusLabel } from '@/domain/status';
import type { ConversationMember, MessageView, TaArufSummary } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { cn, formatDateTime, formatTime } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useViewer } from '@/state/viewer';
import { ConversationSafetyMenu } from './ConversationSafetyMenu';

const c = participantCopy.chat;

/** PAR-06 / GUA-04 — supervised four-member room, shared by participant and pendamping. */
export function ConversationView({ roomId, perspective }: { roomId: string; perspective: 'participant' | 'pendamping' }) {
  const { conversations, codec } = useServices();
  const viewer = useViewer();
  const q = useQuery(async () => {
    const room = await conversations.getRoom(roomId);
    if (!room.ok) return room;
    const env = await conversations.listEncryptedMessages(roomId);
    if (!env.ok) return env;
    const messages = await codec.decodeForViewer(env.data, room.data, viewer.id);
    return { ok: true as const, data: { room: room.data, messages } };
  }, [roomId]);
  return (
    <QueryView query={q} skeleton="chat" backTo={perspective === 'participant' ? ROUTES.requests : ROUTES.guardianHome}>
      {(d) => <Room room={d.room} messages={d.messages} perspective={perspective} />}
    </QueryView>
  );
}

function Room({ room, messages, perspective }: { room: TaArufSummary; messages: MessageView[]; perspective: 'participant' | 'pendamping' }) {
  const { conversations, codec } = useServices();
  const viewer = useViewer();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<MessageView[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSend = room.capabilities.canSendMessage;
  const self = room.members.find((m) => m.accountId === viewer.id);
  const isReplacement = perspective === 'pendamping' && !!self?.authorizedFrom && self.authorizedFrom > room.createdAt;

  const deliver = async (body: string, localId: string) => {
    setPending((p) => p.map((m) => (m.id === localId ? { ...m, deliveryState: 'sending' } : m)));
    try {
      const env = await codec.encodeForRoom(room, viewer.id, body);
      const r = await conversations.sendEncryptedMessage(room.id, env);
      if (r.ok) setPending((p) => p.filter((m) => m.id !== localId));
      else setPending((p) => p.map((m) => (m.id === localId ? { ...m, deliveryState: 'failed' } : m)));
    } catch {
      setPending((p) => p.map((m) => (m.id === localId ? { ...m, deliveryState: 'failed' } : m)));
    }
  };
  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !canSend) return;
    const localId = `local-${Date.now()}`;
    setPending((p) => [...p, { id: localId, roomId: room.id, senderId: viewer.id, senderDisplayName: viewer.displayName, senderRole: perspective, sentAt: new Date().toISOString(), displayBody: body, mayReport: false, deliveryState: 'sending' }]);
    setDraft('');
    await deliver(body, localId);
    inputRef.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };
  const disabledReason = !canSend
    ? (perspective === 'pendamping' && room.conversationStatus === 'active' ? c.disabled.observe : c.disabled[room.conversationStatus])
    : null;
  const all = [...messages, ...pending];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label={`Percakapan dengan ${room.counterpart.displayName}`} className="flex min-h-[65dvh] flex-col rounded-card border border-line bg-surface-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3 md:p-4">
          <div className="min-w-0 flex-1 basis-full sm:basis-0">
            <h2 className="truncate text-lg font-semibold">{perspective === 'participant' ? room.counterpart.displayName : `${room.participantAcceptances[0]?.displayName} & ${room.counterpart.displayName}`}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <StatusBadge status={conversationStatusLabel[room.conversationStatus]} />
              <Badge tone="brand" icon={false}><Users className="h-3.5 w-3.5" aria-hidden />4 anggota</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setDetailsOpen(true)}><Info className="h-4 w-4" aria-hidden />{c.details}</Button>
          <ConversationSafetyMenu room={room} perspective={perspective} />
        </div>

        <div className="flex flex-col gap-2 border-b border-line bg-surface-canvas px-3 py-2 text-xs md:px-4">
          {codec.isReviewedE2EE
            ? <p className="flex items-center gap-1.5 font-semibold text-success"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />{c.e2ee}</p>
            : <p className="flex items-center gap-1.5 font-semibold text-accent-amber-text"><FlaskConical className="h-3.5 w-3.5" aria-hidden />{common.dev.chat}</p>}
          <p className="flex items-center gap-1.5 text-ink-muted"><Lock className="h-3.5 w-3.5" aria-hidden />{c.supervised} {c.access}</p>
          {isReplacement && self?.authorizedFrom && <p className="font-medium text-info">{c.replacementScope(formatDateTime(self.authorizedFrom))}</p>}
        </div>

        <ol role="log" aria-live="polite" aria-label="Pesan" className="flex flex-1 flex-col gap-3 p-3 md:p-4">
          {all.length === 0 && <li className="m-auto max-w-sm py-10 text-center text-sm text-ink-muted">{room.conversationStatus === 'locked' ? c.disabled.locked : c.empty}</li>}
          {all.map((m) => <MessageBubble key={m.id} m={m} mine={m.senderId === viewer.id} onRetry={m.deliveryState === 'failed' ? () => void deliver(m.displayBody, m.id) : undefined} />)}
        </ol>

        <div className="sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-10 rounded-b-card border-t border-line bg-surface-white p-3 md:bottom-0">
          {canSend ? (
            <form onSubmit={send} className="flex items-end gap-2">
              <label htmlFor="composer" className="sr-only">{c.composerLabel}</label>
              <textarea id="composer" ref={inputRef} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} maxLength={2000}
                placeholder={c.composerPlaceholder} className="max-h-40 min-h-touch flex-1 resize-none rounded-control border border-line-strong px-3 py-2.5 text-base focus-visible:border-brand-primary" />
              <Button type="submit" size="icon" aria-label={c.send} disabled={!draft.trim()}><Send className="h-5 w-5" aria-hidden /></Button>
            </form>
          ) : (
            <div role="status" className="flex items-start gap-2 rounded-control bg-surface-canvas p-3 text-sm text-ink-muted">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p>{disabledReason}</p>
                {draft && <p className="mt-1 text-xs">{c.draftKept}</p>}
                {room.conversationStatus === 'locked' && perspective === 'participant' && <AppLink to={ROUTES.approvals(room.id)} className="mt-1 inline-block font-semibold text-brand-primary underline">Lihat persetujuan</AppLink>}
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="hidden lg:block"><RoomDetails room={room} perspective={perspective} /></aside>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent variant="sheet" title={c.details}><RoomDetails room={room} perspective={perspective} /></DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({ m, mine, onRetry }: { m: MessageView; mine: boolean; onRetry?: (() => void) | undefined }) {
  return (
    <li className={cn('flex max-w-[85%] flex-col gap-1', mine ? 'self-end items-end' : 'self-start')}>
      <p className="text-xs text-ink-subtle">
        <span className="font-semibold text-ink-muted">{mine ? 'Anda' : m.senderDisplayName}</span>
        {' · '}{m.senderRole === 'pendamping' ? c.rolePendamping : c.roleParticipant}{' · '}<time dateTime={m.sentAt}>{formatTime(m.sentAt)}</time>
      </p>
      <div className={cn('whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
        mine ? 'rounded-br-md bg-brand-primary text-white' : m.senderRole === 'pendamping' ? 'rounded-bl-md border border-accent-amber/40 bg-accent-amber-soft/50' : 'rounded-bl-md bg-surface-canvas')}>
        {m.displayBody}
      </div>
      {m.deliveryState === 'sending' && <p className="text-xs text-ink-subtle">{c.sending}</p>}
      {m.deliveryState === 'failed' && (
        <p className="flex items-center gap-2 text-xs font-medium text-danger">{c.failed}
          {onRetry && <button type="button" onClick={onRetry} className="min-h-touch rounded px-2 font-semibold underline">{c.retry}</button>}
        </p>
      )}
    </li>
  );
}

export function ConversationMembers({ members, viewerId }: { members: ConversationMember[]; viewerId: string }) {
  const sides: ('A' | 'B')[] = ['A', 'B'];
  return (
    <div className="flex flex-col gap-4">
      {sides.map((side) => (
        <div key={side}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{side === 'A' ? `Pihak ${members.find((m) => m.side === 'A' && m.role === 'participant')?.displayName ?? 'A'}` : `Pihak ${members.find((m) => m.side === 'B' && m.role === 'participant')?.displayName ?? 'B'}`}</p>
          <ul className="flex flex-col gap-2">
            {members.filter((m) => m.side === side).map((m) => (
              <li key={`${m.side}-${m.role}`} className="flex items-center gap-3 rounded-control border border-line p-2.5">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold', m.role === 'pendamping' ? 'bg-accent-amber-soft text-accent-amber-text' : 'bg-brand-mint text-brand-forest')} aria-hidden>{m.displayName.replace(/^(Ibu|Bapak)\s+/, '').charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.displayName} {m.accountId === viewerId && <span className="font-normal text-ink-subtle">{c.you}</span>}</p>
                  <p className="text-xs text-ink-muted">{m.role === 'pendamping' ? c.rolePendamping : c.roleParticipant}</p>
                </div>
                <Badge tone={m.membership === 'approved' ? 'success' : m.membership === 'withdrawn' ? 'neutral' : 'warning'}>{c.membership[m.membership]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RoomDetails({ room, perspective }: { room: TaArufSummary; perspective: 'participant' | 'pendamping' }) {
  const viewer = useViewer();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-line bg-surface-white p-4">
        <h3 className="mb-3 font-semibold">{c.members}</h3>
        <ConversationMembers members={room.members} viewerId={viewer.id} />
        <p className="mt-3 text-xs text-ink-subtle">Status keanggotaan bukan indikator sedang daring atau sedang membaca.</p>
      </div>
      {perspective === 'participant' && (
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-white p-4 text-sm">
          <AppLink to={ROUTES.approvals(room.id)} className="font-semibold text-brand-primary hover:underline">Tahapan & persetujuan</AppLink>
          <AppLink to={ROUTES.privacy} className="font-semibold text-brand-primary hover:underline">{c.photo}</AppLink>
        </div>
      )}
      {room.conversationStatus === 'active' && perspective === 'participant' && (
        <div className="rounded-card border border-line bg-surface-white p-4">
          <h3 className="text-sm font-semibold">{c.prompts}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">{c.promptList.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

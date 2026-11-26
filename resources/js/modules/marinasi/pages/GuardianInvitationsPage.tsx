import { Mail } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader, StatusBadge } from '@/components/shared';
import { pendampingCopy } from '@/content/id/pendamping';
import type { GuardianInvitationView } from '@/domain/types';
import type { Tone } from '@/domain/status';
import { useQuery } from '@/hooks/useQuery';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { formatDateTime } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

const c = pendampingCopy.invitations;
export const invitationTone: Record<GuardianInvitationView['status'], Tone> = { pending: 'warning', accepted: 'success', declined: 'neutral', expired: 'neutral', already_assigned: 'neutral', invalid: 'neutral' };

/** GUA-02 list — all invitations addressed to this pendamping. */
export default function GuardianInvitationsPage() {
  const { pendamping } = useServices();
  const q = useQuery(() => pendamping.getHome(), []);
  return (
    <PendampingLayout>
      <PageHeader title={c.title} description={c.lead} />
      <QueryView query={q}>
        {(h) => h.invitations.length === 0 ? <EmptyState icon={Mail} title={c.empty} /> : (
          <ul className="flex flex-col gap-2">
            {h.invitations.map((i) => (
              <li key={i.id}>
                <AppLink to={ROUTES.guardianInvitation(i.id)} className="flex min-h-touch flex-wrap items-center gap-3 rounded-card border border-line bg-surface-white p-4 hover:border-brand-primary">
                  <Mail className="h-5 w-5 text-brand-primary" aria-hidden />
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{i.inviterDisplayName}</span><span className="block text-sm text-ink-muted">Dikirim {formatDateTime(i.sentAt)}</span></span>
                  <StatusBadge status={{ label: c.status[i.status], tone: invitationTone[i.status] }} />
                </AppLink>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </PendampingLayout>
  );
}

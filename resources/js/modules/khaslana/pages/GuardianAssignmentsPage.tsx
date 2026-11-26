import { Users } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader, SectionTitle, StatusBadge } from '@/components/shared';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { pendampingCopy } from '@/content/id/pendamping';
import { closeReasonLabel, conversationStatusLabel } from '@/domain/status';
import { useQuery } from '@/hooks/useQuery';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { formatDate, formatDateTime } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

const c = pendampingCopy.assignments;

/** GUA-04 list — supervised participants, their rooms, and closed processes. */
export default function GuardianAssignmentsPage() {
  const { pendamping } = useServices();
  const q = useQuery(() => pendamping.getHome(), []);
  return (
    <PendampingLayout>
      <PageHeader title={c.title} description={c.lead} />
      <QueryView query={q}>
        {(h) => (
          <div className="flex flex-col gap-6">
            {h.assignments.length === 0 ? <EmptyState icon={Users} title={c.empty} /> : (
              <ul className="flex flex-col gap-3">
                {h.assignments.map((a) => (
                  <li key={a.assignmentId}>
                    <Card><CardContent className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold text-brand-forest">{a.participantDisplayName}</p>
                        <p className="text-sm text-ink-muted">{a.status === 'withdrawn' ? c.withdrawn : `${c.since} ${formatDate(a.authorizedFrom)}`}</p>
                        {a.roomStatus && <div className="mt-2"><StatusBadge status={conversationStatusLabel[a.roomStatus]} /></div>}
                      </div>
                      {a.status === 'active' && a.activeTaArufId && a.roomStatus && a.roomStatus !== 'locked' && (
                        <AppLink to={ROUTES.guardianRoom(a.activeTaArufId)} className={buttonVariants({ size: 'sm' })}>{c.openRoom}</AppLink>
                      )}
                    </CardContent></Card>
                  </li>
                ))}
              </ul>
            )}
            {h.history.length > 0 && (
              <section aria-labelledby="hist-title">
                <SectionTitle id="hist-title">{pendampingCopy.home.history}</SectionTitle>
                <ul className="flex flex-col gap-2">
                  {h.history.map((t) => (
                    <li key={t.id} className="rounded-card border border-line bg-surface-white p-4 text-sm">
                      <p className="font-semibold">{t.participantAcceptances[0]?.displayName} &amp; {t.counterpart.displayName}</p>
                      <p className="text-ink-muted">{t.closedReason ? closeReasonLabel[t.closedReason] : ''}{t.closedAt ? ` · ${formatDateTime(t.closedAt)}` : ''}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </QueryView>
    </PendampingLayout>
  );
}

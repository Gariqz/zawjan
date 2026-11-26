import { History } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader } from '@/components/shared';
import { buttonVariants } from '@/components/ui/button';
import { participantCopy } from '@/content/id/participant';
import { isClosed } from '@/domain/taaruf';
import { RequestCard } from '@/modules/khaslana/features/introductions/RequestCard';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { cn } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

const c = participantCopy.history;

/** PAR-11 — read-only history; reporting stays available after a process ends. */
export default function HistoryPage() {
  const { introductions } = useServices();
  const q = useQuery(() => introductions.listRequests(), []);
  return (
    <ParticipantLayout>
      <PageHeader backTo={ROUTES.account} backLabel="Akun" title={c.title} description={c.lead} />
      <QueryView query={q}>
        {(list) => {
          const items = list.filter(isClosed);
          if (!items.length) return <EmptyState icon={History} title={c.empty} />;
          return (
            <>
              <ul className="flex flex-col gap-3">
                {items.map((t) => (
                  <li key={t.id}>
                    <RequestCard summary={t} actions={(t.requestStatus === 'active' || t.capabilities.canReport) ? (
                      <>
                        {t.requestStatus === 'active' && <AppLink to={ROUTES.chat(t.id)} className={buttonVariants({ size: 'sm', variant: 'outline' })}>{c.readChat}</AppLink>}
                        {t.capabilities.canReport && <AppLink to={`${ROUTES.reportNew}?ruang=${encodeURIComponent(t.id)}&subjek=${encodeURIComponent(t.counterpart.id)}`} className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'text-danger')}>{c.report}</AppLink>}
                      </>
                    ) : undefined} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink-subtle">{c.retention}</p>
            </>
          );
        }}
      </QueryView>
    </ParticipantLayout>
  );
}

import { ChevronRight, ClipboardCheck, Flag, History, ShieldAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { ErrorState, LoadingSkeleton } from '@/components/feedback';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import { staffCopy } from '@/content/id/staff';
import { identityStatusLabel, reportCaseStatusLabel, type StatusLabel } from '@/domain/status';
import type { StaffOverview } from '@/domain/types';
import { useQuery, type QueryState } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { formatDateTime } from '@/lib/utils';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { priorityLabel } from './ReportsQueuePage';
import { caseStateLabel } from './VerificationQueuePage';

const c = staffCopy.overview;
const workbench = staffCopy.moderatorWorkbench;
const highPriority = `${ROUTES.modReports}?prioritas=high`;

export function OverviewMetrics({ o, links }: { o: StaffOverview; links: boolean }) {
  const items = [
    { label: c.pendingVerification, value: o.pendingVerification, icon: ClipboardCheck, tone: 'bg-brand-mint text-brand-primary', to: ROUTES.modVerification },
    { label: c.pendingReports, value: o.pendingReports, icon: Flag, tone: 'bg-info-soft text-info', to: ROUTES.modReports },
    { label: c.highPriority, value: o.highPriorityReports, icon: ShieldAlert, tone: 'bg-danger-soft text-danger', to: `${ROUTES.modReports}?prioritas=high` },
    { label: c.handled, value: o.handledToday, icon: History, tone: 'bg-surface-canvas text-ink-muted', to: ROUTES.modActions },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {items.map((i) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-control ${i.tone}`}>
                <i.icon className="h-5 w-5" aria-hidden />
              </span>
              {links && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-ink-muted" aria-hidden />}
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-brand-forest">{i.value}</p>
            <p className="mt-0.5 text-sm font-medium text-ink-muted">{i.label}</p>
          </>
        );
        return (
          <li key={i.label}>
            {links
              ? <AppLink to={i.to} className="block h-full rounded-card border border-line bg-surface-white p-4 hover:border-brand-primary sm:p-5">{body}</AppLink>
              : <Card><CardContent>{body}</CardContent></Card>}
          </li>
        );
      })}
    </ul>
  );
}

function WorkbenchSection({ title, icon: Icon, to, link, children, queue = false }: {
  title: string; icon: typeof Flag; to: string; link: string; children: ReactNode; queue?: boolean;
}) {
  const id = useId();
  const Heading = queue ? 'h3' : 'h2';
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-card border border-line bg-surface-white">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-4 py-2 sm:px-5">
        <Heading id={id} className="flex min-w-0 items-center gap-2 py-1 text-base font-bold text-brand-forest">
          <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />{title}
        </Heading>
        <AppLink to={to} className="inline-flex min-h-touch items-center gap-1 rounded-control text-sm font-semibold text-brand-primary underline-offset-4 hover:underline">
          {link}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </AppLink>
      </header>
      <div className="border-t border-line">{children}</div>
    </section>
  );
}

function WorkbenchQuery<T>({ query, label, children }: {
  query: QueryState<T> & { reload: () => void }; label: string; children: (data: T) => ReactNode;
}) {
  if (query.status === 'success') return <>{children(query.data)}</>;
  return (
    <div className="p-4 sm:px-5">
      {query.status === 'loading'
        ? <LoadingSkeleton variant="table" label={label} />
        : <ErrorState code={query.error.code} onRetry={query.reload} className="border-0 bg-transparent px-0 py-2" />}
    </div>
  );
}

function CaseRow({ to, reference, context, status, at }: {
  to: string; reference: string; context: string; status: StatusLabel; at: string;
}) {
  const id = useId();
  return (
    <li>
      <AppLink to={to} aria-labelledby={`${id}-ref`} aria-describedby={`${id}-status ${id}-context`}
        className="group flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-surface-canvas focus-visible:outline focus-visible:-outline-offset-2 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span id={`${id}-ref`} className="break-words font-semibold text-brand-primary underline-offset-4 group-hover:underline group-focus-visible:underline">{reference}</span>
            <span id={`${id}-status`}><StatusBadge status={status} /></span>
          </div>
          <div id={`${id}-context`} className="mt-1 text-sm text-ink-muted">
            <p className="break-words text-ink">{context}</p>
            <time className="mt-0.5 block tabular-nums" dateTime={at}>{formatDateTime(at)}</time>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      </AppLink>
    </li>
  );
}

const empty = 'px-4 py-5 text-sm text-ink-muted sm:px-5';
// ponytail: match known case references until the audit API supplies a typed case reference.
const caseReference = /^(?:LAP|VER)-\d+(?:-\d+)+$/;

function WorkbenchCounts({ o }: { o: StaffOverview }) {
  const counts = [
    [c.highPriority, o.highPriorityReports],
    [c.pendingReports, o.pendingReports],
    [c.pendingVerification, o.pendingVerification],
    [c.handled, o.handledToday],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-4 md:divide-x md:divide-line">
      {counts.map(([label, value]) => (
        <div key={label} className="flex min-w-0 items-baseline gap-x-2 md:pl-3 md:first:pl-0">
          <dt className="text-sm leading-snug text-ink-muted">{label}</dt>
          <dd className="order-first text-lg font-bold leading-none tabular-nums text-brand-forest">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ModeratorDashboard() {
  const { moderator } = useServices();
  const overview = useQuery(() => moderator.getOverview(), []);
  const reports = useQuery(() => moderator.listReports({ status: 'open', priority: 'high' }), []);
  const verification = useQuery(() => moderator.listVerificationCases({ status: 'pending' }), []);
  const actions = useQuery(() => moderator.listMyActions(), []);
  const header = <PageHeader title={<span className="font-display text-3xl">{c.modTitle}</span>} description={c.lead} />;
  if (overview.status === 'error' && overview.error.code === 'FORBIDDEN') {
    return <>{header}<ErrorState code="FORBIDDEN" /></>;
  }
  return (
    <>
      {header}
      <div className="space-y-6">
        <div role="group" aria-labelledby="moderator-pending-title"
          className="motion-safe:[transition:opacity_160ms_ease-out,translate_160ms_ease-out] motion-safe:[@starting-style]:opacity-75 motion-safe:[@starting-style]:[translate:0_4px]">
          <h2 id="moderator-pending-title" className="mb-3 text-xl font-bold text-brand-forest">{workbench.title}</h2>
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <WorkbenchSection title={workbench.priority} icon={Flag} to={highPriority} link={workbench.reportsLink} queue>
              <WorkbenchQuery query={reports} label={workbench.priority}>{({ items }) => items.length === 0
                ? <p className={empty}>{workbench.noPriorityReports}</p>
                : <ul className="divide-y divide-line">{items.slice(0, 3).map((item) => (
                  <CaseRow key={item.id} to={ROUTES.modReport(item.id)} reference={item.ref}
                    context={`${participantCopy.report.categories[item.category]} · ${reportCaseStatusLabel[item.status].label}`}
                    status={priorityLabel[item.priority]} at={item.receivedAt} />
                ))}</ul>}
              </WorkbenchQuery>
            </WorkbenchSection>
            <WorkbenchSection title={workbench.verification} icon={ClipboardCheck} to={ROUTES.modVerification} link={workbench.verificationLink} queue>
              <WorkbenchQuery query={verification} label={workbench.verification}>{({ items }) => items.length === 0
                ? <p className={empty}>{workbench.noVerification}</p>
                : <ul className="divide-y divide-line">{items.slice(0, 3).map((item) => (
                  <CaseRow key={item.id} to={ROUTES.modVerificationCase(item.id)} reference={item.caseRef}
                    context={`${identityStatusLabel[item.stage].label} · ${item.assignee ? workbench.assigned : staffCopy.verification.unassigned}`}
                    status={caseStateLabel[item.state]} at={item.submittedAt} />
                ))}</ul>}
              </WorkbenchQuery>
            </WorkbenchSection>
          </div>
        </div>
        <div className="border-y border-line" role="group" aria-label={workbench.counts}>
          <WorkbenchQuery query={overview} label={workbench.counts}>{(o) => <WorkbenchCounts o={o} />}</WorkbenchQuery>
        </div>
        <WorkbenchSection title={workbench.activity} icon={History} to={ROUTES.modActions} link={workbench.activityLink}>
          <WorkbenchQuery query={actions} label={workbench.activity}>{({ items }) => items.length === 0
            ? <p className={empty}>{workbench.noActivity}</p>
            : <ol className="divide-y divide-line">{[...items].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 3).map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm sm:px-5">
                <p className="min-w-0 break-words">
                  <strong className="font-semibold text-ink">{item.action}</strong>
                  {caseReference.test(item.entity) && <span className="text-ink-muted"> · {item.entity}</span>}
                </p>
                <time className="tabular-nums text-ink-muted" dateTime={item.at}>{formatDateTime(item.at)}</time>
              </li>
            ))}</ol>}
          </WorkbenchQuery>
        </WorkbenchSection>
      </div>
    </>
  );
}

/** MOD-01 — moderator workbench, backed by Zawjan's existing queues and history. */
export default function ModeratorOverviewPage() {
  return <StaffLayout role="moderator"><ModeratorDashboard /></StaffLayout>;
}

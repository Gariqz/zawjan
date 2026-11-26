import { Flag } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader, StatusBadge } from '@/components/shared';
import { Select } from '@/components/ui/field';
import { Pager, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { participantCopy } from '@/content/id/participant';
import { staffCopy } from '@/content/id/staff';
import { reportCaseStatusLabel, type StatusLabel } from '@/domain/status';
import type { ReportCaseSummary } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { formatDateTime } from '@/lib/utils';
import { AppLink, useQueryParams } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

const c = staffCopy.reports;
export const priorityLabel: Record<ReportCaseSummary['priority'], StatusLabel> = {
  high: { label: c.priority.high, tone: 'danger' }, normal: { label: c.priority.normal, tone: 'info' }, low: { label: c.priority.low, tone: 'neutral' },
};

/** MOD-04 — report queue. */
export default function ReportsQueuePage() {
  const { moderator } = useServices();
  const [params, setParams] = useQueryParams();
  const status = params.status ?? 'open';
  const priority = params.prioritas ?? 'all';
  const page = Number(params.hal ?? '1') || 1;
  const q = useQuery(() => moderator.listReports({ status, priority, page }), [status, priority, page]);
  return (
    <StaffLayout role="moderator">
      <PageHeader title={c.title} description={c.lead}
        actions={(
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">Status
              <Select className="w-44" value={status} onChange={(e) => setParams({ status: e.target.value, prioritas: priority })}>
                {Object.entries(c.status).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">Prioritas
              <Select className="w-44" value={priority} onChange={(e) => setParams({ status, prioritas: e.target.value })}>
                {Object.entries(c.priority).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </label>
          </div>
        )} />
      <QueryView query={q} skeleton="table">
        {(p) => p.items.length === 0 ? <EmptyState icon={Flag} title={c.empty} /> : (
          <>
            <Table caption={c.title}>
              <THead><tr><Th>{c.cols.ref}</Th><Th>{c.cols.category}</Th><Th>{c.cols.reporter}</Th><Th>{c.cols.received}</Th><Th>{c.cols.priority}</Th><Th>{c.cols.assignee}</Th><Th>{c.cols.status}</Th></tr></THead>
              <TBody>
                {p.items.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-canvas">
                    <Td><AppLink to={ROUTES.modReport(r.id)} className="font-semibold text-brand-primary hover:underline">{r.ref}</AppLink></Td>
                    <Td>{participantCopy.report.categories[r.category]}</Td>
                    <Td>{r.reporterDisplay}</Td>
                    <Td>{formatDateTime(r.receivedAt)}</Td>
                    <Td><StatusBadge status={priorityLabel[r.priority]} /></Td>
                    <Td>{r.assignee ?? <span className="text-ink-subtle">{staffCopy.verification.unassigned}</span>}</Td>
                    <Td><StatusBadge status={reportCaseStatusLabel[r.status]} /></Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pager page={p.page} pageSize={p.pageSize} total={p.total} onPage={(n) => setParams({ status, prioritas: priority, hal: String(n) })} />
          </>
        )}
      </QueryView>
    </StaffLayout>
  );
}

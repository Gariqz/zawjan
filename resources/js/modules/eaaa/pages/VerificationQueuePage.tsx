import { ClipboardCheck } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader, StatusBadge } from '@/components/shared';
import { Select } from '@/components/ui/field';
import { Pager, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { staffCopy } from '@/content/id/staff';
import { identityStatusLabel, type StatusLabel } from '@/domain/status';
import type { CaseState } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { formatDateTime } from '@/lib/utils';
import { AppLink, useQueryParams } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

const c = staffCopy.verification;
export const caseStateLabel: Record<CaseState, StatusLabel> = {
  pending: { label: c.filters.pending, tone: 'warning' },
  approved: { label: c.filters.approved, tone: 'success' },
  rejected: { label: c.filters.rejected, tone: 'danger' },
  resubmission_requested: { label: c.filters.resubmission_requested, tone: 'info' },
};

/** MOD-02 — manual verification queue (filters in URL). */
export default function VerificationQueuePage() {
  const { moderator } = useServices();
  const [params, setParams] = useQueryParams();
  const status = params.status ?? 'pending';
  const page = Number(params.hal ?? '1') || 1;
  const q = useQuery(() => moderator.listVerificationCases({ status, page }), [status, page]);
  return (
    <StaffLayout role="moderator">
      <PageHeader title={c.title} description={c.lead}
        actions={(
          <label className="flex items-center gap-2 text-sm font-semibold">Status
            <Select className="w-48" value={status} onChange={(e) => setParams({ status: e.target.value })}>
              {Object.entries(c.filters).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </label>
        )} />
      <QueryView query={q} skeleton="table">
        {(p) => p.items.length === 0 ? <EmptyState icon={ClipboardCheck} title={c.empty} /> : (
          <>
            <Table caption={c.title}>
              <THead><tr><Th>{c.cols.ref}</Th><Th>{c.cols.submitted}</Th><Th>{c.cols.stage}</Th><Th>{c.cols.age}</Th><Th>{c.cols.assignee}</Th><Th>{c.cols.state}</Th></tr></THead>
              <TBody>
                {p.items.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-canvas">
                    <Td><AppLink to={ROUTES.modVerificationCase(v.id)} className="font-semibold text-brand-primary hover:underline">{v.caseRef}</AppLink></Td>
                    <Td>{formatDateTime(v.submittedAt)}</Td>
                    <Td>{identityStatusLabel[v.stage].label}</Td>
                    <Td>{c.age[v.ageEligibility]}</Td>
                    <Td>{v.assignee ?? <span className="text-ink-subtle">{c.unassigned}</span>}</Td>
                    <Td><StatusBadge status={caseStateLabel[v.state]} /></Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pager page={p.page} pageSize={p.pageSize} total={p.total} onPage={(n) => setParams({ status, hal: String(n) })} />
          </>
        )}
      </QueryView>
    </StaffLayout>
  );
}

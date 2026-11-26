import { History } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader } from '@/components/shared';
import { Pager, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { staffCopy } from '@/content/id/staff';
import type { AuditEntry, Page } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { formatDateTime } from '@/lib/utils';
import { useQueryParams } from '@/routing/navigation';
import { useServices } from '@/services/registry';

const a = staffCopy.audit;

export function AuditTable({ p, caption, onPage, empty }: { p: Page<AuditEntry>; caption: string; onPage: (n: number) => void; empty: string }) {
  if (p.items.length === 0) return <EmptyState icon={History} title={empty} />;
  return (
    <>
      <Table caption={caption}>
        <THead><tr><Th>{a.cols.at}</Th><Th>{a.cols.actor}</Th><Th>{a.cols.action}</Th><Th>{a.cols.entity}</Th><Th>{a.cols.reason}</Th></tr></THead>
        <TBody>
          {p.items.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{formatDateTime(e.at)}</Td><Td>{e.actor}</Td><Td className="font-semibold">{e.action}</Td><Td className="font-mono text-xs">{e.entity}</Td><Td className="text-ink-muted">{e.reason ?? '—'}</Td>
            </tr>
          ))}
        </TBody>
      </Table>
      <Pager page={p.page} pageSize={p.pageSize} total={p.total} onPage={onPage} />
    </>
  );
}

/** MOD-06 — the signed-in moderator's own actions only. */
export default function ModActionsPage() {
  const { moderator } = useServices();
  const [params, setParams] = useQueryParams();
  const page = Number(params.hal ?? '1') || 1;
  const q = useQuery(() => moderator.listMyActions(page), [page]);
  return (
    <StaffLayout role="moderator">
      <PageHeader title={staffCopy.myActions.title} description={staffCopy.myActions.lead} />
      <QueryView query={q} skeleton="table">{(p) => <AuditTable p={p} caption={staffCopy.myActions.title} empty={staffCopy.myActions.empty} onPage={(n) => setParams({ hal: String(n) })} />}</QueryView>
    </StaffLayout>
  );
}

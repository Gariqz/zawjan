import { QueryView } from '@/components/feedback';
import { PageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { staffCopy } from '@/content/id/staff';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { useServices } from '@/services/registry';

const c = staffCopy.access;

/** ADM-03 — read-only role & capability matrix (editing awaits a reviewed process). */
export default function AdminAccessPage() {
  const { admin } = useServices();
  const q = useQuery(() => admin.listRoleAssignments(), []);
  return (
    <StaffLayout role="admin">
      <PageHeader title={c.title} description={c.lead} />
      <QueryView query={q} skeleton="table">
        {(d) => (
          <div className="flex flex-col gap-4">
            {!d.editable && <Callout tone="info">{c.readOnly}</Callout>}
            <Table caption={c.title}>
              <THead><tr><Th>{c.cols.name}</Th><Th>{c.cols.roles}</Th><Th>{c.cols.caps}</Th></tr></THead>
              <TBody>
                {d.items.map((r) => (
                  <tr key={r.userId}>
                    <Td className="font-semibold">{r.displayName}</Td>
                    <Td>{r.roles.map((x) => staffCopy.roles[x]).join(', ')}</Td>
                    <Td><div className="flex flex-wrap gap-1">{r.capabilities.map((cap) => <Badge key={cap} icon={false} className="font-mono">{cap}</Badge>)}</div></Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </QueryView>
    </StaffLayout>
  );
}

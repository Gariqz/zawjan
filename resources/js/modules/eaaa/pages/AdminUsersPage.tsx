import { useState, type FormEvent } from 'react';
import { Search, Users } from 'lucide-react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { EmptyState, PageHeader, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Pager, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { staffCopy } from '@/content/id/staff';
import { identityStatusLabel, type StatusLabel } from '@/domain/status';
import type { AdminUser, AdminUserAction } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { formatDate } from '@/lib/utils';
import { useQueryParams } from '@/routing/navigation';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = staffCopy.users;
const stateLabel: Record<AdminUser['accountState'], StatusLabel> = {
  active: { label: c.state.active, tone: 'success' }, suspended: { label: c.state.suspended, tone: 'warning' }, banned: { label: c.state.banned, tone: 'danger' },
};

/** ADM-02 — account search and state changes with mandatory reasons. */
export default function AdminUsersPage() {
  const { admin } = useServices();
  const toast = useToast();
  const [params, setParams] = useQueryParams();
  const query = params.q ?? '';
  const page = Number(params.hal ?? '1') || 1;
  const [draft, setDraft] = useState(query);
  const [target, setTarget] = useState<{ user: AdminUser; kind: AdminUserAction['kind'] } | null>(null);
  const [reason, setReason] = useState('');
  const act = useAction(admin.actOnUser);
  const q = useQuery(() => admin.listUsers(query, page), [query, page]);
  const search = (e: FormEvent) => { e.preventDefault(); setParams({ q: draft }); };
  const label = (k: AdminUserAction['kind']) => (k === 'suspend' ? c.suspend : k === 'ban' ? c.ban : c.restore);
  const open = (user: AdminUser, kind: AdminUserAction['kind']) => { setReason(''); act.clearError(); setTarget({ user, kind }); };

  return (
    <StaffLayout role="admin">
      <PageHeader title={c.title} description={c.lead} />
      <form onSubmit={search} role="search" className="mb-4 flex max-w-lg gap-2">
        <label htmlFor="user-q" className="sr-only">{c.search}</label>
        <Input id="user-q" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={c.search} />
        <Button type="submit" variant="outline"><Search className="h-4 w-4" aria-hidden />Cari</Button>
      </form>
      <QueryView query={q} skeleton="table">
        {(p) => p.items.length === 0 ? <EmptyState icon={Users} title={c.empty} /> : (
          <>
            <Table caption={c.title}>
              <THead><tr><Th>{c.cols.name}</Th><Th>{c.cols.roles}</Th><Th>{c.cols.state}</Th><Th>{c.cols.identity}</Th><Th>{c.cols.created}</Th><Th>{c.cols.actions}</Th></tr></THead>
              <TBody>
                {p.items.map((u) => (
                  <tr key={u.id}>
                    <Td className="font-semibold">{u.displayName}</Td>
                    <Td>{u.roles.map((r) => staffCopy.roles[r]).join(', ')}</Td>
                    <Td><StatusBadge status={stateLabel[u.accountState]} /></Td>
                    <Td>{identityStatusLabel[u.identityStatus].label}</Td>
                    <Td>{formatDate(u.createdAt)}</Td>
                    <Td>
                      <div className="flex gap-1">
                        {u.accountState === 'active'
                          ? (<><Button size="sm" variant="ghost" onClick={() => open(u, 'suspend')}>{c.suspend}</Button>
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => open(u, 'ban')}>{c.ban}</Button></>)
                          : <Button size="sm" variant="ghost" onClick={() => open(u, 'restore')}>{c.restore}</Button>}
                      </div>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
            <Pager page={p.page} pageSize={p.pageSize} total={p.total} onPage={(n) => setParams({ q: query, hal: String(n) })} />
          </>
        )}
      </QueryView>
      <ConfirmDialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)} title={target ? `${label(target.kind)}: ${target.user.displayName}` : ''}
        confirmLabel={target ? label(target.kind) : ''} tone={target?.kind === 'restore' ? 'primary' : 'danger'} busy={act.busy}
        onConfirm={async () => { if (!target) return; const r = await act.run(target.user.id, { kind: target.kind, reason }); if (r?.ok) { setTarget(null); toast(c.done); } }}>
        <Field label={c.reason} required error={act.error?.fieldErrors?.reason}>{(fp) => <Textarea {...fp} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}</Field>
        {act.error && !act.error.fieldErrors && <ActionErrorCallout className="mt-3" code={act.error.code} />}
      </ConfirmDialog>
    </StaffLayout>
  );
}

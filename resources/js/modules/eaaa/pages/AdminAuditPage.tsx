import { useState, type FormEvent } from 'react';
import { QueryView } from '@/components/feedback';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { staffCopy } from '@/content/id/staff';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { AuditTable } from '@/modules/eaaa/pages/ModActionsPage';
import { useQueryParams } from '@/routing/navigation';
import { useServices } from '@/services/registry';

const c = staffCopy.audit;

/** ADM-04 — append-only audit log with filters in the URL. */
export default function AdminAuditPage() {
  const { admin } = useServices();
  const [params, setParams] = useQueryParams();
  const actor = params.pelaku ?? '';
  const action = params.tindakan ?? '';
  const page = Number(params.hal ?? '1') || 1;
  const [a, setA] = useState(actor);
  const [t, setT] = useState(action);
  const q = useQuery(() => admin.listAudit({ ...(actor ? { actor } : {}), ...(action ? { action } : {}), page }), [actor, action, page]);
  const submit = (e: FormEvent) => { e.preventDefault(); setParams({ pelaku: a, tindakan: t }); };
  return (
    <StaffLayout role="admin">
      <PageHeader title={c.title} description={c.lead} />
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-3">
        <Field label={c.actor} optionalLabel={false} className="w-56">{(p) => <Input {...p} value={a} onChange={(e) => setA(e.target.value)} />}</Field>
        <Field label={c.action} optionalLabel={false} className="w-56">{(p) => <Input {...p} value={t} onChange={(e) => setT(e.target.value)} />}</Field>
        <Button type="submit" variant="outline">Terapkan</Button>
      </form>
      <QueryView query={q} skeleton="table">{(p) => <AuditTable p={p} caption={c.title} empty={c.empty} onPage={(n) => setParams({ pelaku: actor, tindakan: action, hal: String(n) })} />}</QueryView>
    </StaffLayout>
  );
}

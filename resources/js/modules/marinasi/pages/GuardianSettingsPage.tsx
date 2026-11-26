import { useState } from 'react';
import { ActionErrorCallout, QueryView } from '@/components/feedback';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { LogoutButton } from '@/components/navigation/LogoutButton';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { common } from '@/content/id/common';
import { pendampingCopy } from '@/content/id/pendamping';
import { identityStatusLabel } from '@/domain/status';
import type { GuardianAssignmentSummary } from '@/domain/types';
import { useAction } from '@/hooks/useAction';
import { useQuery } from '@/hooks/useQuery';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';
import { useViewer } from '@/state/viewer';

const c = pendampingCopy.settings;

/** GUA-05 — identity status and withdrawal (pauses any active room). */
export default function GuardianSettingsPage() {
  return <PendampingLayout><SettingsInner /></PendampingLayout>;
}

function SettingsInner() {
  const viewer = useViewer();
  const { pendamping } = useServices();
  const toast = useToast();
  const q = useQuery(() => pendamping.getHome(), []);
  const withdraw = useAction(pendamping.withdraw);
  const [target, setTarget] = useState<GuardianAssignmentSummary | null>(null);
  return (
    <>
      <PageHeader title={c.title} description={`${viewer.displayName} · ${common.nav.roleLabel.pendamping}`} />
      <div className="flex max-w-2xl flex-col gap-4">
        <Card><CardContent className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><CardTitle className="text-base">{c.identity}</CardTitle><div className="mt-2"><StatusBadge status={identityStatusLabel[viewer.identityStatus]} /></div></div>
          {viewer.identityStatus !== 'approved' && <AppLink to={ROUTES.verification} className={buttonVariants({ size: 'sm' })}>{pendampingCopy.home.identityCta}</AppLink>}
        </CardContent></Card>
        <Card><CardContent>
          <CardTitle className="text-base">{c.withdrawTitle}</CardTitle>
          <CardDescription className="mt-1">{c.withdrawBody}</CardDescription>
          <QueryView query={q} skeleton="list">
            {(h) => (
              <ul className="mt-3 flex flex-col gap-2">
                {h.assignments.filter((a) => a.status === 'active').map((a) => (
                  <li key={a.assignmentId} className="flex flex-wrap items-center gap-3 rounded-control border border-line p-3">
                    <span className="flex-1 font-semibold">{a.participantDisplayName}</span>
                    <Button size="sm" variant="danger-outline" onClick={() => { withdraw.clearError(); setTarget(a); }}>{c.withdraw}</Button>
                  </li>
                ))}
                {h.assignments.every((a) => a.status !== 'active') && <li className="text-sm text-ink-muted">{pendampingCopy.assignments.empty}</li>}
              </ul>
            )}
          </QueryView>
        </CardContent></Card>
        <p className="text-sm text-ink-muted">{c.notifications}</p>
        <LogoutButton />
      </div>
      <ConfirmDialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)} title={c.withdrawConfirmTitle} description={target ? c.withdrawConfirmBody(target.participantDisplayName) : undefined}
        confirmLabel={c.withdraw} tone="danger" busy={withdraw.busy}
        onConfirm={async () => { if (!target) return; const r = await withdraw.run(target.assignmentId); if (r?.ok) { setTarget(null); toast(c.withdrawn, 'info'); } }}>
        {withdraw.error && <ActionErrorCallout code={withdraw.error.code} />}
      </ConfirmDialog>
    </>
  );
}

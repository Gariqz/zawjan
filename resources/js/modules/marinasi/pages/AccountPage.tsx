import { ChevronRight, FileText, History, Lock, Shield, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { LogoutButton } from '@/components/navigation/LogoutButton';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card } from '@/components/ui/card';
import { common } from '@/content/id/common';
import { participantCopy } from '@/content/id/participant';
import { identityStatusLabel } from '@/domain/status';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useViewer } from '@/state/viewer';

const c = participantCopy.account;

/** ACC-01 (supplemental, not in design.md §3) — account hub linking CV, privacy, safety and logout. */
export default function AccountPage() {
  return <ParticipantLayout><AccountInner /></ParticipantLayout>;
}

function AccountInner() {
  const viewer = useViewer();
  const items = [
    { to: ROUTES.myCv, icon: FileText, ...c.items.cv },
    { to: ROUTES.invitePendamping, icon: UserRoundCheck, ...c.items.pendamping },
    { to: ROUTES.privacy, icon: Lock, ...c.items.privacy },
    { to: ROUTES.safety, icon: Shield, ...c.items.safety },
    { to: ROUTES.verification, icon: ShieldCheck, ...c.items.verification, badge: identityStatusLabel[viewer.identityStatus] },
    { to: ROUTES.history, icon: History, ...c.items.history },
  ];
  return (
    <>
      <PageHeader title={c.title} description={`${viewer.displayName} · ${common.nav.roleLabel.participant}`} />
      <Card>
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.to}>
              <AppLink to={it.to} className="flex min-h-touch items-center gap-4 p-4 hover:bg-surface-canvas">
                <it.icon className="h-5 w-5 shrink-0 text-brand-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{it.title}</span>
                  <span className="block text-sm text-ink-muted">{it.body}</span>
                  {'badge' in it && it.badge && <StatusBadge status={it.badge} className="mt-1.5 max-w-full whitespace-normal" />}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
              </AppLink>
            </li>
          ))}
        </ul>
      </Card>
      <LogoutButton className="mt-6" />
    </>
  );
}

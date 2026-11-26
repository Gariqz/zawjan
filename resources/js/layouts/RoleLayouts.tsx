import type { ReactNode } from 'react';
import { Compass, HeartHandshake, Home, Mail, UserRound, Users } from 'lucide-react';
import { RequireRole } from '@/components/navigation/RequireRole';
import type { NavItem } from '@/components/navigation/Nav';
import { common } from '@/content/id/common';
import { ROUTES } from '@/routing/routes';
import { AppShell } from './AppShell';

const n = common.nav;

export const participantNav: NavItem[] = [
  { to: ROUTES.home, label: n.participant.home, icon: Home },
  { to: ROUTES.catalog, label: n.participant.catalog, icon: Compass, match: [ROUTES.catalogAlias, '/calon'] },
  { to: ROUTES.requests, label: n.participant.taaruf, icon: HeartHandshake, match: ['/taaruf', ROUTES.history, ROUTES.reportNew] },
  { to: ROUTES.account, label: n.participant.account, icon: UserRound, match: [ROUTES.myCv, ROUTES.privacy, ROUTES.safety] },
];

export const pendampingNav: NavItem[] = [
  { to: ROUTES.guardianHome, label: n.pendamping.home, icon: Compass },
  { to: ROUTES.guardianInvitations, label: n.pendamping.invitations, icon: Mail, match: ['/pendamping/persetujuan'] },
  { to: ROUTES.guardianAssignments, label: n.pendamping.supervision, icon: Users },
  { to: ROUTES.guardianSettings, label: n.pendamping.account, icon: UserRound },
];

export function ParticipantLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['participant']}>
      <AppShell items={participantNav} homeTo={ROUTES.home} roleLabel={n.roleLabel.participant}>{children}</AppShell>
    </RequireRole>
  );
}

export function PendampingLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole roles={['pendamping']}>
      <AppShell items={pendampingNav} homeTo={ROUTES.guardianHome} roleLabel={n.roleLabel.pendamping}>{children}</AppShell>
    </RequireRole>
  );
}

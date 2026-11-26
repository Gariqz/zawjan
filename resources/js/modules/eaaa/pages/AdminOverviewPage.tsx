import { KeyRound, ScrollText, Users } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { PageHeader } from '@/components/shared';
import { Callout } from '@/components/ui/callout';
import { staffCopy } from '@/content/id/staff';
import { useQuery } from '@/hooks/useQuery';
import { StaffLayout } from '@/layouts/AdminLayout';
import { OverviewMetrics } from '@/modules/eaaa/pages/ModeratorOverviewPage';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

/** ADM-01 — platform overview; admin does not inherit moderator case access. */
export default function AdminOverviewPage() {
  const { moderator } = useServices();
  const q = useQuery(() => moderator.getOverview(), []);
  const links = [
    { to: ROUTES.adminUsers, label: staffCopy.users.title, body: staffCopy.users.lead, icon: Users },
    { to: ROUTES.adminAccess, label: staffCopy.access.title, body: staffCopy.access.lead, icon: KeyRound },
    { to: ROUTES.adminAudit, label: staffCopy.audit.title, body: staffCopy.audit.lead, icon: ScrollText },
  ];
  return (
    <StaffLayout role="admin">
      <PageHeader title={staffCopy.overview.adminTitle} description={staffCopy.overview.lead} />
      <div className="flex flex-col gap-6">
        <QueryView query={q} skeleton="cards">{(o) => <OverviewMetrics o={o} links={false} />}</QueryView>
        <Callout tone="privacy">{staffCopy.users.noContent}</Callout>
        <ul className="grid gap-4 md:grid-cols-3">
          {links.map((l) => (
            <li key={l.to}>
              <AppLink to={l.to} className="flex h-full flex-col gap-2 rounded-card border border-line bg-surface-white p-5 hover:border-brand-primary">
                <l.icon className="h-5 w-5 text-brand-primary" aria-hidden />
                <span className="font-semibold text-brand-forest">{l.label}</span>
                <span className="text-sm text-ink-muted">{l.body}</span>
              </AppLink>
            </li>
          ))}
        </ul>
      </div>
    </StaffLayout>
  );
}

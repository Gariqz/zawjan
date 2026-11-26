import { QueryView } from '@/components/feedback';
import { RequireRole } from '@/components/navigation/RequireRole';
import { PageHeader } from '@/components/shared';
import { onboardingCopy } from '@/content/id/onboarding';
import { NominationPanel } from '@/modules/marinasi/features/pendamping/NominationPanel';
import { useQuery } from '@/hooks/useQuery';
import { FocusedLayout } from '@/layouts/AppShell';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';

/** ONB-04 — also reachable from Akun › Pendamping Saya. */
export default function InvitePendampingPage() {
  const { profile } = useServices();
  const q = useQuery(() => profile.getNomination(), []);
  return (
    <RequireRole roles={['participant']}>
      <FocusedLayout exitTo={ROUTES.account} exitLabel="Kembali ke akun">
        <PageHeader title={onboardingCopy.invite.title} description={onboardingCopy.invite.lead} />
        <QueryView query={q} skeleton="detail">{(n) => <NominationPanel nomination={n} />}</QueryView>
      </FocusedLayout>
    </RequireRole>
  );
}

import { QueryView } from '@/components/feedback';
import { RequireRole } from '@/components/navigation/RequireRole';
import { PageHeader } from '@/components/shared';
import { onboardingCopy } from '@/content/id/onboarding';
import { CvEditor } from '@/modules/marinasi/features/cv/CvEditor';
import { useQuery } from '@/hooks/useQuery';
import { FocusedLayout } from '@/layouts/AppShell';
import { useAppNavigate } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

/** ONB-03 — first-time CV completion. */
export default function CvNewPage() {
  const { profile } = useServices();
  const nav = useAppNavigate();
  const toast = useToast();
  const q = useQuery(async () => {
    const [s, d] = await Promise.all([profile.getCvSchema(), profile.getCv()]);
    if (!s.ok) return s;
    if (!d.ok) return d;
    return { ok: true as const, data: { schema: s.data, draft: d.data } };
  }, []);
  return (
    <RequireRole roles={['participant']}>
      <FocusedLayout exitTo={ROUTES.start}>
        <PageHeader title={onboardingCopy.cv.newTitle} description={onboardingCopy.cv.lead} />
        <QueryView query={q} skeleton="detail">
          {({ schema, draft }) => <CvEditor schema={schema} draft={draft} onPublished={() => { toast(onboardingCopy.cv.published); nav(ROUTES.start); }} />}
        </QueryView>
      </FocusedLayout>
    </RequireRole>
  );
}

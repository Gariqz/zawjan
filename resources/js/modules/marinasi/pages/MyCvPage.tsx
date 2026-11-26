import { useState } from 'react';
import { QueryView } from '@/components/feedback';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { onboardingCopy } from '@/content/id/onboarding';
import { DiscoveryVisibility } from '@/modules/brandykeun/features/discovery/DiscoveryVisibility';
import { CvEditor, CvReadView, CvStatusBadge } from '@/modules/marinasi/features/cv/CvEditor';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useToast } from '@/state/ui';

const c = onboardingCopy.cv;

/** PAR-07 (also ONB-03 editor) — view and edit own CV with per-section audience labels. */
export default function MyCvPage() {
  const { profile, mode } = useServices();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const q = useQuery(async () => {
    const [s, d] = await Promise.all([profile.getCvSchema(), profile.getCv()]);
    if (!s.ok) return s;
    if (!d.ok) return d;
    return { ok: true as const, data: { schema: s.data, draft: d.data } };
  }, []);
  return (
    <ParticipantLayout>
      <QueryView query={q} skeleton="detail">
        {({ schema, draft }) => (
          <>
            <PageHeader backTo={ROUTES.account} backLabel="Akun" title={c.myTitle} description={c.reviewLead}
              actions={<><CvStatusBadge status={draft.status} />{!editing && <Button onClick={() => setEditing(true)}>{c.edit}</Button>}</>} />
            {editing
              ? <CvEditor schema={schema} draft={draft} onCancel={() => setEditing(false)} onPublished={() => { setEditing(false); toast(c.published); q.reload(); }} />
              : <>{mode === 'mock' && <DiscoveryVisibility published={draft.status === 'published'} />}<CvReadView schema={schema} values={draft.values} onEdit={() => setEditing(true)} /></>}
          </>
        )}
      </QueryView>
    </ParticipantLayout>
  );
}

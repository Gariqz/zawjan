import { PageHeader } from '@/components/shared';
import { pendampingCopy } from '@/content/id/pendamping';
import { ConversationView } from '@/modules/khaslana/features/conversation/ConversationView';
import { PendampingLayout } from '@/layouts/RoleLayouts';
import { useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';

/** GUA-04 — the same four-member room, pendamping perspective (authorized-from scope applies). */
export default function GuardianRoomPage() {
  const id = useRouteParam('id');
  return (
    <PendampingLayout>
      <PageHeader backTo={ROUTES.guardianAssignments} backLabel={pendampingCopy.assignments.title} title={pendampingCopy.room.title} />
      <ConversationView roomId={id} perspective="pendamping" />
    </PendampingLayout>
  );
}

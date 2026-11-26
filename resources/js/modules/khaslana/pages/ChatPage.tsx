import { PageHeader } from '@/components/shared';
import { participantCopy } from '@/content/id/participant';
import { ConversationView } from '@/modules/khaslana/features/conversation/ConversationView';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { useRouteParam } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';

/** PAR-06 — supervised four-member conversation (participant perspective). */
export default function ChatPage() {
  const id = useRouteParam('id');
  return (
    <ParticipantLayout>
      <PageHeader backTo={ROUTES.requests} backLabel={participantCopy.requests.title} title="Ruang ta'aruf" />
      <ConversationView roomId={id} perspective="participant" />
    </ParticipantLayout>
  );
}

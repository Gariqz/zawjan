import { useRef, useState, type TouchEvent } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, UserSearch } from 'lucide-react';
import { QueryView } from '@/components/feedback';
import { EmptyState, PageHeader } from '@/components/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { participantCopy } from '@/content/id/participant';
import type { DiscoveryPreferences, DiscoveryProfile } from '@/domain/types';
import { CandidateCard } from '@/modules/brandykeun/features/discovery/CandidateCard';
import { CandidateFilterForm } from '@/modules/brandykeun/features/discovery/CandidateFilterForm';
import { useQuery } from '@/hooks/useQuery';
import { ParticipantLayout } from '@/layouts/RoleLayouts';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';
import { useServices } from '@/services/registry';
import { useViewer } from '@/state/viewer';

const c = participantCopy.catalog;

export default function CatalogPage() {
  return <ParticipantLayout><CatalogInner /></ParticipantLayout>;
}

function CatalogInner() {
  const viewer = useViewer();
  if (!viewer.capabilities.canBrowseCandidates) {
    return (
      <>
        <PageHeader title={c.title} />
        <EmptyState icon={UserSearch} title={c.gateTitle} description={viewer.ageEligible ? c.gateBody : c.gateAge}
          action={<AppLink to={ROUTES.verification} className={buttonVariants()}>{c.verification}</AppLink>} />
      </>
    );
  }
  return <CatalogResults canRequest={viewer.capabilities.canSendRequest} />;
}

function CatalogResults({ canRequest }: { canRequest: boolean }) {
  const { mode } = useServices();
  const [preferences, setPreferences] = useState<DiscoveryPreferences>({});
  const [open, setOpen] = useState(false);
  const apply = (value: DiscoveryPreferences) => { setPreferences(value); setOpen(false); };

  return (
    <div className="mx-auto max-w-2xl">
      <Dialog open={open} onOpenChange={setOpen}>
        <PageHeader title={c.title} description={c.lead}
          actions={mode === 'mock' ? <DialogTrigger asChild><Button variant="outline"><SlidersHorizontal className="h-4 w-4" aria-hidden />{c.filters}</Button></DialogTrigger> : undefined} />
        <DialogContent title={c.filters} description={c.filtersHelp}>
          <CandidateFilterForm value={preferences} onApply={apply} onReset={() => apply({})} />
        </DialogContent>
      </Dialog>
      {!canRequest && <Callout tone="info" className="mb-4">{c.lockedRequests}</Callout>}
      <Profiles key={JSON.stringify(preferences)} preferences={preferences} onReset={() => setPreferences({})} />
      {mode === 'mock' && <div className="mt-3"><AppLink to={ROUTES.myCv} className={buttonVariants({ variant: 'ghost' })}>{c.settings}</AppLink></div>}
    </div>
  );
}

function Profiles({ preferences, onReset }: { preferences: DiscoveryPreferences; onReset: () => void }) {
  const { candidates } = useServices();
  const q = useQuery(() => candidates.browse(preferences), [preferences]);
  const filtered = Object.values(preferences).some(Boolean);
  return (
    <QueryView query={q} skeleton="detail">
      {({ items }) => items.length > 0
        ? <ProfilePager items={items} />
        : <EmptyState icon={UserSearch} title={c.emptyTitle} description={filtered ? c.emptyFiltered : c.emptyBody}
            action={filtered ? <Button variant="outline" onClick={onReset}>{c.resetFilters}</Button> : undefined} />}
    </QueryView>
  );
}

function ProfilePager({ items }: { items: DiscoveryProfile[] }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ id: number; x: number; y: number; scrollY: number } | null>(null);
  const current = Math.min(index, items.length - 1);
  const candidate = items[current]!;
  const hasPrevious = current > 0;
  const hasNext = current + 1 < items.length;
  const move = (step: number) => setIndex(Math.max(0, Math.min(current + step, items.length - 1)));

  // Only the position strip reserves vertical swipes. The profile and controls keep native scrolling.
  const clearSwipe = () => { touchStart.current = null; };
  const startSwipe = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = e.touches.length === 1 && touch
      ? { id: touch.identifier, x: touch.clientX, y: touch.clientY, scrollY: window.scrollY }
      : null;
  };
  const trackSwipe = (e: TouchEvent) => {
    if (e.touches.length !== 1 || window.scrollY !== touchStart.current?.scrollY) clearSwipe();
  };
  const endSwipe = (e: TouchEvent) => {
    const start = touchStart.current;
    clearSwipe();
    const end = e.changedTouches[0];
    if (!start || !end || end.identifier !== start.id || e.touches.length || window.scrollY !== start.scrollY
      || window.getSelection()?.isCollapsed === false) return;
    const dy = end.clientY - start.y;
    if (Math.abs(dy) >= 60 && Math.abs(dy) > 1.5 * Math.abs(end.clientX - start.x)) move(dy < 0 ? 1 : -1);
  };

  return (
    <>
      <div className="mb-3 flex min-h-touch flex-wrap items-center justify-between gap-x-3 rounded-control border border-line bg-surface-white px-3 text-sm text-ink-muted [touch-action:pan-x_pinch-zoom]"
        onTouchStart={startSwipe} onTouchMove={trackSwipe} onTouchEnd={endSwipe} onTouchCancel={clearSwipe}>
        <p className="tabular-nums" role="status">
          {c.position(current + 1, items.length)}<span className="sr-only">: {candidate.displayName}</span>
        </p>
        {items.length > 1 && <span className="hidden [@media(pointer:coarse)]:inline" aria-hidden>{c.swipeHint}</span>}
      </div>
      <CandidateCard candidate={candidate} />
      <nav aria-label={c.navigation} className="mt-4 flex justify-between gap-2">
        <Button variant="outline" aria-disabled={!hasPrevious} className="aria-disabled:opacity-55" onClick={() => { if (hasPrevious) move(-1); }}>
          <ChevronUp className="h-4 w-4" aria-hidden />{c.previous}
        </Button>
        <Button variant="outline" aria-disabled={!hasNext} className="aria-disabled:opacity-55" onClick={() => { if (hasNext) move(1); }}>
          {c.next}<ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </nav>
    </>
  );
}

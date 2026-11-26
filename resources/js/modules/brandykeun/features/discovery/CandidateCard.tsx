import { ArrowRight, MapPin } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { participantCopy } from '@/content/id/participant';
import type { DiscoveryProfile } from '@/domain/types';
import { AppLink } from '@/routing/navigation';
import { ROUTES } from '@/routing/routes';

const c = participantCopy.catalog;

export function CandidateCard({ candidate }: { candidate: DiscoveryProfile }) {
  return (
    <Card className="overflow-hidden" role="article" aria-labelledby="profile-name">
      <div className="bg-brand-mint/60 px-5 py-6 sm:px-8 sm:py-8">
        <h2 id="profile-name" className="break-words font-display text-3xl font-semibold leading-tight text-brand-forest sm:text-4xl">{candidate.displayName}</h2>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-forest">
          <span>{c.age(candidate.age)}</span>
          {candidate.region && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{candidate.region}</span>}
        </p>
      </div>
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {candidate.introduction && <div className="mb-6">
          <h3 className="font-semibold text-ink">{c.introduction}</h3>
          <p className="mt-2 max-w-[65ch] break-words text-ink-muted">{candidate.introduction}</p>
        </div>}
        <AppLink to={ROUTES.candidate(candidate.id)} className={buttonVariants()}>{c.viewCv}<ArrowRight className="h-4 w-4" aria-hidden /></AppLink>
      </div>
    </Card>
  );
}

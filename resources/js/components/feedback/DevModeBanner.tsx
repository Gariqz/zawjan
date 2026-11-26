import { FlaskConical } from 'lucide-react';
import { common } from '@/content/id/common';

/** Shown whenever mock adapters are active. Never removed by design exports. */
export function DevModeBanner() {
  return (
    <div role="note" className="flex items-center justify-center gap-2 bg-accent-amber-soft px-3 py-1.5 text-center text-xs font-semibold text-accent-amber-text">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{common.dev.banner}</span>
    </div>
  );
}

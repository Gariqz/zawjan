import { Lock } from 'lucide-react';
import { participantCopy } from '@/content/id/participant';
import { cn } from '@/lib/utils';

/**
 * Renders a photo ONLY when the server supplied an authorized URL. Otherwise a protected
 * placeholder: no real asset is fetched, so nothing can be "un-blurred".
 */
export function PhotoPrivacyGate({ url, name, size = 'md', className }: { url?: string | undefined; name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dims = size === 'sm' ? 'h-20 w-20' : size === 'md' ? 'h-28 w-28' : 'aspect-[4/5] w-full max-w-xs';
  if (url) {
    return <img src={url} alt={`Foto ${name}, dibagikan kepada Anda`} className={cn(dims, 'rounded-card border border-line object-cover', className)} />;
  }
  return (
    <div role="img" aria-label={`Foto ${name} belum dibagikan`} className={cn(dims, 'protected-media flex flex-col items-center justify-center gap-1 rounded-card border border-line text-center', className)}>
      <Lock className={cn('text-brand-primary', size === 'lg' ? 'h-8 w-8' : 'h-5 w-5')} aria-hidden />
      {size === 'lg' && <span className="max-w-[16rem] px-4 text-sm font-medium text-brand-forest">{participantCopy.candidate.photoHidden}</span>}
    </div>
  );
}

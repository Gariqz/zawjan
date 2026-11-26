import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLink, useCurrentPath } from '@/routing/navigation';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Additional path prefixes that keep this item active. */
  match?: string[];
}

export function isActive(item: NavItem, path: string): boolean {
  if (path === item.to) return true;
  return (item.match ?? []).some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p));
}

export function MobileBottomNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = useCurrentPath();
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-white/95 backdrop-blur safe-bottom md:hidden">
      <ul className="mx-auto grid h-[var(--bottom-nav-height)] max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => {
          const active = isActive(it, path);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <AppLink to={it.to} aria-current={active ? 'page' : undefined}
                className={cn('flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold', active ? 'text-brand-primary' : 'text-ink-muted hover:text-ink')}>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-brand-mint')}><Icon className="h-5 w-5" aria-hidden /></span>
                {it.label}
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopSidebar({ items, label, className, onNavigate }: { items: NavItem[]; label: string; className?: string; onNavigate?: () => void }) {
  const path = useCurrentPath();
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col gap-1">
        {items.map((it) => {
          const active = isActive(it, path);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <AppLink to={it.to} onClick={onNavigate} aria-current={active ? 'page' : undefined}
                className={cn('flex min-h-touch items-center gap-3 rounded-control px-3 text-sm font-semibold', active ? 'bg-brand-mint text-brand-forest' : 'text-ink-muted hover:bg-surface-canvas hover:text-ink')}>
                <Icon className={cn('h-5 w-5', active ? 'text-brand-primary' : '')} aria-hidden />
                {it.label}
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

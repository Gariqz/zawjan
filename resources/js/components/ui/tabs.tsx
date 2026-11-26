import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode; count?: number }[];
  idBase: string;
}

/** Segmented tabs with roving focus (arrow keys), WAI-ARIA tabs pattern. */
export function Tabs<T extends string>({ label, value, onChange, items, idBase }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + items.length) % items.length;
    const next = items[n];
    if (next) { onChange(next.value); refs.current[n]?.focus(); }
  };
  return (
    <div role="tablist" aria-label={label} className="flex w-full gap-1 rounded-control bg-line/60 p-1">
      {items.map((it, i) => {
        const selected = it.value === value;
        return (
          <button
            key={it.value}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            id={`${idBase}-tab-${it.value}`}
            aria-controls={`${idBase}-panel`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'flex min-h-touch flex-1 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold',
              selected ? 'bg-surface-white text-brand-forest shadow-card' : 'text-ink-muted hover:text-ink',
            )}
          >
            {it.label}
            {typeof it.count === 'number' && <span className="rounded-full bg-brand-mint px-2 py-0.5 text-xs text-brand-forest">{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, activeValue, children }: { idBase: string; activeValue: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${activeValue}`} tabIndex={0} className="focus-visible:rounded-card">
      {children}
    </div>
  );
}

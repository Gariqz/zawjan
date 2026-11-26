import { createContext, useContext, type ReactNode } from 'react';
import type { ViewerContext } from '@/domain/types';
import { useQuery, type QueryState } from '@/hooks/useQuery';
import { useServices } from '@/services/registry';

type ViewerState = QueryState<ViewerContext> & { reload: () => void };
const Ctx = createContext<ViewerState | null>(null);

/** Session/viewer context. Server-provided capabilities only; never cached in browser storage. */
export function ViewerProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const q = useQuery(() => auth.getViewer(), []);
  return <Ctx.Provider value={q}>{children}</Ctx.Provider>;
}

export function useViewerState(): ViewerState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useViewerState must be used inside <ViewerProvider>');
  return v;
}

/** Only call beneath a guard that has already resolved the viewer. */
export function useViewer(): ViewerContext {
  const v = useViewerState();
  if (v.status !== 'success') throw new Error('Viewer not loaded');
  return v.data;
}

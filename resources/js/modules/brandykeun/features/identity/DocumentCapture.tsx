import { useEffect, useRef, useState } from 'react';
import { Camera, FileUp, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { onboardingCopy } from '@/content/id/onboarding';
import type { UploadHandle } from '@/domain/types';
import { common } from '@/content/id/common';
import { failureFromThrown } from '@/services/errors';
import { useServices } from '@/services/registry';

type State =
  | { s: 'idle' }
  | { s: 'uploading'; file: File }
  | { s: 'uploaded'; file: File; handle: UploadHandle; preview?: string }
  | { s: 'failed'; file: File; message: string };

/**
 * Document / selfie capture with upload feedback. Raw bytes go straight to the identity upload
 * adapter; only the opaque handle leaves this component. Previews are object URLs revoked on
 * removal/unmount so they do not linger.
 */
export function DocumentCapture({ kind, label, hint, onChange }: {
  kind: 'document' | 'selfie'; label: string; hint: string; onChange: (h: UploadHandle | null) => void;
}) {
  const c = onboardingCopy.verification;
  const { identity } = useServices();
  const [st, setSt] = useState<State>({ s: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | undefined>();

  const clearPreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = undefined;
  };
  useEffect(() => clearPreview, []);

  const upload = async (file: File) => {
    clearPreview();
    setSt({ s: 'uploading', file });
    onChange(null);
    let r: Awaited<ReturnType<typeof identity.upload>>;
    try {
      r = await identity.upload(kind, file);
    } catch (e) {
      r = failureFromThrown(e);
    }
    if (r.ok) {
      const preview = file.type.startsWith('image/') && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined;
      previewRef.current = preview;
      setSt({ s: 'uploaded', file, handle: r.data, ...(preview ? { preview } : {}) });
      onChange(r.data);
    } else {
      setSt({ s: 'failed', file, message: r.message ?? (r.code === 'NETWORK_ERROR' ? common.errors.network : c.uploadFailed) });
    }
  };
  const pick = (f: FileList | null) => { const file = f?.[0]; if (file) void upload(file); };
  const remove = () => { clearPreview(); setSt({ s: 'idle' }); onChange(null); if (fileRef.current) fileRef.current.value = ''; if (camRef.current) camRef.current.value = ''; };
  const inputId = `capture-${kind}`;

  return (
    <section aria-labelledby={`${inputId}-label`} className="rounded-card border border-line bg-surface-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id={`${inputId}-label`} className="font-semibold">{label}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>
        </div>
        {st.s === 'uploaded' && <Badge tone="success">{c.uploaded}</Badge>}
        {st.s === 'uploading' && <Badge tone="info">{c.uploading}</Badge>}
        {st.s === 'failed' && <Badge tone="danger">{c.uploadFailed}</Badge>}
      </div>

      <input ref={fileRef} id={inputId} type="file" className="sr-only" tabIndex={-1} aria-hidden
        accept={kind === 'document' ? 'image/jpeg,image/png,application/pdf' : 'image/jpeg,image/png'} onChange={(e) => pick(e.target.files)} />
      <input ref={camRef} type="file" className="sr-only" tabIndex={-1} aria-hidden accept="image/jpeg,image/png"
        capture={kind === 'document' ? 'environment' : 'user'} onChange={(e) => pick(e.target.files)} />

      {st.s === 'idle' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp className="h-4 w-4" aria-hidden />{c.chooseFile}</Button>
          <Button variant="outline" onClick={() => camRef.current?.click()}><Camera className="h-4 w-4" aria-hidden />{c.useCamera}</Button>
        </div>
      )}

      {st.s !== 'idle' && (
        <div className="mt-3 flex items-center gap-3 rounded-control border border-line bg-surface-canvas p-3" aria-live="polite">
          {st.s === 'uploaded' && st.preview
            ? <img src={st.preview} alt="" className="h-14 w-14 rounded-md object-cover" />
            : <span className="flex h-14 w-14 items-center justify-center rounded-md bg-line text-xs text-ink-muted">{st.file.type === 'application/pdf' ? 'PDF' : '—'}</span>}
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{st.file.name}</p>
            <p className="text-ink-muted">{Math.max(1, Math.round(st.file.size / 1024))} KB</p>
            {st.s === 'failed' && <p className="font-medium text-danger">{st.message}</p>}
          </div>
          {st.s === 'failed' && <Button size="icon" variant="ghost" aria-label={`${c.retry}: ${label}`} onClick={() => void upload(st.file)}><RotateCcw className="h-4 w-4" aria-hidden /></Button>}
          {st.s !== 'uploading' && <Button size="icon" variant="ghost" aria-label={`${c.remove}: ${label}`} onClick={remove}><Trash2 className="h-4 w-4" aria-hidden /></Button>}
        </div>
      )}
      {st.s === 'uploaded' && st.preview && <p className="mt-2 text-xs text-ink-subtle">{c.previewNote}</p>}
    </section>
  );
}

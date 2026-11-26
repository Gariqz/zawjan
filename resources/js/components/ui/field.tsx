import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const control = 'block w-full rounded-control border border-line-strong bg-surface-white px-3 text-base text-ink placeholder:text-ink-subtle hover:border-ink-subtle focus-visible:border-brand-primary aria-[invalid=true]:border-danger disabled:bg-surface-canvas disabled:text-ink-subtle';

export interface FieldRenderProps { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: (p: FieldRenderProps) => ReactNode;
}

/** Visible label + hint + error, wired with aria-describedby (design.md §12). */
export function Field({ label, hint, error, required, optionalLabel = true, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}{' '}
        {required ? <span className="font-medium text-ink-subtle">(wajib)</span> : optionalLabel ? <span className="font-medium text-ink-subtle">(opsional)</span> : null}
      </label>
      {hint && <p id={hintId} className="text-sm text-ink-muted">{hint}</p>}
      {children({ id, ...(describedBy ? { 'aria-describedby': describedBy } : {}), ...(error ? { 'aria-invalid': true } : {}) })}
      {error && <p id={errId} className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(control, 'min-h-touch', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(control, 'min-h-[112px] py-2.5', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(control, 'min-h-touch pr-8', className)} {...p}>{children}</select>
));
Select.displayName = 'Select';

interface CheckProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { label: ReactNode; error?: string; description?: ReactNode }

export function Checkbox({ label, error, description, className, ...p }: CheckProps) {
  const id = useId();
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="flex min-h-touch cursor-pointer items-start gap-3 py-1.5">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line-strong accent-brand-primary"
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          {...p}
        />
        <span className="text-sm text-ink">
          {label}
          {description && <span className="mt-0.5 block text-ink-muted">{description}</span>}
        </span>
      </label>
      {error && <p id={errId} className="pl-8 text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 aria-[busy=true]:cursor-progress',
  {
    variants: {
      variant: {
        primary: 'bg-brand-primary text-white hover:bg-brand-forest',
        secondary: 'bg-brand-mint text-brand-forest hover:bg-brand-mint/70',
        outline: 'border border-line-strong bg-surface-white text-ink hover:bg-surface-canvas',
        ghost: 'text-ink-muted hover:bg-surface-canvas hover:text-ink',
        danger: 'bg-danger text-white hover:bg-danger/90',
        'danger-outline': 'border border-danger/40 bg-surface-white text-danger hover:bg-danger-soft',
        link: 'h-auto min-h-0 px-0 text-brand-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'min-h-touch px-3 text-sm',
        md: 'min-h-touch px-4 text-sm',
        lg: 'min-h-[52px] px-6 text-base',
        icon: 'h-11 w-11 p-0',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  busy?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, busy, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white shadow-[0_16px_32px_-16px_var(--accent-2)] bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] hover:brightness-[1.06] active:brightness-95',
  secondary:
    'glass text-[var(--ink)] hover:bg-white/85 active:bg-white/95',
  outline:
    'border border-[var(--card-line)] bg-white/55 text-[var(--ink)] hover:bg-white/80',
  ghost: 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-white/50',
};

// Comfortable thumb targets: nothing below 44px tall in the guest flow.
const SIZES: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm rounded-full',
  md: 'h-12 px-6 text-[0.95rem] rounded-full',
  lg: 'h-14 px-8 text-base rounded-full',
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-medium tracking-[0.01em]',
        'transition-[transform,filter,background-color] duration-200 ease-out',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-80')}>{children}</span>
    </button>
  );
});

export default Button;

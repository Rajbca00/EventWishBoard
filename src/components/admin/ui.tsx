import Link from 'next/link';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="mt-1 text-[0.9rem] text-[var(--ink-soft)]">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--card-line)] bg-white shadow-[0_10px_30px_-24px_rgb(59_44_39/0.5)]',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-line)] px-5 py-4">
          <div>
            {title && <h2 className="font-medium text-[var(--ink)]">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[0.82rem] text-[var(--ink-soft)]">{description}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'plain',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'plain' | 'accent' | 'warn';
}) {
  return (
    <div className="rounded-2xl border border-[var(--card-line)] bg-white p-4">
      <p className="text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ink-soft)]">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-display text-[1.9rem] leading-none',
          tone === 'accent' && 'text-[var(--accent-2)]',
          tone === 'warn' && 'text-[#b4682f]',
          tone === 'plain' && 'text-[var(--ink)]',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[0.76rem] text-[var(--ink-soft)]">{hint}</p>}
    </div>
  );
}

const BADGE_TONES = {
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-stone-100 text-stone-600 ring-stone-200',
  full: 'bg-amber-50 text-amber-700 ring-amber-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  hidden: 'bg-stone-100 text-stone-600 ring-stone-200',
  accent: 'bg-blush-50 text-blush-600 ring-blush-200',
} as const;

export function Badge({
  tone = 'closed',
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-medium ring-1 ring-inset',
        BADGE_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  emoji,
  title,
  detail,
  action,
}: {
  emoji: string;
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <div>
        <p className="font-medium text-[var(--ink)]">{title}</p>
        {detail && <p className="mt-1 max-w-sm text-[0.86rem] text-[var(--ink-soft)]">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost';
  external?: boolean;
}) {
  const className = cn(
    'inline-flex h-10 items-center gap-2 rounded-full px-5 text-[0.86rem] font-medium transition-colors',
    variant === 'primary'
      ? 'bg-[var(--accent-2)] text-white hover:bg-[var(--accent)]'
      : 'border border-[var(--card-line)] bg-white text-[var(--ink)] hover:bg-cocoa-50',
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

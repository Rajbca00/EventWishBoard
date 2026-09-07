import { cn } from '@/lib/utils';

/**
 * Laya & Bee house mark.
 *
 * Deliberately restrained: during the guest flow the celebration is the star,
 * so this sits quietly in a corner until the thank-you screen.
 */

export function BrandGlyph({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path d="M7 16h18l-2.2 12.2a2.6 2.6 0 0 1-2.6 2.1h-8.4a2.6 2.6 0 0 1-2.6-2.1L7 16Z" fill="currentColor" opacity="0.28" />
      <path
        d="M16 2.4c3.1 0 4.4 2 4.4 3.8 2.7 0 4.7 1.8 4.7 4.1S23 14.3 20.3 14.3H11.7C9 14.3 7 12.5 7 10.3s2-4.1 4.7-4.1C11.7 4.4 12.9 2.4 16 2.4Z"
        fill="currentColor"
      />
      <circle cx="16" cy="2.2" r="1.9" fill="currentColor" />
      <path d="M11 20h10M10 24.5h12" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  className?: string;
  /** 'quiet' for in-flow corners, 'full' for the thank-you moment. */
  tone?: 'quiet' | 'full';
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandMark({ className, tone = 'quiet', size = 'sm' }: Props) {
  const scale = { sm: 'text-[0.72rem]', md: 'text-sm', lg: 'text-lg' }[size];
  const glyph = { sm: 14, md: 18, lg: 26 }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-display tracking-[0.14em] uppercase',
        tone === 'quiet' ? 'text-[var(--ink-soft)]/75' : 'text-[var(--ink)]',
        scale,
        className,
      )}
    >
      <BrandGlyph size={glyph} className={tone === 'quiet' ? 'opacity-70' : 'text-[var(--accent)]'} />
      Laya &amp; Bee
    </span>
  );
}

/** The subtle footer line used across the guest flow. */
export function PoweredBy({ className, label = 'A Laya & Bee experience' }: { className?: string; label?: string }) {
  return (
    <p
      className={cn(
        'flex items-center justify-center gap-1.5 text-[0.68rem] tracking-[0.16em] uppercase',
        'text-[var(--ink-soft)]/65',
        className,
      )}
    >
      <BrandGlyph size={12} className="opacity-60" />
      {label}
    </p>
  );
}

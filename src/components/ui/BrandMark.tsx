import { cn } from '@/lib/utils';

/**
 * Laya & Bee house marks, drawn from the bakery's own artwork: the chef-hatted
 * bee, the gold ampersand, and the chocolate-on-cream palette.
 *
 * Deliberately restrained in the guest flow — the celebration is the star, and
 * this sits quietly in a corner until the thank-you screen.
 */

/** The mascot: a bee in a chef's hat. Reads down to about 14px. */
export function BrandGlyph({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label="Laya &amp; Bee"
    >
      {/* antennae — kept thin so they read as antennae, not horns */}
      <path
        d="M15.8 8.6C14.2 6.6 13 5.4 11.8 4.4M24.2 8.6c1.6-2 2.8-3.2 4-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="11.2" cy="3.6" r="1.8" fill="currentColor" />
      <circle cx="28.8" cy="3.6" r="1.8" fill="currentColor" />

      {/* chef's hat: one puffy silhouette plus a solid band, so the shape still
          reads at 16px where three separate lobes would blur together */}
      <path
        d="M11.6 14.4c-1.4-1-2.2-2.5-2.2-4.2 0-2.9 2.4-5.2 5.4-5.2.4 0 .8 0 1.2.1C16.9 3.2 18.8 2 21 2c2.2 0 4.1 1.2 5 3.1.4-.1.8-.1 1.2-.1 3 0 5.4 2.3 5.4 5.2 0 1.7-.8 3.2-2.2 4.2H11.6Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M11.6 14.4c-1.4-1-2.2-2.5-2.2-4.2 0-2.9 2.4-5.2 5.4-5.2.4 0 .8 0 1.2.1C16.9 3.2 18.8 2 21 2c2.2 0 4.1 1.2 5 3.1.4-.1.8-.1 1.2-.1 3 0 5.4 2.3 5.4 5.2 0 1.7-.8 3.2-2.2 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="11.2" y="14" width="19.6" height="3.6" rx="1.4" fill="currentColor" />

      {/* wings, solid enough to survive small sizes */}
      <ellipse cx="8.8" cy="23.4" rx="4.4" ry="2.9" fill="currentColor" fillOpacity="0.42" transform="rotate(-28 8.8 23.4)" />
      <ellipse cx="33.2" cy="23.4" rx="4.4" ry="2.9" fill="currentColor" fillOpacity="0.42" transform="rotate(28 33.2 23.4)" />

      {/* body: a tapered teardrop rather than a circle, so the tail gives it a
          bee's profile instead of a hive's */}
      <path
        d="M21 19c4.6 0 7.8 3.4 7.8 8 0 5.2-3.6 10.4-7.8 10.4S13.2 32.2 13.2 27c0-4.6 3.2-8 7.8-8Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* two stripes only — three turned it into a beehive */}
      <path
        d="M14.4 25.2h13.2M15.6 30.4h10.8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The wordmark. The ampersand carries the brand's gold, exactly as it does on
 * the packaging, and "Cakes" sits beneath in wide letterspacing.
 */
export function BrandWordmark({
  className,
  size = 'md',
  showSub = true,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSub?: boolean;
}) {
  const type = {
    sm: { name: 'text-[1.05rem]', sub: 'text-[0.5rem] tracking-[0.42em]' },
    md: { name: 'text-[1.6rem]', sub: 'text-[0.6rem] tracking-[0.44em]' },
    lg: { name: 'text-[2.6rem]', sub: 'text-[0.78rem] tracking-[0.46em]' },
  }[size];

  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <span className={cn('font-display font-semibold tracking-tight', type.name)}>
        Laya <span style={{ color: 'var(--brand-gold)' }}>&amp;</span> Bee
      </span>
      {showSub && (
        <span className={cn('mt-1 uppercase text-[var(--ink-soft)]', type.sub)}>Cakes</span>
      )}
    </span>
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
  const glyph = { sm: 16, md: 22, lg: 30 }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-display uppercase tracking-[0.14em]',
        tone === 'quiet' ? 'text-[var(--ink-soft)]/75' : 'text-[var(--ink)]',
        scale,
        className,
      )}
    >
      <BrandGlyph size={glyph} className={tone === 'quiet' ? 'opacity-70' : 'text-[var(--accent)]'} />
      Laya <span style={{ color: 'var(--brand-gold)' }}>&amp;</span> Bee
    </span>
  );
}

/** The subtle footer line used across the guest flow. */
export function PoweredBy({
  className,
  label = 'A Laya & Bee experience',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-center justify-center gap-1.5 text-[0.68rem] uppercase tracking-[0.16em]',
        'text-[var(--ink-soft)]/65',
        className,
      )}
    >
      <BrandGlyph size={13} className="opacity-60" />
      {label}
    </p>
  );
}

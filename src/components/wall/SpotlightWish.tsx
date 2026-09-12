'use client';

import Image from 'next/image';
import { visibleWishDecorations } from './WishCard';
import { SPOTLIGHT_TIERS, spotlightTier } from '@/lib/live-rotation';
import { cn } from '@/lib/utils';
import type { PublicWish } from '@/lib/types';

interface Props {
  current: PublicWish | null;
  /** The wish fading out while `current` fades in. */
  previous: PublicWish | null;
  /** True while `current` is a wish that arrived during this session. */
  justArrived: boolean;
  /** Shown when there are no wishes yet. */
  emptyTitle: string;
  emptyHint: string;
}

const isImage = (value: string) => value.startsWith('/') || value.startsWith('http');

/** Four fine gold corners, the invitation-card cue. */
function Corners() {
  const corner = 'pointer-events-none absolute size-[clamp(1.25rem,3.4cqi,3rem)] border-[var(--gold)]/60';
  const inset = 'clamp(0.7rem, 1.6cqi, 1.3rem)';
  return (
    <>
      <span className={cn(corner, 'border-l border-t rounded-tl-[0.6rem]')} style={{ top: inset, left: inset }} aria-hidden />
      <span className={cn(corner, 'border-r border-t rounded-tr-[0.6rem]')} style={{ top: inset, right: inset }} aria-hidden />
      <span className={cn(corner, 'border-b border-l rounded-bl-[0.6rem]')} style={{ bottom: inset, left: inset }} aria-hidden />
      <span className={cn(corner, 'border-b border-r rounded-br-[0.6rem]')} style={{ bottom: inset, right: inset }} aria-hidden />
    </>
  );
}

/** A short gold rule with a diamond, between the wish and its author. */
function Flourish({ align }: { align: 'center' | 'start' }) {
  return (
    <span
      className={cn('flex items-center gap-[0.6em] text-[var(--gold)]', align === 'center' ? 'justify-center' : 'justify-start')}
      style={{ fontSize: 'clamp(0.7rem, 1.4cqi, 1.1rem)' }}
      aria-hidden
    >
      <span className="h-px w-[3.2em] bg-current opacity-60" />
      <svg width="0.7em" height="0.7em" viewBox="0 0 10 10" fill="currentColor">
        <path d="M5 0 10 5 5 10 0 5Z" />
      </svg>
      <span className="h-px w-[3.2em] bg-current opacity-60" />
    </span>
  );
}

function Layer({ wish, phase, justArrived }: { wish: PublicWish; phase: 'in' | 'out'; justArrived: boolean }) {
  const photo = wish.selfieUrl;
  const tier = SPOTLIGHT_TIERS[spotlightTier(wish.message, Boolean(photo))]!;
  const decorations = visibleWishDecorations(wish);
  const align = photo ? 'start' : 'center';

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center gap-[clamp(1.25rem,4cqi,3.5rem)]',
        phase === 'in' ? 'live-spot-in' : 'live-spot-out',
      )}
      style={{ padding: 'clamp(1.5rem, 5.2cqi, 4.5rem)' }}
      aria-hidden={phase === 'out'}
    >
      {photo && (
        <figure className="relative h-[80%] max-w-[38%] shrink-0 overflow-hidden rounded-[clamp(0.9rem,1.8cqi,1.6rem)] shadow-[0_24px_50px_-28px_rgb(63_34_15/0.55)]" style={{ aspectRatio: '4 / 5' }}>
          {/* A guest upload on a signed URL: a plain img avoids the optimiser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="size-full object-cover" decoding="async" />
          <span className="pointer-events-none absolute inset-[0.55rem] rounded-[inherit] ring-1 ring-white/55" aria-hidden />
        </figure>
      )}

      <div
        className={cn(
          'flex h-full min-w-0 flex-1 flex-col justify-center',
          align === 'center' ? 'items-center text-center' : 'items-start text-left',
        )}
      >
        {justArrived && (
          <span
            className="mb-[clamp(0.5rem,1.6cqi,1.25rem)] inline-flex items-center gap-[0.5em] rounded-full border border-[var(--gold)]/45 bg-[var(--tint-strong)] px-[0.9em] py-[0.35em] font-body font-medium uppercase tracking-[0.22em] text-[var(--ink)]"
            style={{ fontSize: 'clamp(0.7rem, 1.35cqi, 1.05rem)' }}
          >
            ✨ Just arrived
          </span>
        )}

        <span
          className="font-display leading-[0.6] text-[var(--gold)] opacity-70 select-none"
          style={{ fontSize: 'clamp(2.75rem, 8.5cqi, 7.5rem)', height: '0.5em' }}
          aria-hidden
        >
          &ldquo;
        </span>

        <p
          className="font-display font-[450] text-[var(--ink)] [overflow-wrap:anywhere]"
          style={{
            fontSize: `clamp(1.35rem, ${tier.cqi}cqi, 5.2rem)`,
            lineHeight: 1.36,
            letterSpacing: '-0.005em',
            maxInlineSize: photo ? undefined : '23em',
            marginTop: 'clamp(0.75rem, 2.4cqi, 2rem)',
            textWrap: 'pretty',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: tier.lines,
            overflow: 'hidden',
          }}
        >
          {wish.message}
        </p>

        <div
          className={cn('flex w-full flex-col gap-[clamp(0.6rem,1.8cqi,1.4rem)]', align === 'center' ? 'items-center' : 'items-start')}
          style={{ marginTop: 'clamp(1rem, 3cqi, 2.5rem)' }}
        >
          <Flourish align={align} />
          <div className={cn('flex max-w-full items-center gap-[clamp(0.6rem,1.6cqi,1.25rem)]', align === 'center' && 'justify-center')}>
            <p
              className="min-w-0 truncate font-display italic text-[var(--ink-soft)]"
              style={{ fontSize: 'clamp(1.05rem, 2.6cqi, 2.3rem)' }}
            >
              — {wish.name ?? 'Anonymous'}
            </p>
            {decorations.map((value) =>
              isImage(value) ? (
                <span
                  key={value}
                  className="relative shrink-0 overflow-hidden rounded-[0.8rem] bg-[var(--tint)] ring-1 ring-[var(--card-line)]"
                  style={{ width: 'clamp(2.2rem, 5cqi, 4.25rem)', height: 'clamp(2.2rem, 5cqi, 4.25rem)' }}
                >
                  <Image src={value} alt="" fill sizes="68px" className="object-contain p-1" unoptimized />
                </span>
              ) : (
                <span key={value} className="shrink-0 leading-none" style={{ fontSize: 'clamp(1.6rem, 3.8cqi, 3.2rem)' }} aria-hidden>
                  {value}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The featured wish on the venue display.
 *
 * One wish at a time, set large, crossfading to the next. The frame never
 * changes size — only what is inside it — so nothing else on the screen moves
 * when a new wish takes the spotlight.
 */
export default function SpotlightWish({ current, previous, justArrived, emptyTitle, emptyHint }: Props) {
  return (
    <section className="relative h-full w-full" style={{ containerType: 'inline-size' }} aria-live="polite">
      {/* A soft glow behind the frame, breathing slowly. Opacity only, so it
          never touches the text above it. */}
      <div
        className="live-halo pointer-events-none absolute -inset-[3%] rounded-[3rem] bg-[radial-gradient(closest-side,var(--gold),transparent)] opacity-40 blur-3xl"
        aria-hidden
      />

      <div className="absolute inset-0 overflow-hidden rounded-[clamp(1.25rem,2.4cqi,2.25rem)] border border-[var(--card-line)] bg-[var(--card-solid)] shadow-[0_40px_90px_-50px_rgb(63_34_15/0.5)]">
        {/* Gold hairline along the top, shared with every card on the wall */}
        <span
          className="pointer-events-none absolute inset-x-[12%] top-0 h-px opacity-80"
          style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }}
          aria-hidden
        />
        <Corners />

        {previous && previous.id !== current?.id && (
          <Layer key={previous.id} wish={previous} phase="out" justArrived={false} />
        )}
        {current && <Layer key={current.id} wish={current} phase="in" justArrived={justArrived} />}

        {!current && (
          <div className="live-spot-in absolute inset-0 flex flex-col items-center justify-center gap-[clamp(0.75rem,2.4cqi,2rem)] p-[6cqi] text-center">
            <Flourish align="center" />
            <p className="font-display text-[var(--ink)]" style={{ fontSize: 'clamp(1.6rem, 5cqi, 4.2rem)', lineHeight: 1.2 }}>
              {emptyTitle}
            </p>
            <p className="font-display italic text-[var(--ink-soft)]" style={{ fontSize: 'clamp(1rem, 2.4cqi, 2rem)' }}>
              {emptyHint}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

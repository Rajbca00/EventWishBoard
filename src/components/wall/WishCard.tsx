'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PublicWish } from '@/lib/types';

interface Props {
  wish: Pick<PublicWish, 'message' | 'name' | 'sticker' | 'gif' | 'meme' | 'selfieUrl'>;
  /** 'live' is the venue screen: sized to be read from across a room. */
  variant?: 'wall' | 'preview' | 'live';
  className?: string;
  style?: React.CSSProperties;
  /** Renders the media but skips the entry animation (used by the flying clone). */
  flat?: boolean;
}

/** A sticker is stored either as an emoji or as an image URL. */
function isEmoji(value: string | null): value is string {
  return Boolean(value && !value.startsWith('/') && !value.startsWith('http'));
}

export default function WishCard({ wish, variant = 'wall', className, style, flat = false }: Props) {
  const isPreview = variant === 'preview';
  const isLive = variant === 'live';
  const media = wish.gif ?? wish.meme;

  return (
    <article
      className={cn(
        'relative flex flex-col gap-3 rounded-[1.4rem] text-left',
        /*
         * The venue board uses a solid card rather than the frosted one. A
         * backdrop-filter forces every card onto its own GPU layer, and text
         * on a composited layer is rendered with grayscale anti-aliasing and
         * resampled as the card drifts — crisp type matters more here than
         * the glass effect, and it is far cheaper across a whole evening.
         */
        isLive
          ? 'border border-[var(--card-line)] bg-[var(--card-solid)]'
          : 'glass',
        'shadow-[0_22px_46px_-28px_rgb(74_44_51/0.55)]',
        isPreview && 'w-full max-w-[22rem] p-5',
        // Everything on the venue screen scales with the viewport so one layout
        // works on a laptop preview and a 65" TV alike.
        isLive && 'w-full gap-[0.8vw] p-[1.2vw]',
        !isPreview && !isLive && 'w-[min(14.5rem,42vw)] gap-2.5 p-3.5 sm:w-[min(14.5rem,28vw)]',
        !flat && 'transition-transform duration-500',
        className,
      )}
      style={style}
    >
      {/* Gold hairline along the top edge — the "premium invitation" cue */}
      <span
        className="pointer-events-none absolute inset-x-5 top-0 h-px opacity-70"
        style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }}
        aria-hidden
      />

      {wish.selfieUrl && (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl ring-1 ring-white/60',
            isPreview ? 'h-40' : isLive ? 'h-[9vw]' : 'h-20',
          )}
        >
          {/* Selfies are user uploads on a signed URL, so plain img keeps it simple. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wish.selfieUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <p
        className={cn(
          'font-display text-balance-pretty leading-snug text-[var(--ink)]',
          isPreview && 'text-[1.15rem]',
          isLive && 'line-clamp-6 text-[length:var(--live-text,clamp(0.95rem,1.2vw,2.1rem))] leading-relaxed',
          !isPreview && !isLive && 'line-clamp-3 text-[0.86rem]',
        )}
      >
        {wish.message}
      </p>

      {(media || wish.sticker) && (
        <div className="flex items-center gap-2">
          {media && (
            <span
              className={cn(
                'relative overflow-hidden rounded-xl bg-white/55 ring-1 ring-white/60',
                isPreview ? 'size-16' : isLive ? 'size-[3vw]' : 'size-9',
              )}
            >
              <Image
                src={media}
                alt=""
                fill
                sizes="64px"
                className="object-contain p-1"
                unoptimized
              />
            </span>
          )}
          {wish.sticker &&
            (isEmoji(wish.sticker) ? (
              <span className={isPreview ? 'text-3xl' : isLive ? 'text-[2vw]' : 'text-xl'} aria-hidden>
                {wish.sticker}
              </span>
            ) : (
              <span className={cn('relative', isPreview ? 'size-9' : 'size-7')}>
                <Image src={wish.sticker} alt="" fill sizes="36px" className="object-contain" unoptimized />
              </span>
            ))}
        </div>
      )}

      <footer
        className={cn(
          'font-display italic text-[var(--ink-soft)]',
          isPreview && 'text-sm',
          isLive && 'text-[length:var(--live-meta,clamp(0.78rem,0.9vw,1.5rem))]',
          !isPreview && !isLive && 'text-[0.78rem]',
        )}
      >
        {wish.name ? `— ${wish.name}` : '— Anonymous'}
      </footer>
    </article>
  );
}

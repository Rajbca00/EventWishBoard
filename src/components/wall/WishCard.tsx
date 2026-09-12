'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PublicWish } from '@/lib/types';

interface Props {
  wish: Pick<PublicWish, 'message' | 'name' | 'stickers' | 'gifs' | 'memes' | 'selfieUrl'>;
  /** 'live' is the venue screen: sized to be read from across a room. */
  variant?: 'wall' | 'preview' | 'live';
  className?: string;
  style?: React.CSSProperties;
  /** Renders the media but skips the entry animation (used by the flying clone). */
  flat?: boolean;
  messageScale?: number;
  messageText?: string;
  /**
   * How a guest photo is shown on the venue board. A banner across the top
   * looks better, but on a small card it leaves room for about one line of the
   * wish, so the board asks for a face beside the author instead.
   */
  photoStyle?: 'banner' | 'avatar';
}

/** A sticker is stored either as an emoji or as an image URL. */
function isEmoji(value: string): boolean {
  return !value.startsWith('/') && !value.startsWith('http');
}

export function visibleWishDecorations(wish: Pick<PublicWish, 'stickers' | 'gifs' | 'memes'>) {
  return [...wish.gifs, ...wish.memes, ...wish.stickers].slice(0, 2);
}

export default function WishCard({
  wish,
  variant = 'wall',
  className,
  style,
  flat = false,
  photoStyle = 'banner',
  messageScale = 1,
  messageText,
}: Props) {
  const isPreview = variant === 'preview';
  const isLive = variant === 'live';
  const asAvatar = isLive && photoStyle === 'avatar' && Boolean(wish.selfieUrl);
  const displayMessage = messageText ?? wish.message;
  const visibleDecorations = visibleWishDecorations(wish);
  const media = visibleDecorations.filter((value) => value.startsWith('/') || value.startsWith('http'));
  const stickers = visibleDecorations.filter((value) => !value.startsWith('/') && !value.startsWith('http'));
  const compactDecorations = visibleDecorations.length <= 2;

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
        /*
         * The board measures the space and hands each card an exact box, so the
         * card fills it and clips nothing: `min-h-0` lets the message shrink
         * inside the flex column rather than pushing the author line out of the
         * bottom of the card, which is what used to happen on a long wish.
         */
        isLive && 'h-full w-full overflow-hidden p-[clamp(0.6rem,1vw,1.4rem)]',
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

      {wish.selfieUrl && !asAvatar && (
        <div
          className={cn(
            'relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/60',
            isPreview ? 'h-40' : !isLive && 'h-20',
          )}
          // Sized by the board so a photo never crowds out the message.
          style={isLive ? { height: 'var(--live-photo, 6rem)' } : undefined}
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
          // `overflow-wrap: anywhere` so one enormous unbroken word — a URL, a
          // row of exclamation marks — wraps inside the card instead of
          // pushing it wider than its cell.
          'font-display text-balance-pretty leading-snug text-[var(--ink)] [overflow-wrap:anywhere]',
          isPreview && 'text-[1.15rem]',
          isLive && 'min-h-0 flex-1 overflow-hidden leading-[1.38]',
          !isPreview && !isLive && 'line-clamp-3 text-[0.86rem]',
        )}
        // A long wish is trimmed with an ellipsis at whatever number of lines
        // the card can actually hold, rather than a fixed count that overflows
        // a short card and leaves a tall one half empty. No transform here: a
        // transformed text box is rasterised on its own layer, and on an
        // ordinary 1x monitor that is visibly softer.
        style={
          isLive
            ? {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 'var(--live-lines, 6)' as unknown as number,
                fontSize: `calc(var(--live-text, 1.25rem) * ${messageScale})`,
              }
            : undefined
        }
      >
        {displayMessage}
      </p>

      {(media.length > 0 || stickers.length > 0) && (
        <div className={cn('flex items-center gap-1.5', compactDecorations && 'flex-nowrap', !compactDecorations && 'flex-wrap', isLive && 'shrink-0')}>
          {media.map((src) => (
            <span
              key={src}
              className={cn(
                'relative shrink-0 overflow-hidden rounded-xl bg-[var(--tint)] ring-1 ring-[var(--card-line)]',
                isPreview ? 'size-16' : isLive ? 'size-[calc(var(--live-text,1.25rem)*2)]' : 'size-9',
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" unoptimized />
            </span>
          ))}
          {stickers.map((value) =>
            isEmoji(value) ? (
              <span
                key={value}
                className={cn(
                  'shrink-0 leading-none',
                  isPreview ? 'text-3xl' : isLive ? 'text-[length:calc(var(--live-text,1.25rem)*1.35)]' : 'text-xl',
                )}
                aria-hidden
              >
                {value}
              </span>
            ) : (
              <span
                key={value}
                className={cn(
                  'relative shrink-0',
                  isPreview ? 'size-9' : isLive ? 'size-[calc(var(--live-text,1.25rem)*1.6)]' : 'size-7',
                )}
              >
                <Image src={value} alt="" fill sizes="36px" className="object-contain" unoptimized />
              </span>
            ),
          )}
        </div>
      )}

      <footer
        className={cn(
          'font-display italic text-[var(--ink-soft)]',
          isPreview && 'text-sm',
          isLive && 'flex shrink-0 items-center gap-2 text-[length:var(--live-meta,0.9rem)]',
          !isPreview && !isLive && 'text-[0.78rem]',
        )}
      >
        {asAvatar && (
          <span
            className="relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/70"
            style={{ width: 'var(--live-photo, 2rem)', height: 'var(--live-photo, 2rem)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wish.selfieUrl!} alt="" className="size-full object-cover" loading="lazy" />
          </span>
        )}
        <span className={cn(isLive && 'truncate')}>
          {wish.name ? `— ${wish.name}` : '— Anonymous'}
        </span>
      </footer>
    </article>
  );
}

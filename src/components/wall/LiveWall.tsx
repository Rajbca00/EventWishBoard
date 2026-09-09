'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import WishCard from './WishCard';
import SceneBackground from './SceneBackground';
import { BrandGlyph } from '@/components/ui/BrandMark';
import { celebrate } from '@/lib/confetti';
import { usePrefersReducedMotion } from '@/lib/hooks';
import { seededRandom } from '@/lib/utils';
import type { Theme } from '@/lib/themes';
import type { PublicWish } from '@/lib/types';

interface Props {
  theme: Theme;
  eventId: string;
  hosts: string;
  guestUrl: string;
  initialWishes: PublicWish[];
  /** How often to look for new wishes, in seconds. */
  refreshSeconds?: number;
}

/** Slower columns read as further away, which stops the board feeling like a grid. */
const COLUMN_SPEEDS = [78, 96, 66, 88];

/**
 * The venue screen: a projector or TV showing wishes as they arrive.
 *
 * Two things make this different from the guest Wish Wall. It never stops
 * moving, because it is ambient — people glance at it across a room all
 * evening. And it must survive hours unattended, so the motion is CSS on the
 * compositor rather than JS animation, and polling replaces the whole list
 * instead of accumulating DOM.
 */
export default function LiveWall({
  theme,
  eventId,
  hosts,
  guestUrl,
  initialWishes,
  refreshSeconds = 30,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [wishes, setWishes] = useState<PublicWish[]>(initialWishes);
  const [arrivals, setArrivals] = useState<PublicWish[]>([]);
  const [columns, setColumns] = useState(3);
  const [qr, setQr] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const seen = useRef(new Set(initialWishes.map((wish) => wish.id)));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* -------------------------------------------------------------- QR code */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, guestUrl, {
      width: 512,
      margin: 1,
      color: { dark: '#4a2c33ff', light: '#ffffffff' },
    })
      .then(() => {
        canvas.removeAttribute('style');
        setQr(guestUrl);
      })
      .catch(() => setQr(null));
  }, [guestUrl]);

  /* -------------------------------------------------------------- polling */

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/wishes`, { cache: 'no-store' });
      if (!response.ok) {
        setOffline(true);
        return;
      }
      const data = (await response.json()) as { wall: PublicWish[] };
      setOffline(false);

      const fresh = data.wall.filter((wish) => !seen.current.has(wish.id));
      data.wall.forEach((wish) => seen.current.add(wish.id));

      setWishes(data.wall);
      if (fresh.length) {
        setArrivals(fresh.slice(-3));
        celebrate({ colors: theme.confetti, intensity: 'gentle', origin: { x: 0.5, y: 0.2 } });
      }
    } catch {
      // A venue's wifi will drop. Keep showing what we have and try again.
      setOffline(true);
    }
  }, [eventId, theme.confetti]);

  useEffect(() => {
    const timer = window.setInterval(refresh, refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshSeconds]);

  // Clear the "just arrived" banner a few seconds after it appears.
  useEffect(() => {
    if (!arrivals.length) return;
    const timer = window.setTimeout(() => setArrivals([]), 9000);
    return () => window.clearTimeout(timer);
  }, [arrivals]);

  /* -------------------------------------------------------------- layout */

  useEffect(() => {
    const measure = () =>
      setColumns(window.innerWidth >= 1600 ? 4 : window.innerWidth >= 1100 ? 3 : 2);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /**
   * Deal the wishes into columns, then repeat each column so the marquee can
   * loop by translating exactly half its height. Short walls are padded by
   * repeating, so a board with three wishes still fills a projector.
   */
  const lanes = useMemo(() => {
    if (!wishes.length) return [];

    const perColumn: PublicWish[][] = Array.from({ length: columns }, () => []);
    wishes.forEach((wish, index) => perColumn[index % columns]!.push(wish));

    return perColumn.map((lane, index) => {
      const filled = lane.length ? lane : wishes;

      /*
       * Build the ribbon in two steps. First pad it out so even a single wish
       * fills a tall column, then emit that block exactly twice.
       *
       * The doubling is what makes the loop seamless: the animation translates
       * the track by -50%, which lands precisely on the start of the second
       * copy. Repeating an odd number of times instead would stop halfway
       * through a block and visibly jump on every cycle.
       */
      const block = Array.from({ length: Math.max(1, Math.ceil(4 / filled.length)) }, () => filled).flat();
      const items = [...block, ...block];

      const random = seededRandom(`lane:${eventId}:${index}`);
      return {
        key: index,
        items,
        // Duration scales with the block so every column drifts at a similar pace.
        duration: COLUMN_SPEEDS[index % COLUMN_SPEEDS.length]! * (block.length / 4),
        delay: -random() * 40,
        reverse: index % 2 === 1,
      };
    });
  }, [wishes, columns, eventId]);

  return (
    <div className="relative isolate h-dvh w-screen overflow-hidden bg-[var(--bg-1)]">
      <SceneBackground theme={theme} intensity="full" seed={`live:${eventId}`} />

      {/* ------------------------------------------------------------ header */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-8 px-[3vw] py-[2.5vh]">
        <div>
          <p className="text-[1vw] uppercase tracking-[0.34em] text-[var(--ink-soft)]">
            {theme.emoji} Wishes for
          </p>
          <h1 className="mt-2 font-display text-[3.6vw] leading-none tracking-tight text-[var(--ink)]">
            {hosts}
          </h1>
          <p className="mt-3 text-[1.05vw] text-[var(--ink-soft)]">
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'} and counting
          </p>
        </div>

        <div className="flex items-center gap-[1.4vw] rounded-[1.4vw] bg-white/70 px-[1.4vw] py-[1.2vh] backdrop-blur-md">
          <canvas ref={canvasRef} className="size-[7vw] max-h-32 max-w-32 rounded-lg" aria-hidden />
          <div>
            <p className="font-display text-[1.5vw] leading-tight text-[var(--ink)]">
              Scan to add
              <br />
              your wish
            </p>
            {!qr && <p className="mt-1 text-[0.9vw] text-[var(--ink-soft)]">{guestUrl}</p>}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ the board */}
      <div
        className="absolute inset-0 z-10 grid gap-[1.6vw] px-[3vw]"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          // Leave room for the header and footer bands.
          paddingTop: '18vh',
          paddingBottom: '10vh',
        }}
      >
        {lanes.map((lane) => (
          <div key={lane.key} className="relative overflow-hidden">
            <div
              className={`marquee-track flex flex-col gap-[1.4vw] ${
                lane.reverse ? 'marquee-track--down' : ''
              }`}
              style={{
                animationDuration: `${lane.duration}s`,
                animationDelay: `${lane.delay}s`,
                animationPlayState: reducedMotion ? 'paused' : 'running',
              }}
            >
              {lane.items.map((wish, index) => (
                <div key={`${wish.id}-${index}`} className="shrink-0">
                  <WishCard
                    wish={wish}
                    variant="live"
                    className={arrivals.some((a) => a.id === wish.id) ? 'just-arrived' : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {lanes.length === 0 && (
          <div className="col-span-full flex items-center justify-center">
            <p className="font-display text-[2vw] text-[var(--ink-soft)]">
              The first wish will appear here ✨
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ arrivals */}
      {arrivals.length > 0 && (
        <div className="reveal absolute inset-x-0 bottom-[9vh] z-40 flex justify-center px-[3vw]">
          <p className="rounded-full bg-white/85 px-[2vw] py-[1.2vh] font-display text-[1.5vw] text-[var(--ink)] shadow-lg backdrop-blur">
            💌 New {arrivals.length === 1 ? 'wish' : 'wishes'} from{' '}
            {arrivals.map((wish) => wish.name ?? 'a guest').join(', ')}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------ footer */}
      <footer className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-[3vw] py-[2vh]">
        <p className="flex items-center gap-2 text-[0.95vw] uppercase tracking-[0.24em] text-[var(--ink-soft)]/80">
          <BrandGlyph size={16} className="opacity-70" />
          A Laya &amp; Bee experience
        </p>
        <p className="text-[0.9vw] text-[var(--ink-soft)]/70">
          {offline ? 'Reconnecting…' : `Updating every ${refreshSeconds}s`}
        </p>
      </footer>

      {/* Soft vignette so cards fade rather than clip at the edges */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'linear-gradient(to bottom, var(--bg-1) 0%, transparent 20%, transparent 88%, var(--bg-1) 100%)',
        }}
        aria-hidden
      />
    </div>
  );
}

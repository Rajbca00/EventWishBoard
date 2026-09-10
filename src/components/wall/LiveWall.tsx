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
  /**
   * Keep the board drifting even if the machine asks for reduced motion.
   * Defaults on: this is a display an operator set up, not a page someone
   * navigated to. ?motion=off turns it back off.
   */
  forceMotion?: boolean;
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
  forceMotion = true,
}: Props) {
  const prefersReduced = usePrefersReducedMotion();
  // A venue display is not someone's personal screen: if the laptop driving the
  // projector has reduced motion on for its owner's comfort, the board should
  // still be allowed to drift. ?motion=on makes that an explicit choice.
  const reducedMotion = prefersReduced && !forceMotion;
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
    // A phone gets one column. Two 86px-wide cards side by side broke every
    // message onto one word per line.
    const measure = () => {
      const w = window.innerWidth;
      setColumns(w >= 1600 ? 4 : w >= 1100 ? 3 : w >= 640 ? 2 : 1);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /*
   * Early in an evening there are only a handful of wishes, and padding them
   * out to fill a projector just prints the same message six times — it reads
   * as a bug, and it makes two real wishes look like filler. Below the point
   * where the columns can be filled honestly, the board switches to a showcase:
   * every wish shown once, larger, drifting gently.
   */
  const scrolling = wishes.length >= columns * 3;

  const lanes = useMemo(() => {
    if (!wishes.length || !scrolling) return [];

    const perColumn: PublicWish[][] = Array.from({ length: columns }, () => []);
    wishes.forEach((wish, index) => perColumn[index % columns]!.push(wish));

    return perColumn.map((lane, index) => {
      const filled = lane.length ? lane : wishes;

      /*
       * The track is the column's wishes emitted exactly twice. That doubling
       * is what makes the loop seamless: the animation translates by -50%,
       * landing precisely on the start of the second copy. An odd number of
       * repeats would stop mid-block and visibly jump every cycle.
       */
      const items = [...filled, ...filled];

      const random = seededRandom(`lane:${eventId}:${index}`);
      return {
        key: index,
        items,
        // Longer columns take proportionally longer, so every lane drifts at
        // roughly the same speed regardless of how much it holds.
        duration: COLUMN_SPEEDS[index % COLUMN_SPEEDS.length]! * (filled.length / 4),
        delay: -random() * 40,
        reverse: index % 2 === 1,
      };
    });
  }, [wishes, columns, eventId, scrolling]);

  /** Showcase layout: each wish once, gently floating on its own rhythm. */
  const showcase = useMemo(() => {
    if (!wishes.length || scrolling) return [];
    return wishes.map((wish, index) => {
      const random = seededRandom(`showcase:${eventId}:${wish.id}`);
      return {
        wish,
        delay: random() * 20,
        duration: 16 + random() * 12,
        tilt: (random() - 0.5) * 5,
        key: `${wish.id}-${index}`,
      };
    });
  }, [wishes, eventId, scrolling]);

  return (
    <div
      className={`relative isolate h-dvh w-screen overflow-hidden bg-[var(--bg-1)] ${
        forceMotion ? 'force-motion' : ''
      }`}
    >
      <SceneBackground theme={theme} intensity="full" seed={`live:${eventId}`} />

      {/* ------------------------------------------------------------ header */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-8 px-[3vw] py-[2.5vh]">
        <div>
          <p className="text-[length:clamp(0.6rem,1vw,1.15rem)] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
            {theme.emoji} Wishes for
          </p>
          <h1 className="mt-2 font-display text-[length:clamp(1.5rem,3.6vw,4.2rem)] leading-none tracking-tight text-[var(--ink)]">
            {hosts}
          </h1>
          <p className="mt-2 text-[length:clamp(0.78rem,1.05vw,1.4rem)] text-[var(--ink-soft)]">
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'} and counting
          </p>
        </div>

        <div className="flex items-center gap-[1.4vw] rounded-[1.4vw] bg-white/70 px-[1.4vw] py-[1.2vh] backdrop-blur-md">
          <canvas ref={canvasRef} className="size-[clamp(3.25rem,7vw,8rem)] rounded-lg" aria-hidden />
          <div>
            <p className="hidden font-display text-[length:clamp(0.8rem,1.5vw,2rem)] leading-tight text-[var(--ink)] sm:block">
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
        className={`absolute inset-0 z-10 px-[3vw] ${
          scrolling ? 'grid gap-[1.6vw]' : 'flex flex-wrap content-center items-center justify-center gap-[2vw]'
        }`}
        style={{
          // Showcase cards hold the whole screen between them, so their type
          // can be far larger than a scrolling column's.
          ['--live-text' as string]: scrolling
            ? 'clamp(0.95rem, 1.3vw, 2.1rem)'
            : 'clamp(1.05rem, 1.9vw, 3rem)',
          ['--live-meta' as string]: scrolling
            ? 'clamp(0.78rem, 0.95vw, 1.5rem)'
            : 'clamp(0.85rem, 1.2vw, 1.8rem)',
          gridTemplateColumns: scrolling ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
          // Leave room for the header and footer bands.
          paddingTop: 'clamp(8.5rem, 16vh, 13rem)',
          paddingBottom: '10vh',
        }}
      >
        {/* A handful of wishes: show each one once, larger, drifting. */}
        {showcase.map((entry) => (
          <div
            key={entry.key}
            className="wander"
            style={{
              ['--tilt' as string]: `${entry.tilt}deg`,
              ['--wander-duration' as string]: `${entry.duration}s`,
              animationDelay: `-${entry.delay}s`,
              /*
               * A rem floor keeps a card readable when vw is small. Sizing
               * purely in vw was tuned for a projector and collapsed to ~86px
               * on a phone, so every message wrapped one word per line. The
               * fewer wishes there are, the more room each gets.
               */
              width: `min(88vw, clamp(16rem, ${Math.max(20, 38 - showcase.length * 3)}vw, 30rem))`,
            }}
          >
            <WishCard
              wish={entry.wish}
              variant="live"
              className={arrivals.some((a) => a.id === entry.wish.id) ? 'just-arrived' : undefined}
            />
          </div>
        ))}

        {lanes.map((lane) => (
          <div key={lane.key} className="relative overflow-hidden">
            <div
              className={`marquee-track flex flex-col gap-[1.4vw] ${
                lane.reverse ? 'marquee-track--down' : ''
              }`}
              style={{
                ['--marquee-duration' as string]: `${lane.duration}s`,
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

        {wishes.length === 0 && (
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
          <p className="rounded-full bg-white/85 px-5 py-2.5 font-display text-[length:clamp(0.9rem,1.5vw,2rem)] text-[var(--ink)] shadow-lg backdrop-blur">
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

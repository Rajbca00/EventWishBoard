'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import WishCard from './WishCard';
import SceneBackground from './SceneBackground';
import { BrandGlyph } from '@/components/ui/BrandMark';
import { celebrate } from '@/lib/confetti';
import { usePrefersReducedMotion } from '@/lib/hooks';
import { seededRandom } from '@/lib/utils';
import { BOARD_LIMIT, boardWishes, fitBoard, type BoardLayout } from '@/lib/wall-layout';
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
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [qr, setQr] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const seen = useRef(new Set(initialWishes.map((wish) => wish.id)));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

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

  /*
   * The board shows the newest handful and nothing else. Older wishes are not
   * lost — they are in the dashboard, the memory book and the archive — but a
   * screen across a room can only hold so many before each one is too small to
   * read, and a marquee that scrolls them past means a guest who walks up has
   * to wait to see their own.
   */
  const visible = useMemo(() => boardWishes(wishes, BOARD_LIMIT), [wishes]);

  /*
   * Measure the space the cards actually have rather than guessing it in vw.
   * A projector, a 65" TV and a laptop all land here with different aspect
   * ratios, and the previous vw-based sizing clipped cards off the bottom of
   * anything that was not roughly 16:9.
   */
  const remember = useCallback((width: number, height: number) => {
    setSpace((previous) =>
      Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1
        ? previous
        : { width, height },
    );
  }, []);

  /*
   * Measured as soon as the element exists, rather than waiting for the first
   * ResizeObserver callback. The observer is the right tool for a projector
   * being re-plugged or a window being dragged between screens, but its first
   * delivery is tied to the rendering loop — and a board that shows nothing
   * until that arrives is a blank screen at a wedding.
   */
  const attachBoard = useCallback(
    (element: HTMLDivElement | null) => {
      boardRef.current = element;
      if (!element) return;
      const box = element.getBoundingClientRect();
      remember(box.width, box.height);
    },
    [remember],
  );

  useEffect(() => {
    const element = boardRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) remember(box.width, box.height);
    });
    observer.observe(element);

    const measure = () => {
      const now = element.getBoundingClientRect();
      remember(now.width, now.height);
    };

    /*
     * Measure again now that layout has settled. The ref callback runs during
     * commit, when the flex row heights above this element are not final, so
     * its reading can be short — and a board that believes it has half the room
     * it really has lays fifteen wishes out as a strip of tiny cards. The
     * retries cover browsers where the observer's first delivery is late.
     */
    measure();
    const retries = [0, 200, 800].map((delay) => window.setTimeout(measure, delay));
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      retries.forEach(window.clearTimeout);
      window.removeEventListener('resize', measure);
    };
  }, [remember]);

  const layout: BoardLayout = useMemo(
    () => fitBoard({ width: space.width, height: space.height, count: visible.length }),
    [space.width, space.height, visible.length],
  );

  /** A slow, small drift so the board is alive without anything leaving its cell. */
  const drifts = useMemo(
    () =>
      visible.map((wish) => {
        const random = seededRandom(`board:${eventId}:${wish.id}`);
        return {
          duration: 18 + random() * 14,
          delay: -random() * 20,
          tilt: (random() - 0.5) * 2.4,
        };
      }),
    [visible, eventId],
  );

  return (
    <div
      className={`relative isolate flex h-dvh w-screen flex-col overflow-hidden bg-[var(--bg-1)] ${
        forceMotion ? 'force-motion' : ''
      }`}
    >
      <SceneBackground theme={theme} intensity="full" seed={`live:${eventId}`} />

      {/* ------------------------------------------------------------ header */}
      <header className="relative z-30 flex shrink-0 items-start justify-between gap-8 px-[3vw] py-[2vh]">
        <div>
          <p className="text-[length:clamp(0.6rem,1vw,1.15rem)] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
            {theme.emoji} Wishes for
          </p>
          <h1 className="mt-2 font-display text-[length:clamp(1.5rem,3.6vw,4.2rem)] leading-none tracking-tight text-[var(--ink)]">
            {hosts}
          </h1>
          <p className="mt-2 text-[length:clamp(0.78rem,1.05vw,1.4rem)] text-[var(--ink-soft)]">
            {wishes.length} {wishes.length === 1 ? 'wish' : 'wishes'} and counting
            {wishes.length > BOARD_LIMIT && (
              <span className="opacity-70"> · showing the latest {BOARD_LIMIT}</span>
            )}
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
      {/*
        * The padding is the safe area: the header band at the top and the
        * footer band at the bottom. Cards are laid out inside what is left, so
        * one can never slide under the title or off the bottom edge.
        */}
      <div className="relative z-10 min-h-0 flex-1 px-[3vw] pb-[1vh]">
        <div ref={attachBoard} className="relative h-full w-full">
        {visible.length > 0 && layout.rows > 0 && (
          <div
            className="grid h-full w-full place-items-center"
            style={{
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
              gap: `${layout.gap}px`,
              // Every card reads off these, so the whole board scales together.
              ['--live-text' as string]: `${layout.messagePx}px`,
              ['--live-meta' as string]: `${layout.metaPx}px`,
              ['--live-photo' as string]: `${layout.photoPx}px`,
            }}
          >
            {visible.map((wish, index) => {
              const drift = drifts[index]!;
              return (
                <div
                  key={wish.id}
                  className="wander flex items-center justify-center"
                  style={{
                    width: layout.cardWidth,
                    height: layout.cardHeight,
                    ['--live-lines' as string]: String(
                      wish.selfieUrl ? layout.linesWithPhoto : layout.lines,
                    ),
                    ['--tilt' as string]: `${drift.tilt}deg`,
                    ['--wander-duration' as string]: `${drift.duration}s`,
                    // A small fraction of the full drift, so a card breathes
                    // in place instead of wandering out of its cell.
                    ['--drift' as string]: '0.35',
                    animationDelay: `${drift.delay}s`,
                    animationPlayState: reducedMotion ? 'paused' : 'running',
                  }}
                >
                  <WishCard
                    wish={wish}
                    variant="live"
                    photoStyle={layout.photoStyle}
                    className={arrivals.some((a) => a.id === wish.id) ? 'just-arrived' : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}

        {wishes.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="font-display text-[length:clamp(1.1rem,2vw,2.6rem)] text-[var(--ink-soft)]">
              The first wish will appear here ✨
            </p>
          </div>
        )}
        </div>
      </div>

      {/* ------------------------------------------------------------ arrivals */}
      {arrivals.length > 0 && (
        <div className="reveal pointer-events-none absolute inset-x-0 bottom-[7vh] z-40 flex justify-center px-[3vw]">
          <p className="rounded-full bg-white/85 px-5 py-2.5 font-display text-[length:clamp(0.9rem,1.5vw,2rem)] text-[var(--ink)] shadow-lg backdrop-blur">
            💌 New {arrivals.length === 1 ? 'wish' : 'wishes'} from{' '}
            {arrivals.map((wish) => wish.name ?? 'a guest').join(', ')}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------ footer */}
      <footer className="relative z-30 flex shrink-0 items-center justify-between px-[3vw] py-[1.4vh]">
        <p className="flex items-center gap-2 text-[0.95vw] uppercase tracking-[0.24em] text-[var(--ink-soft)]/80">
          <BrandGlyph size={16} className="opacity-70" />
          A Laya &amp; Bee experience
        </p>
        <p className="text-[0.9vw] text-[var(--ink-soft)]/70">
          {offline ? 'Reconnecting…' : `Updating every ${refreshSeconds}s`}
        </p>
      </footer>

      {/*
        * No vignette any more. It existed to fade cards that were being clipped
        * by the top and bottom edges; the board now fits inside its safe area,
        * so the only thing a vignette did was dim the first and last rows.
        */}
    </div>
  );
}

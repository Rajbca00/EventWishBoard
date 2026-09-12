'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import QRCode from 'qrcode';
import WishCard, { visibleWishDecorations } from './WishCard';
import SpotlightWish from './SpotlightWish';
import SceneBackground from './SceneBackground';
import { BrandGlyph } from '@/components/ui/BrandMark';
import { celebrate } from '@/lib/confetti';
import { usePrefersReducedMotion } from '@/lib/hooks';
import { cn, formatPhone } from '@/lib/utils';
import { BRAND } from '@/lib/env';
import {
  BOARD_LIMIT,
  fitBoard,
  messageBudgetFor,
  readableCapacity,
  truncateMessage,
} from '@/lib/wall-layout';
import { dwellFor, initRotation, rotationReducer, spotlightTier } from '@/lib/live-rotation';
import type { Theme } from '@/lib/themes';
import type { PublicWish, ThemeId } from '@/lib/types';

export type QrMode = 'full' | 'compact' | 'hidden';

interface Props {
  theme: Theme;
  eventId: string;
  hosts: string;
  guestUrl: string;
  initialWishes: PublicWish[];
  /** How many of the newest wishes the screen rotates through. */
  displayLimit?: number;
  /** How often to look for new wishes, in seconds. */
  refreshSeconds?: number;
  /**
   * Keep the screen moving even if the machine asks for reduced motion.
   * Defaults on: this is a display an operator set up, not a page someone
   * navigated to. ?motion=off turns it back off.
   */
  forceMotion?: boolean;
  /** ?qr=small shrinks the code; ?qr=off hides it when the table has its own. */
  qrMode?: QrMode;
  /** ?debug=1 shows counts, timings and layout for setting the screen up. */
  debug?: boolean;
}

const SUBTITLES: Record<ThemeId, string> = {
  wedding: 'Our Wedding Wish Wall',
  engagement: 'Our Engagement Wish Wall',
  birthday: 'Birthday Wish Wall',
  celebration: 'Celebration Wish Wall',
  // A colour scheme rather than an occasion, so it says nothing it cannot know.
  chocolate: 'Our Wish Wall',
};

const QR_ORDER: QrMode[] = ['full', 'compact', 'hidden'];

/** Side-wall cards are sized as though there were at least this many. */
const SIDE_MIN_CELLS = 4;
/**
 * A card's decoration row is about two lines of its message tall — a chip is
 * twice the type size. Without reserving it, a long decorated wish was clamped
 * for a box it no longer had and cut mid-line with no ellipsis.
 */
const DECORATION_LINES = 2;
const SIDE_MAX = 12;

/*
 * Screen-relative sizes, in px, for the numbers the layout arithmetic needs.
 * The smallest side-wall type is 2.2% of the screen height: about 24px on a
 * 1080p panel, which is comfortable on a 27" monitor from four or five feet.
 */
const sideFloor = (viewportHeight: number) => Math.round(Math.min(40, Math.max(18, viewportHeight * 0.022)));
const sideGap = (viewportHeight: number) => Math.round(Math.min(36, Math.max(12, viewportHeight * 0.02)));
/** Matches the live card's `p-[clamp(0.6rem,1vw,1.4rem)]`. */
const cardPadding = (viewportWidth: number) => Math.min(22.4, Math.max(9.6, viewportWidth * 0.01));

function InstagramGlyph() {
  return (
    <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 3.5h3.2l1.6 4.2-2.1 1.3a11 11 0 0 0 7.3 7.3l1.3-2.1 4.2 1.6V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.1 1.5 1.5 0 0 1 5 3.5Z" />
    </svg>
  );
}

function toggleFullscreen() {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
  } else {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

/**
 * The reception screen: a monitor by the dessert table showing wishes as they
 * arrive.
 *
 * One wish at a time in the spotlight, large enough to read from a few feet
 * away, beside a wall of recent ones. It runs for hours unattended, so every
 * moving part is CSS on the compositor, the text itself never moves (moving
 * text on an ordinary 1x monitor is visibly soft), and polling replaces the
 * list rather than accumulating DOM.
 *
 * For whoever sets it up: F toggles fullscreen, Q cycles the QR code between
 * large, small and hidden, D shows the setup details, → skips to the next wish.
 * Hints appear only while the mouse is moving, and the cursor hides itself.
 */
export default function LiveWall({
  theme,
  eventId,
  hosts,
  guestUrl,
  initialWishes,
  displayLimit = BOARD_LIMIT,
  refreshSeconds = 30,
  forceMotion = true,
  qrMode: initialQrMode = 'full',
  debug = false,
}: Props) {
  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion = prefersReduced && !forceMotion;

  const [wishes, setWishes] = useState<PublicWish[]>(initialWishes);
  const [rotation, dispatch] = useReducer(rotationReducer, undefined, () =>
    initRotation(initialWishes, displayLimit),
  );
  const [side, setSide] = useState({ width: 0, height: 0, viewportWidth: 1920, viewportHeight: 1080, dpr: 1 });
  const [qrReady, setQrReady] = useState(false);
  const [qrMode, setQrMode] = useState<QrMode>(initialQrMode);
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(debug);
  const [pointerActive, setPointerActive] = useState(false);

  const seen = useRef(new Set(initialWishes.map((wish) => wish.id)));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sideRef = useRef<HTMLDivElement | null>(null);

  /* -------------------------------------------------------------- QR code */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, guestUrl, {
      width: 512,
      margin: 1,
      // Always dark on white, whatever the theme: the dark theme's cream ink
      // would make a code that does not scan.
      color: { dark: '#2a1810ff', light: '#ffffffff' },
    })
      .then(() => {
        canvas.removeAttribute('style');
        setQrReady(true);
      })
      .catch(() => setQrReady(false));
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
      setLastSync(Date.now());

      const fresh = data.wall.filter((wish) => !seen.current.has(wish.id));
      data.wall.forEach((wish) => seen.current.add(wish.id));

      setWishes(data.wall);
      dispatch({ type: 'sync', wishes: data.wall, limit: displayLimit });
      if (fresh.length) {
        celebrate({ colors: theme.confetti, intensity: 'gentle', origin: { x: 0.36, y: 0.35 } });
      }
    } catch {
      // A venue's wifi will drop. Keep showing what we have and try again.
      setOffline(true);
    }
  }, [eventId, theme.confetti, displayLimit]);

  useEffect(() => {
    const timer = window.setInterval(refresh, refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshSeconds]);

  /* -------------------------------------------------------------- spotlight */

  const byId = useMemo(() => new Map(rotation.pool.map((wish) => [wish.id, wish])), [rotation.pool]);
  const spotlight = rotation.spotlightId ? (byId.get(rotation.spotlightId) ?? null) : null;
  const previous = rotation.previousId ? (byId.get(rotation.previousId) ?? null) : null;
  const justArrived = spotlight ? rotation.fresh.includes(spotlight.id) : false;
  const dwell = spotlight ? dwellFor(spotlight, justArrived) : 0;

  useEffect(() => {
    if (!rotation.spotlightId || rotation.pool.length < 2) return;
    const timer = window.setTimeout(() => dispatch({ type: 'advance' }), dwell);
    return () => window.clearTimeout(timer);
  }, [rotation.spotlightId, rotation.turn, rotation.pool.length, dwell]);

  /* -------------------------------------------------------------- side wall */

  /*
   * Measure the space the side wall actually has, and from it how many cards
   * fit while every one stays readable. The capacity goes to the rotation,
   * which keeps each card in the tile it already had.
   */
  const remember = useCallback((width: number, height: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    setSide((current) =>
      Math.abs(current.width - width) < 1 &&
      Math.abs(current.height - height) < 1 &&
      current.viewportWidth === viewportWidth &&
      current.viewportHeight === viewportHeight
        ? current
        : { width, height, viewportWidth, viewportHeight, dpr },
    );
    dispatch({
      type: 'capacity',
      capacity: readableCapacity({
        width,
        height,
        floorPx: sideFloor(viewportHeight),
        max: SIDE_MAX,
        minCells: SIDE_MIN_CELLS,
        gap: sideGap(viewportHeight),
      }),
    });
  }, []);

  const attachSide = useCallback(
    (element: HTMLDivElement | null) => {
      sideRef.current = element;
      if (!element) return;
      const box = element.getBoundingClientRect();
      remember(box.width, box.height);
    },
    [remember],
  );

  useEffect(() => {
    const element = sideRef.current;
    if (!element) return;

    const measure = () => {
      const box = element.getBoundingClientRect();
      remember(box.width, box.height);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    // The ref callback measures during commit, before the rows above have
    // settled; measure again once they have, and on every resize after.
    measure();
    const retries = [0, 200, 800].map((delay) => window.setTimeout(measure, delay));
    window.addEventListener('resize', measure);
    document.addEventListener('fullscreenchange', measure);

    return () => {
      observer.disconnect();
      retries.forEach(window.clearTimeout);
      window.removeEventListener('resize', measure);
      document.removeEventListener('fullscreenchange', measure);
    };
  }, [remember]);

  const gap = sideGap(side.viewportHeight);
  const sideLayout = useMemo(
    () =>
      fitBoard({
        width: side.width,
        height: side.height,
        count: Math.max(rotation.slots.length, SIDE_MIN_CELLS),
        gap,
      }),
    [side.width, side.height, rotation.slots.length, gap],
  );
  const sideColumns = Math.min(sideLayout.columns, Math.max(1, rotation.slots.length));
  const padding = cardPadding(side.viewportWidth);
  const showInvitation = rotation.pool.length <= 1;

  /* -------------------------------------------------------------- kiosk */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'f') toggleFullscreen();
      else if (key === 'q') setQrMode((mode) => QR_ORDER[(QR_ORDER.indexOf(mode) + 1) % QR_ORDER.length]!);
      else if (key === 'd') setShowDebug((value) => !value);
      else if (key === 'arrowright' || key === ' ') {
        event.preventDefault();
        dispatch({ type: 'advance' });
      }
    };

    // The cursor and the setup hints only exist while someone is using the mouse.
    let idle: number | undefined;
    const onMove = () => {
      setPointerActive(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setPointerActive(false), 2500);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('dblclick', toggleFullscreen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('dblclick', toggleFullscreen);
      window.clearTimeout(idle);
    };
  }, []);

  /* -------------------------------------------------------------- render */

  const qrVisible = qrMode !== 'hidden';
  // Long names step down so the couple never wraps into a third line.
  const nameSize = `clamp(2rem, min(4.9vw, 8.8vh, ${(118 / Math.max(18, hosts.length)).toFixed(2)}vw), 7.5rem)`;
  const qrSize = qrMode === 'compact' ? 'clamp(4.25rem, 9.5vh, 8rem)' : 'clamp(6rem, 17vh, 15rem)';

  return (
    <div
      className={cn(
        'fixed inset-0 isolate flex flex-col overflow-hidden bg-[var(--bg-1)] font-body',
        'px-[clamp(1.25rem,3.2vw,4.5rem)] pb-[clamp(0.6rem,1.9vh,2rem)] pt-[clamp(1rem,3.4vh,3rem)]',
        forceMotion && 'force-motion',
        !pointerActive && 'cursor-none',
      )}
      style={{
        /*
         * The bundled emoji font sits after each text face and before the
         * system's: text still comes from Playfair and Jakarta, and an emoji
         * the display machine cannot draw comes from Noto instead of a box.
         */
        ['--font-display' as string]: 'var(--font-playfair), var(--font-noto-emoji), Georgia, serif',
        ['--font-body' as string]:
          'var(--font-jakarta), var(--font-noto-emoji), ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <SceneBackground theme={theme} intensity="full" seed={`live:${eventId}`} forceMotion={forceMotion} />

      {/* ------------------------------------------------------------ header */}
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-[3vw]">
        <div className="min-w-0">
          <h1
            className="line-clamp-2 font-display font-medium leading-[1.04] tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontSize: nameSize, textWrap: 'balance' }}
          >
            {hosts}
          </h1>
          <p
            className="mt-[clamp(0.45rem,1.3vh,1.1rem)] flex items-center gap-[0.9em] font-body font-medium uppercase tracking-[0.34em] text-[var(--ink-soft)]"
            style={{ fontSize: 'clamp(0.72rem, min(1.02vw, 1.85vh), 1.45rem)' }}
          >
            <span className="h-px w-[3em] bg-[var(--gold)]" aria-hidden />
            {SUBTITLES[theme.id] ?? 'Wish Wall'}
            <svg width="0.7em" height="0.7em" viewBox="0 0 10 10" className="text-[var(--gold)]" fill="currentColor" aria-hidden>
              <path d="M5 0 10 5 5 10 0 5Z" />
            </svg>
          </p>
        </div>

        <div
          hidden={!qrVisible}
          className="flex shrink-0 items-center gap-[clamp(0.75rem,1.3vw,1.6rem)] rounded-[clamp(1rem,1.4vw,1.9rem)] border border-[var(--card-line)] bg-[var(--card-solid)] p-[clamp(0.55rem,1vw,1.3rem)] pr-[clamp(0.9rem,1.6vw,2rem)] shadow-[0_24px_60px_-38px_rgb(63_34_15/0.55)]"
        >
          {/* Sized by this wrapper, not the canvas: the QR library writes an
              inline size onto the canvas, and the effect above strips it, so
              an inline size there left the code at its full 512px. */}
          <span className="block shrink-0" style={{ width: qrSize, height: qrSize }}>
            <canvas
              ref={canvasRef}
              className="block size-full rounded-[0.55rem] [image-rendering:pixelated]"
              aria-label="QR code to leave a wish"
              role="img"
            />
          </span>
          <p
            className="font-display leading-[1.2] text-[var(--ink)]"
            style={{
              fontSize:
                qrMode === 'compact'
                  ? 'clamp(0.85rem, min(1.05vw, 1.9vh), 1.5rem)'
                  : 'clamp(1rem, min(1.45vw, 2.6vh), 2.2rem)',
            }}
          >
            Scan to leave
            <br />
            your wish <span aria-hidden>✨</span>
            {!qrReady && (
              <span className="mt-1 block font-body text-[0.5em] text-[var(--ink-soft)]">{guestUrl}</span>
            )}
          </p>
        </div>
      </header>

      {/* ------------------------------------------------------------ stage */}
      <main
        className="live-stage relative z-10 mt-[clamp(0.75rem,2.8vh,2.5rem)] min-h-0 flex-1"
        style={{ gap: 'clamp(1rem, 1.9vw, 2.75rem)' }}
      >
        <SpotlightWish
          current={spotlight}
          previous={reducedMotion ? null : previous}
          justArrived={justArrived}
          emptyTitle="Your wishes will appear here"
          emptyHint={qrVisible ? 'Scan the code to leave the very first one ✨' : 'Leave the very first one ✨'}
        />

        <div ref={attachSide} className="relative min-h-0">
          {showInvitation ? (
            <div className="flex h-full items-center justify-center">
              <div
                className="live-tile-in flex max-w-[34rem] flex-col items-center gap-[clamp(0.6rem,1.6vh,1.25rem)] rounded-[clamp(1rem,1.6vw,2rem)] border border-dashed border-[var(--gold)]/55 bg-[var(--card-solid)]/75 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(1.25rem,4vh,3.5rem)] text-center"
              >
                <svg width="1.1em" height="1.1em" viewBox="0 0 10 10" className="text-[var(--gold)]" fill="currentColor" style={{ fontSize: 'clamp(0.9rem,1.2vw,1.5rem)' }} aria-hidden>
                  <path d="M5 0 10 5 5 10 0 5Z" />
                </svg>
                <p className="font-display text-[var(--ink)]" style={{ fontSize: 'clamp(1.3rem, min(2.1vw, 3.8vh), 3rem)', lineHeight: 1.2 }}>
                  Leave a wish for {theme.id === 'wedding' ? 'the happy couple' : hosts}
                </p>
                <p className="font-display italic text-[var(--ink-soft)]" style={{ fontSize: 'clamp(0.95rem, min(1.3vw, 2.4vh), 1.9rem)', lineHeight: 1.35 }}>
                  {qrVisible ? 'Scan the code above' : 'Scan the QR code nearby'} — your message will appear here in
                  moments.
                </p>
              </div>
            </div>
          ) : (
            sideLayout.rows > 0 && (
              <div className="flex h-full w-full items-center justify-center">
                <div
                  className="flex flex-wrap content-center justify-center"
                  style={{
                    gap,
                    maxWidth: sideColumns * sideLayout.cardWidth + (sideColumns - 1) * gap,
                    // Every card reads off these, so the whole wall shares one type size.
                    ['--live-text' as string]: `${sideLayout.messagePx}px`,
                    ['--live-meta' as string]: `${sideLayout.metaPx}px`,
                    ['--live-photo' as string]: `${sideLayout.photoPx}px`,
                  }}
                >
                  {rotation.slots.map((id, index) => {
                    const wish = byId.get(id);
                    if (!wish) return null;
                    const hasPhoto = Boolean(wish.selfieUrl);
                    const reserved = visibleWishDecorations(wish).length ? DECORATION_LINES : 0;
                    const lines = Math.max(
                      1,
                      (hasPhoto ? sideLayout.linesWithPhoto : sideLayout.lines) - reserved,
                    );
                    return (
                      // The tile is keyed by position, the card by wish: a
                      // change of wish fades the new card in without moving
                      // any of the others.
                      <div
                        key={`slot-${index}`}
                        style={{
                          width: sideLayout.cardWidth,
                          height: sideLayout.cardHeight,
                          ['--live-lines' as string]: String(lines),
                        }}
                      >
                        <WishCard
                          key={wish.id}
                          wish={wish}
                          variant="live"
                          photoStyle={sideLayout.photoStyle}
                          messageText={truncateMessage(
                            wish.message,
                            messageBudgetFor(sideLayout, hasPhoto, padding, reserved),
                          )}
                          className="live-tile-in"
                          style={{ ['--tile-delay' as string]: `${Math.min(index, 8) * 90}ms` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </main>

      {/* ------------------------------------------------------------ footer */}
      {/* Laya & Bee's own line. Quiet next to the wishes, but large enough to
          read and copy down from the dessert table — a guest who loved the
          cake will want to know where it came from. */}
      <footer
        className="relative z-30 flex shrink-0 flex-wrap items-center justify-center gap-x-[1.3em] gap-y-1 pt-[clamp(0.5rem,1.5vh,1.25rem)] font-body text-[var(--ink-soft)]"
        style={{ fontSize: 'clamp(0.78rem, min(0.92vw, 1.65vh), 1.35rem)' }}
      >
        <span className="flex items-center gap-[0.6em] uppercase tracking-[0.24em]" style={{ fontSize: '0.74em' }}>
          <BrandGlyph size={16} className="opacity-80" />A Laya &amp; Bee experience
        </span>
        <svg width="0.5em" height="0.5em" viewBox="0 0 10 10" className="text-[var(--gold)]" fill="currentColor" aria-hidden>
          <path d="M5 0 10 5 5 10 0 5Z" />
        </svg>
        <span className="flex items-center gap-[0.45em] font-medium text-[var(--ink)]">
          <InstagramGlyph />
          <span>
            <span className="sr-only">Instagram </span>@{BRAND.instagramHandle}
          </span>
        </span>
        <span className="flex items-center gap-[0.45em] font-medium tabular-nums text-[var(--ink)]">
          <PhoneGlyph />
          <span>
            <span className="sr-only">Phone </span>
            {formatPhone(BRAND.phone)}
          </span>
        </span>
      </footer>

      {/* ------------------------------------------------------------ setup */}
      {pointerActive && !showDebug && (
        <p className="reveal pointer-events-none fixed bottom-3 right-4 z-50 rounded-full bg-[var(--ink)]/80 px-3.5 py-1.5 font-body text-[12px] tracking-wide text-white">
          F fullscreen · Q QR code · D details · → next wish
        </p>
      )}

      {showDebug && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-lg bg-black/75 px-3 py-2 font-mono text-[12px] leading-5 text-white">
          <p>
            wishes {wishes.length} · rotating {rotation.pool.length}/{displayLimit} · wall{' '}
            {rotation.slots.length}/{rotation.capacity}
          </p>
          <p>
            spotlight {spotlight ? rotation.pool.indexOf(spotlight) + 1 : 0}/{rotation.pool.length} · size{' '}
            {spotlight ? spotlightTier(spotlight.message, Boolean(spotlight.selfieUrl)) : '-'} · {dwell / 1000}s
            {justArrived ? ' · new' : ''}
          </p>
          <p>
            wall {sideColumns}×{Math.ceil(rotation.slots.length / Math.max(1, sideColumns))} · card{' '}
            {sideLayout.cardWidth}×{sideLayout.cardHeight} · {sideLayout.messagePx}px (min{' '}
            {sideFloor(side.viewportHeight)}) · {sideLayout.photoStyle}
          </p>
          <p>
            poll {refreshSeconds}s · {offline ? 'OFFLINE' : 'online'} · last{' '}
            {lastSync ? new Date(lastSync).toLocaleTimeString() : 'not yet'}
          </p>
          <p>
            screen {side.viewportWidth}×{side.viewportHeight} @{side.dpr}x · qr {qrMode} · motion{' '}
            {reducedMotion ? 'reduced' : 'on'}
          </p>
          <p className="text-white/60">F fullscreen · Q QR code · D details · → next wish</p>
        </div>
      )}
    </div>
  );
}

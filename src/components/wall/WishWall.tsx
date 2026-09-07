'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import SceneBackground from './SceneBackground';
import WishCard from './WishCard';
import { celebrate } from '@/lib/confetti';
import { useDeviceCapability, useParallax } from '@/lib/hooks';
import { clamp, seededRandom } from '@/lib/utils';
import type { Theme } from '@/lib/themes';
import type { PublicWish } from '@/lib/types';

interface Props {
  theme: Theme;
  wishes: PublicWish[];
  /** The wish just submitted — it flies in and joins the wall. */
  incoming?: PublicWish | null;
  onSettled?: () => void;
  /** Shown when the guest revisits the wall after the thank-you screen. */
  onClose?: () => void;
  className?: string;
}

interface Slot {
  left: number;
  top: number;
  rotate: number;
  depth: number;
  scale: number;
  duration: number;
  delay: number;
}

const MOBILE_SLOTS = 6;
const DESKTOP_SLOTS = 11;

/** Cards are sized in vw, so the scatter has to reserve room for their width. */
const CARD_WIDTH_PCT: Record<number, number> = { 2: 44, 3: 30, 4: 23 };

/**
 * Builds an organic scatter.
 *
 * Cards are laid on jittered column centres rather than free coordinates, and
 * every slot is clamped so that half a card width always fits inside the
 * viewport — on a 375px phone an unclamped scatter slices cards off both edges.
 * Rotation, scale and translateZ then stop it reading as a grid.
 */
function buildSlots(count: number, columns: number, seed: string): Slot[] {
  const random = seededRandom(seed);
  const rows = Math.max(1, Math.ceil(count / columns));

  const cardHalf = (CARD_WIDTH_PCT[columns] ?? 30) / 2;
  const minLeft = cardHalf + 2;
  const maxLeft = 98 - cardHalf;

  // Keep clear of the header and the closing caption at the bottom.
  const topStart = 13;
  const topEnd = 78;
  const rowHeight = (topEnd - topStart) / rows;

  return Array.from({ length: count }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const depth = random();

    // Spread the columns across the full usable width. Dividing by `columns`
    // instead of `columns - 1` bunches them toward the middle and the cards
    // end up overlapping each other.
    const columnCentre =
      columns === 1 ? 50 : minLeft + ((maxLeft - minLeft) * col) / (columns - 1);
    const jitterX = (random() - 0.5) * 3;

    return {
      left: clamp(columnCentre + jitterX, minLeft, maxLeft),
      top: topStart + rowHeight * row + rowHeight * (0.25 + random() * 0.5),
      rotate: (random() - 0.5) * 7,
      depth,
      // Never scale above 1: a scaled-up card would breach the clamp above.
      scale: 0.86 + depth * 0.14,
      duration: 6 + random() * 5,
      delay: random() * 4,
    };
  });
}

export default function WishWall({ theme, wishes, incoming, onSettled, onClose, className }: Props) {
  const { rich, reducedMotion } = useDeviceCapability();
  const parallax = useParallax(!reducedMotion);

  const sceneRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const [columns, setColumns] = useState(2);
  const [flight, setFlight] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [landed, setLanded] = useState(!incoming);
  const [caption, setCaption] = useState(false);

  useEffect(() => {
    const measure = () => setColumns(window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 3 : 2);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The wall shows the most recent wishes, with the new arrival always last.
  const visible = useMemo(() => {
    const capacity = columns >= 3 ? DESKTOP_SLOTS : MOBILE_SLOTS;
    const existing = wishes.filter((wish) => wish.id !== incoming?.id);
    const trimmed = existing.slice(Math.max(0, existing.length - (capacity - (incoming ? 1 : 0))));
    return incoming ? [...trimmed, incoming] : trimmed;
  }, [wishes, incoming, columns]);

  const slots = useMemo(
    () => buildSlots(visible.length, columns, `wall:${theme.id}:${columns}:${visible.length}`),
    [visible.length, columns, theme.id],
  );

  const incomingIndex = incoming ? visible.length - 1 : -1;

  /**
   * Measures where the new card will live, then starts the flying clone from
   * the centre of the screen. Measuring rather than guessing means the card
   * lands exactly in its slot on any screen size.
   */
  useLayoutEffect(() => {
    // With reduced motion there is no flight to prepare — the landing effect
    // below settles the card immediately instead.
    if (!incoming || reducedMotion || !targetRef.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    setFlight({
      x: targetX - startX,
      y: targetY - startY,
      scale: (rect.width || 248) / 320,
    });
  }, [incoming, reducedMotion]);

  const handleLanded = useCallback(() => {
    setLanded((already) => {
      if (already) return already;
      celebrate({ colors: theme.confetti });
      window.setTimeout(() => {
        setCaption(true);
        onSettled?.();
      }, 420);
      return true;
    });
  }, [theme.confetti, onSettled]);

  /**
   * Lands the card without the flight in two cases: the guest asked for
   * reduced motion, or the animation never reported completion. The latter
   * matters because a backgrounded tab starves requestAnimationFrame, and
   * phones background tabs constantly — without this the guest would be left
   * staring at a wall that is missing their own wish.
   */
  useEffect(() => {
    if (!incoming || landed) return;
    const timer = window.setTimeout(handleLanded, reducedMotion ? 0 : 3200);
    return () => window.clearTimeout(timer);
  }, [incoming, landed, reducedMotion, handleLanded]);

  return (
    <div className={`relative isolate min-h-[100dvh] w-full overflow-hidden ${className ?? ''}`}>
      <SceneBackground theme={theme} intensity="full" seed="wish-wall" />

      {/* The 3D stage */}
      <div
        ref={sceneRef}
        className="scene-3d relative z-10 h-[100dvh] w-full"
        style={{
          transform: `rotateX(${parallax.y * -2.2}deg) rotateY(${parallax.x * 2.6}deg)`,
          transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {visible.map((wish, index) => {
          const slot = slots[index];
          if (!slot) return null;
          const isIncoming = index === incomingIndex;

          return (
            <div
              key={wish.id}
              ref={isIncoming ? targetRef : undefined}
              className="absolute"
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                zIndex: Math.round(slot.depth * 10) + (isIncoming ? 40 : 0),
                transform: `translate3d(calc(-50% + ${parallax.x * slot.depth * -26}px), calc(-50% + ${
                  parallax.y * slot.depth * -18
                }px), ${slot.depth * 60 - 30}px) scale(${slot.scale}) rotate(${slot.rotate}deg)`,
                transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: isIncoming && !landed ? 0 : 1,
                filter: slot.depth < 0.35 ? 'blur(0.6px)' : undefined,
              }}
            >
              <motion.div
                className={rich && !isIncoming ? 'animate-float' : undefined}
                style={{ animationDelay: `${slot.delay}s`, animationDuration: `${slot.duration}s` }}
                initial={isIncoming ? { scale: 0.9 } : false}
                animate={isIncoming && landed ? { scale: [0.9, 1.08, 0.97, 1] } : undefined}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              >
                <WishCard
                  wish={wish}
                  className={
                    isIncoming
                      ? 'ring-2 ring-[var(--gold)]/45 shadow-[0_30px_60px_-26px_var(--accent-2)]'
                      : undefined
                  }
                  style={{ opacity: 0.55 + slot.depth * 0.45 }}
                />
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* The flying clone: centre of screen → its slot on the wall */}
      <AnimatePresence>
        {incoming && flight && !landed && (
          <motion.div
            className="pointer-events-none fixed left-1/2 top-1/2 z-50 w-[20rem] -translate-x-1/2 -translate-y-1/2"
            initial={{ x: 0, y: 0, scale: 1, opacity: 0, rotate: 0 }}
            animate={{
              // A gentle arc: rises and drifts before settling into place.
              x: [0, flight.x * 0.35, flight.x * 0.78, flight.x],
              y: [0, flight.y * 0.28 - 70, flight.y * 0.7 - 22, flight.y],
              scale: [1, 1.06, 0.94, flight.scale],
              rotate: [0, -3.5, 2.5, 0],
              opacity: [0, 1, 1, 1],
            }}
            transition={{
              duration: 1.55,
              times: [0, 0.22, 0.66, 1],
              ease: [0.32, 0.72, 0.24, 1],
            }}
            onAnimationComplete={handleLanded}
          >
            <WishCard wish={incoming} variant="preview" flat className="mx-auto" />
          </motion.div>
        )}
      </AnimatePresence>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="glass absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 flex size-11 items-center justify-center rounded-full text-[var(--ink)]"
          aria-label="Close the Wish Wall"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Closing line, once the wish has settled. CSS-driven like the rest of
          the copy, so it still resolves under reduced motion. */}
      {caption && (
        <div className="reveal pointer-events-none absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-40 px-6 text-center">
          <p className="font-display text-[1.35rem] leading-snug text-[var(--ink)] drop-shadow-[0_2px_10px_rgb(255_255_255/0.85)]">
            Your wish is now part of their story. 💕
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { DECOR_COMPONENTS, type DecorName } from './Decor';
import { useDeviceCapability, useParallax } from '@/lib/hooks';
import { seededRandom } from '@/lib/utils';
import type { Theme } from '@/lib/themes';

type Intensity = 'ambient' | 'full';

interface Props {
  theme: Theme;
  /** 'ambient' keeps the composer calm; 'full' is the Wish Wall celebration. */
  intensity?: Intensity;
  seed?: string;
  className?: string;
}

type Motion = 'lift' | 'tumble' | 'drift';

/** Balloons rise, desserts tumble, everything else drifts. */
const MOTION_FOR: Partial<Record<DecorName, Motion>> = {
  balloon: 'lift',
  heart: 'lift',
  cake: 'tumble',
  donut: 'tumble',
  macaron: 'tumble',
  cookie: 'tumble',
  choc: 'tumble',
  slice: 'tumble',
  gift: 'tumble',
};

interface Piece {
  key: string;
  name: DecorName;
  motion: Motion;
  left: number;
  top: number;
  size: number;
  depth: number;
  delay: number;
  duration: number;
  opacity: number;
  color: string;
  heavy: boolean;
}

/**
 * The dreamy celebration environment every guest screen sits inside:
 * soft colour blooms, drifting decor and a gentle parallax response.
 * Positions come from a seeded RNG so server and client render identically.
 */
export default function SceneBackground({ theme, intensity = 'ambient', seed = 'wall', className }: Props) {
  const { rich, reducedMotion } = useDeviceCapability();
  const parallax = useParallax(!reducedMotion);

  const pieces = useMemo<Piece[]>(() => {
    const random = seededRandom(`${seed}:${theme.id}:${intensity}`);
    const count = intensity === 'full' ? 26 : 14;
    const palette = theme.confetti;

    return Array.from({ length: count }, (_, index) => {
      const name = theme.decor[index % theme.decor.length] as DecorName;
      const depth = random();

      /*
       * Keep the vertical middle clear rather than the horizontal middle.
       * Reserving side margins only works when there are side margins — on a
       * phone the headline runs edge to edge, so "stay near the sides" put a
       * macaron directly behind the couple's names. Content sits in the middle
       * band on every screen; decor lives above and below it.
       */
      const top = random() < 0.5 ? random() * 27 : 73 + random() * 27;

      const safeName = (name in DECOR_COMPONENTS ? name : 'sparkle') as DecorName;
      return {
        key: `${name}-${index}`,
        name: safeName,
        motion: MOTION_FOR[safeName] ?? 'drift',
        left: 4 + random() * 92,
        top,
        // Distant pieces are smaller and fainter — cheap but convincing depth.
        // The floor is high enough that a macaron still looks like a macaron.
        size: 18 + depth * (intensity === 'full' ? 38 : 26),
        depth,
        delay: random() * 18,
        duration: 11 + random() * 12,
        opacity: (0.16 + depth * 0.32) * (intensity === 'full' ? 1 : 0.82),
        color: palette[index % palette.length]!,
        heavy: index > (intensity === 'full' ? 10 : 6),
      };
    });
  }, [theme, intensity, seed]);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`} aria-hidden>
      {/* Colour blooms */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 12% 8%, var(--wall-1) 0%, transparent 55%),
                       radial-gradient(110% 80% at 88% 12%, var(--wall-2) 0%, transparent 52%),
                       radial-gradient(120% 100% at 50% 108%, var(--wall-3) 0%, transparent 60%),
                       linear-gradient(170deg, var(--bg-1) 0%, var(--bg-2) 48%, var(--bg-3) 100%)`,
        }}
      />

      {/* Soft light sweep across the top, like a marquee above a dessert table */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 opacity-60"
        style={{
          background: 'linear-gradient(to bottom, rgb(255 255 255 / 0.55), transparent)',
        }}
      />

      {/* Drifting decorative pieces */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${parallax.x * -10}px, ${parallax.y * -8}px, 0)`,
          transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {pieces.map((piece) => {
          const Component = DECOR_COMPONENTS[piece.name];
          return (
            /*
             * Two nested elements on purpose. A running animation overrides an
             * element's inline transform, so parallax and drift cannot share
             * one node — the outer div carries the pointer parallax, the inner
             * one carries the animation.
             */
            <div
              key={piece.key}
              className={`absolute ${piece.heavy ? 'decor-layer--heavy' : ''}`}
              style={{
                left: `${piece.left}%`,
                top: `${piece.top}%`,
                opacity: piece.opacity,
                filter: piece.depth < 0.28 ? 'blur(1.5px)' : undefined,
                transform: `translate3d(${parallax.x * piece.depth * -22}px, ${
                  parallax.y * piece.depth * -16
                }px, 0)`,
                transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div
                className={rich ? `animate-${piece.motion}` : undefined}
                style={{
                  animationDelay: `-${piece.delay}s`,
                  ['--decor-duration' as string]: `${piece.duration}s`,
                }}
              >
                <Component size={piece.size} color={piece.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fine glowing dust */}
      {rich && (
        <div className="decor-layer--heavy absolute inset-0">
          {Array.from({ length: intensity === 'full' ? 26 : 14 }).map((_, index) => {
            const random = seededRandom(`dust:${seed}:${index}`);
            const left = random() * 100;
            const top = random() * 100;
            const delay = random() * 4;
            const size = 2 + random() * 3;
            return (
              <span
                key={index}
                className="animate-twinkle absolute rounded-full"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: size,
                  height: size,
                  background: 'var(--gold)',
                  boxShadow: '0 0 8px 2px rgb(255 255 255 / 0.6)',
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

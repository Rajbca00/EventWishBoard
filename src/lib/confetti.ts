'use client';

import confetti from 'canvas-confetti';

interface BurstOptions {
  colors: string[];
  /** Normalised viewport coordinates for the burst origin. */
  origin?: { x: number; y: number };
  intensity?: 'gentle' | 'full';
}

/**
 * Celebration particles for the moment a wish lands on the wall.
 * Deliberately soft — petals and sparkles rather than a party popper.
 */
export function celebrate({ colors, origin = { x: 0.5, y: 0.45 }, intensity = 'full' }: BurstOptions) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gentle = intensity === 'gentle';

  confetti({
    particleCount: gentle ? 26 : 60,
    spread: gentle ? 55 : 78,
    startVelocity: gentle ? 22 : 32,
    gravity: 0.75,
    decay: 0.92,
    scalar: 0.95,
    ticks: 180,
    origin,
    colors,
    disableForReducedMotion: true,
  });

  if (gentle) return;

  // A second, slower shower of larger "petals" a beat later.
  window.setTimeout(() => {
    confetti({
      particleCount: 22,
      spread: 110,
      startVelocity: 18,
      gravity: 0.5,
      decay: 0.94,
      scalar: 1.5,
      ticks: 240,
      origin: { x: origin.x, y: origin.y - 0.05 },
      colors,
      shapes: ['circle'],
      disableForReducedMotion: true,
    });
  }, 260);
}

/** A small sparkle used for lighter interactions, e.g. picking a sticker. */
export function sparkleAt(x: number, y: number, colors: string[]) {
  if (typeof window === 'undefined') return;
  confetti({
    particleCount: 10,
    spread: 40,
    startVelocity: 14,
    gravity: 0.4,
    decay: 0.9,
    scalar: 0.6,
    ticks: 80,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors,
    disableForReducedMotion: true,
  });
}

'use client';

import { memo } from 'react';

/**
 * Decorative SVG pieces for the celebration scene.
 *
 * They are deliberately soft and slightly translucent: the wishes are the
 * subject, these are the room the wishes float in.
 */

interface PieceProps {
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  accent?: string;
  size?: number;
}

export const Balloon = memo(function Balloon({ className, style, color = '#f2a5bd', size = 64 }: PieceProps) {
  return (
    <svg
      width={size}
      height={size * 1.6}
      viewBox="0 0 64 102"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <defs>
        <radialGradient id={`bal-${color.replace('#', '')}`} cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="45%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="34" rx="27" ry="33" fill={`url(#bal-${color.replace('#', '')})`} />
      <path d="M32 67c-3 3-3 5 0 8 3-3 3-5 0-8Z" fill={color} />
      <path
        d="M32 75c0 8 7 9 7 16s-7 8-7 11"
        stroke={color}
        strokeOpacity="0.5"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="23" cy="22" rx="6" ry="9" fill="#ffffff" opacity="0.5" transform="rotate(-18 23 22)" />
    </svg>
  );
});

export const Heart = memo(function Heart({ className, style, color = '#e58aa5', size = 26 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 30" fill="none" className={className} style={style} aria-hidden>
      <path
        d="M16 29S1.5 20.4 1.5 10.8C1.5 5.4 5.6 1.5 10.4 1.5c3 0 5 1.6 5.6 3.4C16.6 3.1 18.6 1.5 21.6 1.5c4.8 0 8.9 3.9 8.9 9.3C30.5 20.4 16 29 16 29Z"
        fill={color}
      />
      <path d="M9 8.5c-1.4.9-2.3 2.3-2.6 3.9" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
});

export const Petal = memo(function Petal({ className, style, color = '#f7c9d8', size = 22 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path d="M12 1c6 4.5 9 8.6 9 12.4C21 18.6 17 22 12 22S3 18.6 3 13.4C3 9.6 6 5.5 12 1Z" fill={color} />
      <path d="M12 4.5c-2.6 3-4 5.8-4 8.6" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
});

export const Sparkle = memo(function Sparkle({ className, style, color = '#e8cb8e', size = 18 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path d="M12 0c.9 6.6 4.5 10.4 12 12-7.5 1.6-11.1 5.4-12 12-.9-6.6-4.5-10.4-12-12C7.5 10.4 11.1 6.6 12 0Z" fill={color} />
    </svg>
  );
});

export const Ring = memo(function Ring({ className, style, color = '#dcb463', size = 30 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 34" fill="none" className={className} style={style} aria-hidden>
      <path d="m16 2 4 4-4 4-4-4 4-4Z" fill="#f4e3c0" />
      <circle cx="16" cy="22" r="9.5" stroke={color} strokeWidth="3" fill="none" />
      <path d="M9 19a8 8 0 0 1 4-5" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
});

export const Star = memo(function Star({ className, style, color = '#eac265', size = 22 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path
        d="m12 1.6 3.1 6.6 7.1.9-5.2 4.9 1.3 7-6.3-3.5-6.3 3.5 1.3-7L1.8 9.1l7.1-.9L12 1.6Z"
        fill={color}
      />
    </svg>
  );
});

export const Cupcake = memo(function Cupcake({ className, style, size = 40 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 44" fill="none" className={className} style={style} aria-hidden>
      <path d="M9 20h22l-3 19a3 3 0 0 1-3 2.6H15A3 3 0 0 1 12 39L9 20Z" fill="#f0dcc8" />
      <path d="M12 26h16M11 32h18" stroke="#dcc3a8" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M20 3c4 0 5.6 2.6 5.6 4.8 3.4 0 5.9 2.3 5.9 5.2 0 3-2.6 5.3-6 5.3H14.5c-3.4 0-6-2.3-6-5.3 0-2.9 2.5-5.2 5.9-5.2C14.4 5.6 16 3 20 3Z"
        fill="#f6b6c8"
      />
      <circle cx="20" cy="2.6" r="2.4" fill="#d95f83" />
    </svg>
  );
});

export const Gift = memo(function Gift({ className, style, color = '#e3a3b6', size = 36 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className} style={style} aria-hidden>
      <rect x="4" y="14" width="28" height="19" rx="3" fill={color} />
      <rect x="2.5" y="9" width="31" height="7" rx="2.6" fill="#f5c6d3" />
      <path d="M18 9v24" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.6" />
      <path
        d="M18 9c-2.6-4.6-9.2-5.4-9.2-1.6 0 2 3.6 2.4 9.2 1.6Zm0 0c2.6-4.6 9.2-5.4 9.2-1.6 0 2-3.6 2.4-9.2 1.6Z"
        fill="#efb4c4"
      />
    </svg>
  );
});

export const ConfettiStrip = memo(function ConfettiStrip({ className, style, color = '#d4738f', size = 14 }: PieceProps) {
  return (
    <svg width={size} height={size * 2} viewBox="0 0 8 16" fill="none" className={className} style={style} aria-hidden>
      <path d="M4 0c2.5 3 2.5 5 0 8s-2.5 5 0 8" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
});

export const Ribbon = memo(function Ribbon({ className, style, color = '#f0b8c8', size = 90 }: PieceProps) {
  return (
    <svg width={size} height={size / 3} viewBox="0 0 90 30" fill="none" className={className} style={style} aria-hidden>
      <path
        d="M0 18C14 4 26 4 40 18s26 14 40 0"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </svg>
  );
});

export const DECOR_COMPONENTS = {
  balloon: Balloon,
  heart: Heart,
  petal: Petal,
  sparkle: Sparkle,
  ring: Ring,
  star: Star,
  cake: Cupcake,
  gift: Gift,
  confetti: ConfettiStrip,
  ribbon: Ribbon,
} as const;

export type DecorName = keyof typeof DECOR_COMPONENTS;

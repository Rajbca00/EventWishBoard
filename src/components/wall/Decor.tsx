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


/* ------------------------------------------------------------------ desserts
   The brand is a bakery, so the scene should have something to eat in it. Each
   piece is drawn flat and soft-edged: at 20-50px behind content, detail turns
   to noise, and silhouette is all that survives. */

export const Donut = memo(function Donut({ className, style, color = '#e8a9bd', size = 34 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className} style={style} aria-hidden>
      <circle cx="18" cy="18" r="15" fill="#e9c9a8" />
      <path
        d="M18 3c8.3 0 15 6.7 15 15 0 2.3-.5 4.5-1.4 6.4-1.6-1.1-3.2-.4-4.6.4-1.6.9-3.1 1.7-5 .6-2-1.2-2-3-2-4.7 0-1.9 0-3.7-2.2-4.9-2.2-1.2-3.9-.2-5.4.7-1.4.8-2.7 1.5-4.3.6C6.4 16.6 5.5 15 4.3 14A15 15 0 0 1 18 3Z"
        fill={color}
      />
      <circle cx="18" cy="18" r="5" fill="#fdf6ec" />
      <circle cx="12" cy="9" r="1.1" fill="#fff3d9" />
      <circle cx="25" cy="11" r="1.1" fill="#fff3d9" />
      <circle cx="27" cy="20" r="1.1" fill="#fff3d9" />
    </svg>
  );
});

export const Macaron = memo(function Macaron({ className, style, color = '#f2b8cd', size = 30 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 26" fill="none" className={className} style={style} aria-hidden>
      <path d="M3 9.5C3 5.4 9.3 2 17 2s14 3.4 14 7.5c0 1.6-1 2.5-2.4 2.5H5.4C4 12 3 11.1 3 9.5Z" fill={color} />
      <rect x="4.6" y="11.4" width="24.8" height="4.2" rx="2.1" fill="#f6e3c8" />
      <path d="M3 16.5C3 20.6 9.3 24 17 24s14-3.4 14-7.5c0-1.6-1-2.5-2.4-2.5H5.4C4 14 3 14.9 3 16.5Z" fill={color} />
    </svg>
  );
});

export const Cookie = memo(function Cookie({ className, style, size = 30 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} style={style} aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#e2b378" />
      <circle cx="11" cy="12" r="2.3" fill="#5c3a1e" />
      <circle cx="21" cy="14" r="2" fill="#5c3a1e" />
      <circle cx="15" cy="21" r="2.2" fill="#5c3a1e" />
      <circle cx="23" cy="22" r="1.5" fill="#5c3a1e" />
      <circle cx="8" cy="19" r="1.4" fill="#5c3a1e" />
    </svg>
  );
});

export const ChocolateChunk = memo(function ChocolateChunk({ className, style, size = 22 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" fill="#6b3f21" />
      <path d="M12 3v18M3 7.5 12 12l9-4.5" stroke="#8a5730" strokeWidth="1.3" />
      <path d="M12 3 21 7.5 12 12 3 7.5 12 3Z" fill="#8a5730" />
    </svg>
  );
});

export const CakeSlice = memo(function CakeSlice({ className, style, size = 34 }: PieceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 30" fill="none" className={className} style={style} aria-hidden>
      <path d="M4 24 17 4l13 20H4Z" fill="#f4d9bd" />
      <path d="M9.6 15.4h14.8L27 19.6H7L9.6 15.4Z" fill="#e8a9bd" />
      <path d="M4 24h26v2.4a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 26.4V24Z" fill="#6b3f21" />
      <circle cx="17" cy="6.4" r="2" fill="#d95f83" />
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
  donut: Donut,
  macaron: Macaron,
  cookie: Cookie,
  choc: ChocolateChunk,
  slice: CakeSlice,
  gift: Gift,
  confetti: ConfettiStrip,
  ribbon: Ribbon,
} as const;

export type DecorName = keyof typeof DECOR_COMPONENTS;

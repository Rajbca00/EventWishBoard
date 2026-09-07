import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------ text */

/** Strips markup and control characters from anything a guest typed. */
export function sanitizeText(input: unknown, maxLen?: number): string {
  let s = String(input ?? '');
  s = s.replace(/<[^>]*>/g, '');
  // Drop control characters, keeping tab and newline.
  s = Array.from(s)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 31 ? code !== 127 : code === 10 || code === 9;
    })
    .join('');
  s = s.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{3,}/g, '  ');
  s = s.trim();
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s;
}

/** Cheap heuristics that keep obvious link spam off the Wish Wall. */
export function looksLikeSpam(message: string): boolean {
  const links = message.match(/https?:\/\/|www\.|\.(com|net|ru|xyz|io|biz)\b/gi)?.length ?? 0;
  if (links >= 2) return true;
  const letters = message.replace(/[^a-z]/gi, '');
  if (letters.length > 20 && letters === letters.toUpperCase()) return true;
  if (/(.)\1{9,}/.test(message)) return true;
  return false;
}

export function slugify(value: string, fallback = 'celebration'): string {
  const s = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s.slice(0, 60) || fallback;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/* ------------------------------------------------------------------ dates */

/** A bare YYYY-MM-DD expiry means "the end of that day". */
export function normalizeExpiry(value: string | null | undefined): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T23:59:59`).toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isPast(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Days until expiry — negative once the event has closed. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/* ------------------------------------------------------------------ misc */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Deterministic pseudo-random in [0,1) from a string — keeps SSR and client layouts identical. */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import 'server-only';
import { randomUUID } from 'node:crypto';
import type { AssetRow, EventRow, EventStatsRow, WishRow } from '../types';

/**
 * In-memory data source used when no Supabase credentials are present.
 *
 * It exists so `npm run dev` works the moment you clone the repo: the full
 * guest journey, the Wish Wall animation and the dashboard are all explorable
 * before you have a database. Data resets whenever the server restarts, and the
 * store is never reachable once NEXT_PUBLIC_SUPABASE_URL is set.
 */

interface DemoData {
  events: EventRow[];
  wishes: WishRow[];
  assets: AssetRow[];
  scans: { event_id: string; created_at: string }[];
}

const EMOJI_STICKERS: [string, string][] = [
  ['❤️', 'Love'],
  ['💕', 'Two hearts'],
  ['🎉', 'Celebrate'],
  ['🥂', 'Cheers'],
  ['💍', 'Forever'],
  ['✨', 'Sparkle'],
  ['🥰', 'Adore'],
  ['🎂', 'Cake'],
  ['💐', 'Bouquet'],
  ['🌟', 'Star'],
  ['🧁', 'Sweetness'],
  ['🎀', 'Ribbon'],
];

const DEFAULT_GIFS: [string, string][] = [
  ['/library/gifs/hearts.svg', 'Floating hearts'],
  ['/library/gifs/confetti.svg', 'Confetti burst'],
  ['/library/gifs/cheers.svg', 'Cheers!'],
  ['/library/gifs/sparkle.svg', 'Sparkle'],
  ['/library/gifs/cake.svg', 'Happy cake'],
];

const DEFAULT_MEMES: [string, string][] = [
  ['/library/memes/best-couple.svg', 'Best couple award'],
  ['/library/memes/finally.svg', 'Finally!'],
  ['/library/memes/dessert.svg', 'Here for dessert'],
  ['/library/memes/dance.svg', 'See you on the floor'],
];

const PRELOADED = [
  'Wishing you a lifetime of happiness ❤️',
  "Here's to forever! 🥂",
  'May your journey together always be filled with laughter ✨',
  'May every chapter be better than the last.',
];

function iso(offsetMinutes = 0): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString();
}

function seed(): DemoData {
  const eventId = 'laya-bee-wedding-001';
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 3);

  const events: EventRow[] = [
    {
      id: eventId,
      name: 'Arjun & Priya Wedding',
      hosts: 'Arjun & Priya',
      event_date: new Date().toISOString().slice(0, 10),
      expiry_date: expiry.toISOString(),
      description: 'A celebration of love, laughter and a great deal of cake.',
      theme: 'wedding',
      background: null,
      welcome_message: 'Your message will become part of their digital Wish Wall.',
      logo_url: null,
      settings: {},
      archived: false,
      created_at: iso(60 * 24 * 3),
      updated_at: iso(60),
    },
    {
      id: 'ananya-birthday-001',
      name: "Ananya's 30th Birthday",
      hosts: 'Ananya',
      event_date: new Date().toISOString().slice(0, 10),
      expiry_date: expiry.toISOString(),
      description: 'Thirty, flirty and thriving.',
      theme: 'birthday',
      background: null,
      welcome_message: 'Leave a birthday message she can keep forever.',
      logo_url: null,
      settings: {},
      archived: false,
      created_at: iso(60 * 24),
      updated_at: iso(30),
    },
  ];

  const assets: AssetRow[] = [
    ...EMOJI_STICKERS.map(([emoji, name], index) => ({
      id: randomUUID(),
      event_id: null,
      type: 'sticker' as const,
      url: null,
      emoji,
      name,
      enabled: true,
      sort_order: index * 10,
      created_at: iso(),
    })),
    ...DEFAULT_GIFS.map(([url, name], index) => ({
      id: randomUUID(),
      event_id: null,
      type: 'gif' as const,
      url,
      emoji: null,
      name,
      enabled: true,
      sort_order: index * 10,
      created_at: iso(),
    })),
    ...DEFAULT_MEMES.map(([url, name], index) => ({
      id: randomUUID(),
      event_id: null,
      type: 'meme' as const,
      url,
      emoji: null,
      name,
      enabled: true,
      sort_order: index * 10,
      created_at: iso(),
    })),
  ];

  const wishes: WishRow[] = PRELOADED.map((message, index) => ({
    id: randomUUID(),
    event_id: eventId,
    message,
    guest_name: null,
    is_anonymous: true,
    sticker: index === 0 ? '❤️' : index === 1 ? '🥂' : null,
    gif: null,
    meme: null,
    selfie_path: null,
    status: 'approved' as const,
    is_featured: false,
    is_preloaded: true,
    ip_hash: null,
    created_at: iso(60 * (index + 2)),
  }));

  wishes.push(
    {
      id: randomUUID(),
      event_id: eventId,
      message: 'You two are the best thing that happened to each other. So happy for you! 🥰',
      guest_name: 'Meera',
      is_anonymous: false,
      sticker: '💕',
      gif: null,
      meme: null,
      selfie_path: null,
      status: 'approved',
      is_featured: true,
      is_preloaded: false,
      ip_hash: 'demo',
      created_at: iso(48),
    },
    {
      id: randomUUID(),
      event_id: eventId,
      message: 'Congratulations! Save me a slice of that cake 🧁',
      guest_name: null,
      is_anonymous: true,
      sticker: null,
      gif: '/library/gifs/cake.svg',
      meme: null,
      selfie_path: null,
      status: 'approved',
      is_featured: false,
      is_preloaded: false,
      ip_hash: 'demo',
      created_at: iso(22),
    },
    {
      id: randomUUID(),
      event_id: eventId,
      message: 'Wishing you both a lifetime of happiness, laughter and adventures! ❤️',
      guest_name: 'Rajesh',
      is_anonymous: false,
      sticker: '✨',
      gif: null,
      meme: '/library/memes/best-couple.svg',
      selfie_path: null,
      status: 'approved',
      is_featured: false,
      is_preloaded: false,
      ip_hash: 'demo',
      created_at: iso(8),
    },
  );

  const scans = Array.from({ length: 46 }, (_, index) => ({
    event_id: index % 4 === 0 ? 'ananya-birthday-001' : eventId,
    created_at: iso(index * 17),
  }));

  return { events, wishes, assets, scans };
}

// Survives Next's dev-server module reloads.
const globalRef = globalThis as typeof globalThis & { __wishWallDemo?: DemoData };

export function demoData(): DemoData {
  if (!globalRef.__wishWallDemo) globalRef.__wishWallDemo = seed();
  return globalRef.__wishWallDemo;
}

export function demoStats(eventId: string): EventStatsRow {
  const { wishes, scans } = demoData();
  const mine = wishes.filter((wish) => wish.event_id === eventId);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return {
    event_id: eventId,
    total_wishes: mine.length,
    guest_wishes: mine.filter((wish) => !wish.is_preloaded && wish.status !== 'hidden').length,
    wishes_today: mine.filter((wish) => new Date(wish.created_at) >= startOfDay).length,
    selfies: mine.filter((wish) => wish.selfie_path).length,
    pending: mine.filter((wish) => wish.status === 'pending').length,
    hidden: mine.filter((wish) => wish.status === 'hidden').length,
    featured: mine.filter((wish) => wish.is_featured).length,
    scans: scans.filter((scan) => scan.event_id === eventId).length,
  };
}

export function demoNewId(): string {
  return randomUUID();
}

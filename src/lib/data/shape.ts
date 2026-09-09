import {
  DEFAULT_SETTINGS,
  type AdminAsset,
  type AdminWish,
  type AssetRow,
  type CelebrationEvent,
  type EventRow,
  type EventSettings,
  type EventStats,
  type EventStatsRow,
  type GuestAsset,
  type PublicWish,
  type ThemeId,
  type WishRow,
} from '../types';
import { isThemeId, DEFAULT_THEME } from '../themes';
import { isPast } from '../utils';
import { LIMITS } from '../env';

export function parseSettings(raw: unknown): EventSettings {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<EventSettings>;
  const merged: EventSettings = { ...DEFAULT_SETTINGS, ...source };

  merged.charLimit = Math.min(Math.max(Number(merged.charLimit) || 300, 50), LIMITS.wishChars);
  merged.maxWishes = Math.max(Math.floor(Number(merged.maxWishes) || 0), 0);
  merged.moderation = merged.moderation === 'manual' ? 'manual' : 'auto';

  const flags = [
    'selfieEnabled',
    'wallEnabled',
    'publicSelfies',
    'useDefaultAssets',
    'showInstagram',
    'showReview',
  ] as const;
  flags.forEach((flag) => {
    merged[flag] = Boolean(merged[flag]);
  });

  return merged;
}

export function shapeEvent(row: EventRow): CelebrationEvent {
  return {
    id: row.id,
    name: row.name,
    hosts: row.hosts,
    eventDate: row.event_date,
    expiryDate: row.expiry_date,
    description: row.description,
    themeId: (isThemeId(row.theme) ? row.theme : DEFAULT_THEME) as ThemeId,
    background: row.background,
    welcomeMessage: row.welcome_message,
    logoUrl: row.logo_url,
    settings: parseSettings(row.settings),
    archived: row.archived,
    expired: isPast(row.expiry_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Public shape. `selfieUrl` is only ever populated when the organiser has
 * explicitly opted into showing guest photos on the wall.
 */
export function shapePublicWish(row: WishRow, selfieUrl: string | null = null): PublicWish {
  return {
    id: row.id,
    message: row.message,
    name: row.is_anonymous ? null : row.guest_name,
    sticker: row.sticker,
    gif: row.gif,
    meme: row.meme,
    selfieUrl,
    featured: row.is_featured,
    createdAt: row.created_at,
  };
}

export function shapeAdminWish(row: WishRow, selfieUrl: string | null = null): AdminWish {
  return {
    ...shapePublicWish(row, selfieUrl),
    eventId: row.event_id,
    guestName: row.guest_name,
    isAnonymous: row.is_anonymous,
    status: row.status,
    preloaded: row.is_preloaded,
    hasSelfie: Boolean(row.selfie_path),
    selfiePublic: row.selfie_public,
  };
}

export function shapeGuestAsset(row: AssetRow): GuestAsset {
  return {
    id: row.id,
    type: row.type,
    url: row.url,
    emoji: row.emoji,
    name: row.name,
  };
}

export function shapeAdminAsset(row: AssetRow): AdminAsset {
  return {
    ...shapeGuestAsset(row),
    eventId: row.event_id,
    enabled: row.enabled,
    global: row.event_id === null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function shapeStats(row: EventStatsRow | null | undefined): EventStats {
  const scans = row?.scans ?? 0;
  const guestWishes = row?.guest_wishes ?? 0;
  return {
    totalWishes: row?.total_wishes ?? 0,
    guestWishes,
    today: row?.wishes_today ?? 0,
    selfies: row?.selfies ?? 0,
    pending: row?.pending ?? 0,
    hidden: row?.hidden ?? 0,
    featured: row?.featured ?? 0,
    scans,
    submissionRate: scans ? Math.min(100, Math.round((guestWishes / scans) * 100)) : 0,
  };
}

export const EMPTY_STATS: EventStats = shapeStats(null);

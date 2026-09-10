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
 * Reads a decoration list, falling back to the single legacy column.
 *
 * A database without migration 0004 has no array columns at all, and rows
 * written before it ran have empty ones — either way the singular column still
 * holds the guest's choice, so it is the fallback rather than a special case.
 */
function decorations(list: string[] | null | undefined, legacy: string | null): string[] {
  const values = (list ?? []).filter((value) => typeof value === 'string' && value.length > 0);
  if (values.length) return values;
  return legacy ? [legacy] : [];
}

/**
 * Whether a guest's photo may appear on the public wall.
 *
 * Two locks, and either one saying no keeps the photo private: the organiser
 * has to allow photos on the wall for this event, and the guest has to have
 * chosen to share theirs. This lives in one place on purpose — the rule was
 * written out separately for each data source before, which is how a privacy
 * decision quietly drifts apart from itself.
 */
export function canShowPhotoOnWall(
  settings: Pick<EventSettings, 'publicSelfies'>,
  row: Pick<WishRow, 'selfie_public' | 'selfie_path'>,
): boolean {
  return Boolean(settings.publicSelfies && row.selfie_public && row.selfie_path);
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
    stickers: decorations(row.stickers, row.sticker),
    gifs: decorations(row.gifs, row.gif),
    memes: decorations(row.memes, row.meme),
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

/**
 * True when Postgres/PostgREST rejected a statement because a column does not
 * exist. Lets the data layer degrade gracefully on a database that has not had
 * the newest migration applied yet, instead of failing the whole request.
 *
 * PGRST204 is PostgREST's schema-cache miss; 42703 is Postgres's undefined_column.
 */
export function isMissingColumn(error: unknown, column: string): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const schemaMiss = e.code === 'PGRST204' || e.code === '42703';
  return schemaMiss && Boolean(e.message?.includes(column));
}

import 'server-only';
import { supabaseAdmin } from '../supabase/admin';
import { demoData, demoNewId } from '../demo/store';
import { deleteSelfie, signSelfies, uploadSelfie } from '../images';
import { looksLikeSpam, sanitizeText } from '../utils';
import { isSupabaseConfigured, LIMITS } from '../env';
import { isMissingColumn, shapeAdminWish, shapePublicWish } from './shape';
import { getEventStats, statusFor } from './events';
import type {
  AdminWish,
  CelebrationEvent,
  Memory,
  PublicWish,
  WishRow,
  WishStatus,
} from '../types';
import type { WishSubmission } from '../validation';

export class SubmissionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const demo = () => !isSupabaseConfigured();

/** In demo mode the selfie data URL is stored inline, so it needs no signing. */
function demoWishesFor(eventId: string): WishRow[] {
  return demoData()
    .wishes.filter((wish) => wish.event_id === eventId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/* ------------------------------------------------------------------ public wall */

/**
 * Wishes shown on the Wish Wall, oldest first so new arrivals land at the end.
 * Featured wishes are pulled in first so the organiser can pin favourites.
 */
export async function getWallWishes(
  event: CelebrationEvent,
  limit = 60,
): Promise<PublicWish[]> {
  if (demo()) {
    return demoWishesFor(event.id)
      .filter((wish) => wish.status === 'approved')
      .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
      .slice(0, limit)
      .reverse()
      .map((row) =>
        shapePublicWish(
          row,
          event.settings.publicSelfies && row.selfie_public ? row.selfie_path : null,
        ),
      );
  }

  const { data, error } = await supabaseAdmin()
    .from('wishes')
    .select('*')
    .eq('event_id', event.id)
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as WishRow[]).slice().reverse();

  // A photo reaches the wall only when the organiser allows sharing AND the
  // guest chose to share theirs. Either one saying no keeps it private.
  const shareable = (row: WishRow) =>
    event.settings.publicSelfies && row.selfie_public && Boolean(row.selfie_path);

  if (!event.settings.publicSelfies) {
    return rows.map((row) => shapePublicWish(row, null));
  }

  const signed = await signSelfies(
    rows.filter(shareable).map((row) => row.selfie_path as string),
  );
  return rows.map((row) =>
    shapePublicWish(row, shareable(row) ? (signed.get(row.selfie_path as string) ?? null) : null),
  );
}

/* ------------------------------------------------------------------ guest submission */

async function assertNotRateLimited(eventId: string, ipHash: string) {
  if (demo()) return;

  const since = new Date(Date.now() - LIMITS.wishWindowMs).toISOString();

  const [{ count: recent }, { count: total }] = await Promise.all([
    supabaseAdmin()
      .from('wishes')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('ip_hash', ipHash)
      .gte('created_at', since),
    supabaseAdmin()
      .from('wishes')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('ip_hash', ipHash),
  ]);

  if ((recent ?? 0) >= LIMITS.wishPerWindow) {
    throw new SubmissionError('That was quick! Give it a moment before sending another wish.', 429);
  }
  if ((total ?? 0) >= LIMITS.wishPerEventPerIp) {
    throw new SubmissionError('Thanks for all the love — you have already sent plenty of wishes.', 429);
  }
}

export interface SubmitResult {
  wish: PublicWish;
  /** Held for moderation rather than shown immediately. */
  pending: boolean;
}

export async function submitGuestWish(
  event: CelebrationEvent,
  submission: WishSubmission,
  ipHash: string,
): Promise<SubmitResult> {
  if (event.archived || event.expired) {
    throw new SubmissionError('This Wish Wall has closed.', 410);
  }

  const stats = await getEventStats(event.id);
  if (statusFor(event, stats) === 'full') {
    throw new SubmissionError('This Wish Wall has collected all the wishes it can hold.', 410);
  }

  await assertNotRateLimited(event.id, ipHash);

  const message = sanitizeText(submission.message, event.settings.charLimit);
  if (!message) throw new SubmissionError('Write a little something first');

  const isAnonymous = Boolean(submission.isAnonymous);
  const guestName = isAnonymous ? null : sanitizeText(submission.guestName, LIMITS.nameChars) || null;

  // Manual moderation holds everything; auto still quarantines obvious spam.
  const status: WishStatus =
    event.settings.moderation === 'manual' || looksLikeSpam(message) ? 'pending' : 'approved';

  const wantsSelfie = Boolean(submission.selfie && event.settings.selfieEnabled);
  // The organiser's setting is the ceiling: a guest cannot publish a photo at
  // an event where sharing is switched off.
  const selfiePublic = wantsSelfie && event.settings.publicSelfies && Boolean(submission.selfiePublic);

  if (demo()) {
    const row: WishRow = {
      id: demoNewId(),
      event_id: event.id,
      message,
      guest_name: guestName,
      is_anonymous: isAnonymous,
      sticker: submission.stickers[0] ?? null,
      gif: submission.gifs[0] ?? null,
      meme: submission.memes[0] ?? null,
      stickers: submission.stickers,
      gifs: submission.gifs,
      memes: submission.memes,
      selfie_path: wantsSelfie ? (submission.selfie ?? null) : null,
      selfie_public: selfiePublic,
      status,
      is_featured: false,
      is_preloaded: false,
      ip_hash: ipHash,
      created_at: new Date().toISOString(),
    };
    demoData().wishes.push(row);
    return { wish: shapePublicWish(row, null), pending: status === 'pending' };
  }

  let selfiePath: string | null = null;
  if (wantsSelfie) {
    selfiePath = await uploadSelfie(event.id, submission.selfie!);
  }

  const row: Record<string, unknown> = {
    event_id: event.id,
    message,
    guest_name: guestName,
    is_anonymous: isAnonymous,
    // The singular columns mirror the first of each list. See migration 0004:
    // they exist so a deploy that lands before the migration still works.
    sticker: submission.stickers[0] ?? null,
    gif: submission.gifs[0] ?? null,
    meme: submission.memes[0] ?? null,
    stickers: submission.stickers,
    gifs: submission.gifs,
    memes: submission.memes,
    selfie_path: selfiePath,
    selfie_public: selfiePublic,
    status,
    ip_hash: ipHash,
  };

  const insert = (payload: Record<string, unknown>) =>
    supabaseAdmin().from('wishes').insert(payload).select('*').single<WishRow>();

  let { data, error } = await insert(row);

  /*
   * Code and schema deploy separately: Vercel ships in seconds, a migration is
   * a person pasting SQL. If the code lands first, every guest submission would
   * otherwise fail with a 500 until someone notices. Rather than take the wall
   * down, drop the column the database does not have yet and record the wish —
   * losing only the guest's public/private photo preference, which defaults to
   * private, the safer of the two.
   */
  if (error && isMissingColumn(error, 'selfie_public')) {
    console.warn(
      '[wish] wishes.selfie_public is missing — run supabase/migrations/0002_selfie_visibility.sql. ' +
        'Saving this wish without the guest photo-sharing preference (defaults to private).',
    );
    delete row.selfie_public;
    ({ data, error } = await insert(row));
  }

  /*
   * Same reasoning for the decoration lists. Without 0004 the wish still saves
   * with the guest's first sticker, GIF and meme, because the singular columns
   * above carry them; only the extras are lost, which beats refusing the wish.
   */
  const missingList = (['stickers', 'gifs', 'memes'] as const).find((column) =>
    isMissingColumn(error, column),
  );
  if (error && missingList) {
    console.warn(
      `[wish] wishes.${missingList} is missing — run supabase/migrations/0004_multi_decorations.sql. ` +
        'Saving this wish with only the first sticker, GIF and meme.',
    );
    delete row.stickers;
    delete row.gifs;
    delete row.memes;
    ({ data, error } = await insert(row));
  }

  if (error || !data) {
    if (selfiePath) await deleteSelfie(selfiePath);
    throw new Error(error?.message ?? 'The wish could not be saved');
  }

  return { wish: shapePublicWish(data, null), pending: status === 'pending' };
}

/* ------------------------------------------------------------------ organiser wishes */

export async function createPreloadedWish(
  eventId: string,
  input: {
    message: string;
    guestName?: string;
    isAnonymous?: boolean;
    sticker?: string | null;
    stickers?: string[];
  },
): Promise<AdminWish> {
  const isAnonymous = input.isAnonymous ?? true;
  const stickers = [...new Set([...(input.stickers ?? []), ...(input.sticker ? [input.sticker] : [])])]
    .slice(0, LIMITS.maxStickers);

  if (demo()) {
    const row: WishRow = {
      id: demoNewId(),
      event_id: eventId,
      message: sanitizeText(input.message, LIMITS.wishChars),
      guest_name: isAnonymous ? null : sanitizeText(input.guestName, LIMITS.nameChars) || null,
      is_anonymous: isAnonymous,
      sticker: stickers[0] ?? null,
      gif: null,
      meme: null,
      stickers,
      gifs: [],
      memes: [],
      selfie_path: null,
      selfie_public: false,
      status: 'approved',
      is_featured: false,
      is_preloaded: true,
      ip_hash: null,
      created_at: new Date().toISOString(),
    };
    demoData().wishes.push(row);
    return shapeAdminWish(row);
  }

  const { data, error } = await supabaseAdmin()
    .from('wishes')
    .insert({
      event_id: eventId,
      message: sanitizeText(input.message, LIMITS.wishChars),
      guest_name: isAnonymous ? null : sanitizeText(input.guestName, LIMITS.nameChars) || null,
      is_anonymous: isAnonymous,
      sticker: stickers[0] ?? null,
      stickers,
      status: 'approved',
      is_preloaded: true,
    })
    .select('*')
    .single<WishRow>();

  // Without migration 0004 the list column does not exist; the first sticker
  // still lands in the singular column, so save the wish rather than refuse it.
  if (error && isMissingColumn(error, 'stickers')) {
    const retry = await supabaseAdmin()
      .from('wishes')
      .insert({
        event_id: eventId,
        message: sanitizeText(input.message, LIMITS.wishChars),
        guest_name: isAnonymous ? null : sanitizeText(input.guestName, LIMITS.nameChars) || null,
        is_anonymous: isAnonymous,
        sticker: stickers[0] ?? null,
        status: 'approved',
        is_preloaded: true,
      })
      .select('*')
      .single<WishRow>();
    if (retry.error) throw new Error(retry.error.message);
    return shapeAdminWish(retry.data);
  }

  if (error) throw new Error(error.message);
  return shapeAdminWish(data);
}

export interface ListWishesOptions {
  status?: WishStatus | 'all';
  limit?: number;
  offset?: number;
}

export async function listWishes(
  eventId: string,
  { status = 'all', limit = 200, offset = 0 }: ListWishesOptions = {},
): Promise<AdminWish[]> {
  if (demo()) {
    return demoWishesFor(eventId)
      .filter((wish) => status === 'all' || wish.status === status)
      .slice(offset, offset + limit)
      .map((row) => shapeAdminWish(row, row.selfie_path));
  }

  let query = supabaseAdmin()
    .from('wishes')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as WishRow[];
  const signed = await signSelfies(rows.map((row) => row.selfie_path).filter(Boolean) as string[]);
  return rows.map((row) =>
    shapeAdminWish(row, row.selfie_path ? (signed.get(row.selfie_path) ?? null) : null),
  );
}

export async function updateWish(
  wishId: string,
  patch: { status?: WishStatus; featured?: boolean; message?: string },
): Promise<AdminWish | null> {
  const update: Record<string, unknown> = {};
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.featured !== undefined) update.is_featured = patch.featured;
  if (patch.message !== undefined) update.message = sanitizeText(patch.message, LIMITS.wishChars);
  if (!Object.keys(update).length) return null;

  if (demo()) {
    const row = demoData().wishes.find((wish) => wish.id === wishId);
    if (!row) return null;
    Object.assign(row, update);
    return shapeAdminWish(row, row.selfie_path);
  }

  const { data, error } = await supabaseAdmin()
    .from('wishes')
    .update(update)
    .eq('id', wishId)
    .select('*')
    .maybeSingle<WishRow>();

  if (error) throw new Error(error.message);
  return data ? shapeAdminWish(data) : null;
}

export async function deleteWish(wishId: string): Promise<void> {
  if (demo()) {
    const store = demoData();
    store.wishes = store.wishes.filter((wish) => wish.id !== wishId);
    return;
  }

  const { data } = await supabaseAdmin()
    .from('wishes')
    .select('selfie_path')
    .eq('id', wishId)
    .maybeSingle<{ selfie_path: string | null }>();

  if (data?.selfie_path) await deleteSelfie(data.selfie_path);

  const { error } = await supabaseAdmin().from('wishes').delete().eq('id', wishId);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ memories */

/** The organiser's private selfie collection, served as short-lived signed URLs. */
export async function listMemories(eventId: string): Promise<Memory[]> {
  if (demo()) {
    return demoWishesFor(eventId)
      .filter((wish) => wish.selfie_path)
      .map((row) => ({
        wishId: row.id,
        selfieUrl: row.selfie_path!,
        name: row.is_anonymous ? 'Anonymous' : (row.guest_name ?? 'Anonymous'),
        message: row.message,
        status: row.status,
        isPublic: row.selfie_public,
        createdAt: row.created_at,
      }));
  }

  const { data, error } = await supabaseAdmin()
    .from('wishes')
    .select('*')
    .eq('event_id', eventId)
    .not('selfie_path', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as WishRow[];
  const signed = await signSelfies(rows.map((row) => row.selfie_path!) as string[]);

  return rows
    .map((row) => {
      const url = row.selfie_path ? signed.get(row.selfie_path) : null;
      if (!url) return null;
      return {
        wishId: row.id,
        selfieUrl: url,
        name: row.is_anonymous ? 'Anonymous' : (row.guest_name ?? 'Anonymous'),
        message: row.message,
        status: row.status,
        isPublic: row.selfie_public,
        createdAt: row.created_at,
      } satisfies Memory;
    })
    .filter((entry): entry is Memory => entry !== null);
}

/** Deletes the photo but keeps the wish itself. */
export async function removeSelfie(wishId: string): Promise<void> {
  if (demo()) {
    const row = demoData().wishes.find((wish) => wish.id === wishId);
    if (row) row.selfie_path = null;
    return;
  }

  const { data } = await supabaseAdmin()
    .from('wishes')
    .select('selfie_path')
    .eq('id', wishId)
    .maybeSingle<{ selfie_path: string | null }>();

  if (data?.selfie_path) await deleteSelfie(data.selfie_path);
  await supabaseAdmin().from('wishes').update({ selfie_path: null }).eq('id', wishId);
}

/* ------------------------------------------------------------------ export */

export async function exportWishesCsv(eventId: string): Promise<string> {
  const wishes = await listWishes(eventId, { limit: 5000 });
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const header = [
    'id', 'message', 'name', 'anonymous', 'stickers', 'gifs', 'memes',
    'has_selfie', 'status', 'featured', 'preloaded', 'created_at',
  ];

  const rows = wishes.map((wish) =>
    [
      wish.id,
      wish.message,
      wish.isAnonymous ? 'Anonymous' : (wish.guestName ?? ''),
      wish.isAnonymous ? 'yes' : 'no',
      wish.stickers.join(' '),
      wish.gifs.join(' '),
      wish.memes.join(' '),
      wish.hasSelfie ? 'yes' : 'no',
      wish.status,
      wish.featured ? 'yes' : 'no',
      wish.preloaded ? 'yes' : 'no',
      wish.createdAt,
    ]
      .map(escape)
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

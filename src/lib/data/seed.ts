import 'server-only';
import { supabaseAdmin } from '../supabase/admin';
import { isSupabaseConfigured, LIMITS } from '../env';
import { demoData, demoNewId } from '../demo/store';
import { deleteSelfie, uploadSelfie, MEMORY_BUCKET } from '../images';
import { isMissingColumn, shapePublicWish } from './shape';
import { sanitizeText } from '../utils';
import type { PublicWish, WishRow, WishStatus } from '../types';

/**
 * Filling an event with test wishes.
 *
 * A wall with four messages on it tells you nothing about how a wall with a
 * hundred behaves — whether the marquee still reads, whether cards with photos
 * and four stickers each still fit, whether the live board is legible from
 * across a room. This lets an organiser generate that in one click and take it
 * away again afterwards.
 *
 * Every generated wish is stamped with SEED_MARKER in `ip_hash`, which is what
 * makes the clean-up exact: it removes what this created and cannot touch a
 * real guest's wish, because a real one always holds a salted IP hash.
 */

/** Not a valid hash — a real `ip_hash` is 32 hex characters. */
export const SEED_MARKER = 'seed-test-data';

export interface SeedWishInput {
  message: string;
  guestName?: string | null;
  isAnonymous?: boolean;
  stickers?: string[];
  gifs?: string[];
  memes?: string[];
  /** Base64 data URL, already compressed by the browser. */
  selfie?: string | null;
  selfiePublic?: boolean;
  featured?: boolean;
  status?: WishStatus;
}

const demo = () => !isSupabaseConfigured();

/** How many test wishes this event is currently carrying. */
export async function countSeededWishes(eventId: string): Promise<number> {
  if (demo()) {
    return demoData().wishes.filter(
      (wish) => wish.event_id === eventId && wish.ip_hash === SEED_MARKER,
    ).length;
  }

  const { count, error } = await supabaseAdmin()
    .from('wishes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('ip_hash', SEED_MARKER);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Inserts one batch. The client sends several small batches rather than one
 * large request so that a hundred photos do not have to fit in a single body,
 * and so progress can be shown while it happens.
 */
export async function seedWishes(
  eventId: string,
  inputs: SeedWishInput[],
): Promise<{ created: PublicWish[]; failed: number }> {
  const created: PublicWish[] = [];
  let failed = 0;

  for (const input of inputs) {
    const message = sanitizeText(input.message, LIMITS.wishChars);
    if (!message) {
      failed += 1;
      continue;
    }

    const isAnonymous = input.isAnonymous ?? false;
    const stickers = (input.stickers ?? []).slice(0, LIMITS.maxStickers);
    const gifs = (input.gifs ?? []).slice(0, LIMITS.maxGifs);
    const memes = (input.memes ?? []).slice(0, LIMITS.maxMemes);

    if (demo()) {
      const row: WishRow = {
        id: demoNewId(),
        event_id: eventId,
        message,
        guest_name: isAnonymous ? null : (input.guestName ?? null),
        is_anonymous: isAnonymous,
        sticker: stickers[0] ?? null,
        gif: gifs[0] ?? null,
        meme: memes[0] ?? null,
        stickers,
        gifs,
        memes,
        // Demo mode has no storage, so the data URL stands in for a path.
        selfie_path: input.selfie ?? null,
        selfie_public: Boolean(input.selfiePublic),
        status: input.status ?? 'approved',
        is_featured: Boolean(input.featured),
        is_preloaded: false,
        ip_hash: SEED_MARKER,
        created_at: new Date().toISOString(),
      };
      demoData().wishes.push(row);
      created.push(shapePublicWish(row, null));
      continue;
    }

    let selfiePath: string | null = null;
    try {
      if (input.selfie) selfiePath = await uploadSelfie(eventId, input.selfie);
    } catch {
      // A photo that will not upload should not cost the whole batch; the wish
      // still goes in, just without it.
      selfiePath = null;
    }

    const row: Record<string, unknown> = {
      event_id: eventId,
      message,
      guest_name: isAnonymous ? null : (input.guestName ?? null),
      is_anonymous: isAnonymous,
      sticker: stickers[0] ?? null,
      gif: gifs[0] ?? null,
      meme: memes[0] ?? null,
      stickers,
      gifs,
      memes,
      selfie_path: selfiePath,
      selfie_public: Boolean(input.selfiePublic),
      status: input.status ?? 'approved',
      is_featured: Boolean(input.featured),
      ip_hash: SEED_MARKER,
    };

    const insert = (payload: Record<string, unknown>) =>
      supabaseAdmin().from('wishes').insert(payload).select('*').single<WishRow>();

    let { data, error } = await insert(row);

    // Same migration tolerance as a real submission: seeding is often the first
    // thing an organiser tries, and it should not be the thing that reveals a
    // half-migrated database by failing opaquely.
    const missing = (['stickers', 'gifs', 'memes', 'selfie_public'] as const).find((column) =>
      isMissingColumn(error, column),
    );
    if (error && missing) {
      delete row.stickers;
      delete row.gifs;
      delete row.memes;
      delete row.selfie_public;
      ({ data, error } = await insert(row));
    }

    if (error || !data) {
      if (selfiePath) await deleteSelfie(selfiePath);
      failed += 1;
      continue;
    }
    created.push(shapePublicWish(data, null));
  }

  return { created, failed };
}

/**
 * Removes every test wish and its photo.
 *
 * The photos go first: a row deleted before its file leaves the file orphaned
 * in a private bucket with nothing left pointing at it.
 */
export async function removeSeededWishes(eventId: string): Promise<{ wishes: number; photos: number }> {
  if (demo()) {
    const store = demoData();
    const before = store.wishes.length;
    store.wishes = store.wishes.filter(
      (wish) => !(wish.event_id === eventId && wish.ip_hash === SEED_MARKER),
    );
    return { wishes: before - store.wishes.length, photos: 0 };
  }

  const { data, error } = await supabaseAdmin()
    .from('wishes')
    .select('id, selfie_path')
    .eq('event_id', eventId)
    .eq('ip_hash', SEED_MARKER);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { id: string; selfie_path: string | null }[];
  if (!rows.length) return { wishes: 0, photos: 0 };

  const paths = rows.map((row) => row.selfie_path).filter(Boolean) as string[];
  for (let i = 0; i < paths.length; i += 100) {
    await supabaseAdmin().storage.from(MEMORY_BUCKET).remove(paths.slice(i, i + 100));
  }

  const { error: deleteError } = await supabaseAdmin()
    .from('wishes')
    .delete()
    .eq('event_id', eventId)
    .eq('ip_hash', SEED_MARKER);

  if (deleteError) throw new Error(deleteError.message);
  return { wishes: rows.length, photos: paths.length };
}

import 'server-only';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../supabase/admin';
import { isSupabaseConfigured } from '../env';
import { demoData } from '../demo/store';
import { signSelfies } from '../images';
import { shapeEvent } from './shape';
import type { CelebrationEvent, EventRow, WishRow } from '../types';

const demo = () => !isSupabaseConfigured();

/** One wish as it appears in the printed keepsake. */
export interface BookWish {
  id: string;
  message: string;
  name: string | null;
  sticker: string | null;
  media: string | null;
  /** Present for every guest photo — the book is the couple's private copy. */
  selfieUrl: string | null;
  featured: boolean;
  createdAt: string;
}

export interface MemoryBook {
  event: CelebrationEvent;
  wishes: BookWish[];
  counts: {
    wishes: number;
    photos: number;
    named: number;
  };
}

/* ------------------------------------------------------------------ tokens */

function newToken(): string {
  // 32 hex chars: long enough that guessing is hopeless, short enough to paste.
  return randomBytes(16).toString('hex');
}

/** Creates the share link, or returns the existing one. */
export async function ensureBookToken(eventId: string): Promise<string | null> {
  if (demo()) {
    const row = demoData().events.find((event) => event.id === eventId) as
      | (EventRow & { book_token?: string })
      | undefined;
    if (!row) return null;
    if (!row.book_token) row.book_token = newToken();
    return row.book_token;
  }

  const { data: existing } = await supabaseAdmin()
    .from('events')
    .select('book_token')
    .eq('id', eventId)
    .maybeSingle<{ book_token: string | null }>();

  if (existing?.book_token) return existing.book_token;

  const token = newToken();
  const { error } = await supabaseAdmin()
    .from('events')
    .update({ book_token: token, book_created_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) throw new Error(error.message);
  return token;
}

/** Invalidates every link already shared. */
export async function revokeBookToken(eventId: string): Promise<void> {
  if (demo()) {
    const row = demoData().events.find((event) => event.id === eventId) as
      | (EventRow & { book_token?: string })
      | undefined;
    if (row) delete row.book_token;
    return;
  }

  const { error } = await supabaseAdmin()
    .from('events')
    .update({ book_token: null, book_created_at: null })
    .eq('id', eventId);

  if (error) throw new Error(error.message);
}

export async function getBookToken(eventId: string): Promise<string | null> {
  if (demo()) {
    const row = demoData().events.find((event) => event.id === eventId) as
      | (EventRow & { book_token?: string })
      | undefined;
    return row?.book_token ?? null;
  }

  const { data } = await supabaseAdmin()
    .from('events')
    .select('book_token')
    .eq('id', eventId)
    .maybeSingle<{ book_token: string | null }>();

  return data?.book_token ?? null;
}

/* ------------------------------------------------------------------ the book */

function shapeBookWish(row: WishRow, selfieUrl: string | null): BookWish {
  return {
    id: row.id,
    message: row.message,
    name: row.is_anonymous ? null : row.guest_name,
    sticker: row.sticker,
    media: row.gif ?? row.meme,
    selfieUrl,
    featured: row.is_featured,
    createdAt: row.created_at,
  };
}

/**
 * Everything in the keepsake, oldest first so it reads as the evening unfolded.
 *
 * Hidden and still-pending wishes are left out — the book should contain what
 * the couple would actually want to keep. Every photo is included regardless of
 * the guest's wall-visibility choice: "just the hosts" means exactly that, and
 * this book is the hosts' own copy.
 */
async function buildBook(event: CelebrationEvent, rows: WishRow[]): Promise<MemoryBook> {
  const approved = rows
    .filter((row) => row.status === 'approved')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const signed = demo()
    ? new Map<string, string>()
    : await signSelfies(
        approved.map((row) => row.selfie_path).filter(Boolean) as string[],
        60 * 60 * 6,
      );

  const wishes = approved.map((row) => {
    const url = row.selfie_path
      ? demo()
        ? row.selfie_path
        : (signed.get(row.selfie_path) ?? null)
      : null;
    return shapeBookWish(row, url);
  });

  return {
    event,
    wishes,
    counts: {
      wishes: wishes.length,
      photos: wishes.filter((wish) => wish.selfieUrl).length,
      named: new Set(wishes.map((wish) => wish.name).filter(Boolean)).size,
    },
  };
}

/** Looks up a book by its share token. Returns null for an unknown or revoked one. */
export async function getBookByToken(token: string): Promise<MemoryBook | null> {
  if (!token || token.length < 16) return null;

  if (demo()) {
    const store = demoData();
    const row = store.events.find(
      (event) => (event as EventRow & { book_token?: string }).book_token === token,
    );
    if (!row) return null;
    const wishes = store.wishes.filter((wish) => wish.event_id === row.id);
    return buildBook(shapeEvent(row), wishes);
  }

  const { data: eventRow } = await supabaseAdmin()
    .from('events')
    .select('*')
    .eq('book_token', token)
    .maybeSingle<EventRow>();

  if (!eventRow) return null;

  const { data: wishRows } = await supabaseAdmin()
    .from('wishes')
    .select('*')
    .eq('event_id', eventRow.id)
    .order('created_at', { ascending: true });

  return buildBook(shapeEvent(eventRow), (wishRows ?? []) as WishRow[]);
}

/** The organiser's own preview, without needing a token. */
export async function getBookForEvent(eventId: string): Promise<MemoryBook | null> {
  if (demo()) {
    const store = demoData();
    const row = store.events.find((event) => event.id === eventId);
    if (!row) return null;
    return buildBook(
      shapeEvent(row),
      store.wishes.filter((wish) => wish.event_id === eventId),
    );
  }

  const { data: eventRow } = await supabaseAdmin()
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle<EventRow>();

  if (!eventRow) return null;

  const { data: wishRows } = await supabaseAdmin()
    .from('wishes')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  return buildBook(shapeEvent(eventRow), (wishRows ?? []) as WishRow[]);
}

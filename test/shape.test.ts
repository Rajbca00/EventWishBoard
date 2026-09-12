import { describe, expect, it } from 'vitest';
import {
  shapePublicWish,
  shapeAdminWish,
  parseSettings,
  isMissingColumn,
  canShowPhotoOnWall,
} from '@/lib/data/shape';
import { LIMITS } from '@/lib/env';
import type { WishRow } from '@/lib/types';

const row = (over: Partial<WishRow> = {}): WishRow => ({
  id: 'w1',
  event_id: 'e1',
  message: 'Wishing you both every happiness',
  guest_name: 'Meera',
  is_anonymous: false,
  sticker: null,
  gif: null,
  meme: null,
  selfie_path: null,
  selfie_public: false,
  status: 'approved',
  is_featured: false,
  is_preloaded: false,
  ip_hash: 'abc',
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

/*
 * The list columns arrived in migration 0004. Everything below is about the two
 * shapes of row that can reach this code: one written after the migration, and
 * one written before it (or on a database that has not had it applied), where
 * only the singular columns hold anything.
 */
describe('reading decorations off a row', () => {
  it('prefers the lists when they are populated', () => {
    const wish = shapePublicWish(
      row({ sticker: '❤️', stickers: ['🎊', '🌸'], gif: '/a.svg', gifs: ['/a.svg', '/b.svg'] }),
    );
    expect(wish.stickers).toEqual(['🎊', '🌸']);
    expect(wish.gifs).toEqual(['/a.svg', '/b.svg']);
  });

  it('falls back to the single column when the list is empty', () => {
    const wish = shapePublicWish(
      row({ sticker: '❤️', stickers: [], gif: '/a.svg', gifs: [], meme: '/m.svg', memes: [] }),
    );
    expect(wish.stickers).toEqual(['❤️']);
    expect(wish.gifs).toEqual(['/a.svg']);
    expect(wish.memes).toEqual(['/m.svg']);
  });

  it('falls back when the columns are absent entirely — an un-migrated database', () => {
    const legacy = row({ sticker: '💕', gif: '/g.svg', meme: '/m.svg' });
    delete legacy.stickers;
    delete legacy.gifs;
    delete legacy.memes;

    const wish = shapePublicWish(legacy);
    expect(wish.stickers).toEqual(['💕']);
    expect(wish.gifs).toEqual(['/g.svg']);
    expect(wish.memes).toEqual(['/m.svg']);
  });

  it('gives empty lists, never null, when a wish carries nothing', () => {
    const wish = shapePublicWish(row());
    expect(wish.stickers).toEqual([]);
    expect(wish.gifs).toEqual([]);
    expect(wish.memes).toEqual([]);
  });

  it('drops empty strings and nulls that a hand-edited row might hold', () => {
    const wish = shapePublicWish(
      row({ stickers: ['', '🎉', null as unknown as string], sticker: '❤️' }),
    );
    expect(wish.stickers).toEqual(['🎉']);
  });
});

describe('what the public shape exposes', () => {
  it('never carries a photo URL unless one is handed in', () => {
    expect(shapePublicWish(row({ selfie_path: 'e1/secret.jpg' })).selfieUrl).toBeNull();
  });

  it('hides the name of an anonymous guest', () => {
    expect(shapePublicWish(row({ is_anonymous: true, guest_name: 'Meera' })).name).toBeNull();
  });

  it('keeps the name off the public shape but on the admin one', () => {
    const admin = shapeAdminWish(row({ is_anonymous: true, guest_name: 'Meera' }));
    expect(admin.name).toBeNull();
    expect(admin.guestName).toBe('Meera');
  });

  it('reports whether a photo exists without leaking where it is', () => {
    const admin = shapeAdminWish(row({ selfie_path: 'e1/secret.jpg' }));
    expect(admin.hasSelfie).toBe(true);
    expect(JSON.stringify(admin)).not.toContain('secret.jpg');
  });
});

describe('event settings', () => {
  it('fill in defaults for anything missing', () => {
    const settings = parseSettings({});
    expect(settings.charLimit).toBe(300);
    expect(settings.publicSelfies).toBe(false);
  });

  it('clamp a character limit to the app-wide range', () => {
    expect(parseSettings({ charLimit: 5000 }).charLimit).toBe(LIMITS.wishChars);
    expect(parseSettings({ charLimit: 1 }).charLimit).toBe(50);
  });

  it('refuse a negative wish cap', () => {
    expect(parseSettings({ maxWishes: -20 }).maxWishes).toBe(0);
  });

  it('treat an unknown moderation mode as automatic', () => {
    expect(parseSettings({ moderation: 'whenever' as never }).moderation).toBe('auto');
  });

  it('survive a null or a nonsense settings blob', () => {
    expect(parseSettings(null).charLimit).toBe(300);
    expect(parseSettings('not an object').charLimit).toBe(300);
  });
});

/*
 * This is what lets the app deploy before its migration has been run: the code
 * recognises "that column does not exist" and saves what it can, instead of
 * failing every guest submission until someone pastes the SQL.
 */
describe('spotting a missing column', () => {
  it('recognises PostgREST schema-cache misses', () => {
    expect(isMissingColumn({ code: 'PGRST204', message: "Could not find the 'stickers' column" }, 'stickers')).toBe(true);
  });

  it('recognises Postgres undefined_column', () => {
    expect(isMissingColumn({ code: '42703', message: 'column "gifs" does not exist' }, 'gifs')).toBe(true);
  });

  it('does not mistake an unrelated failure for a missing column', () => {
    expect(isMissingColumn({ code: '23505', message: 'duplicate key value' }, 'stickers')).toBe(false);
    expect(isMissingColumn({ code: 'PGRST204', message: "Could not find the 'memes' column" }, 'stickers')).toBe(false);
    expect(isMissingColumn(null, 'stickers')).toBe(false);
    expect(isMissingColumn(undefined, 'stickers')).toBe(false);
  });
});

/*
 * Two locks on a guest's photo. This is the only copy of the rule — it used to
 * be written out once for each data source, which is how a privacy decision
 * quietly drifts apart from itself.
 */
describe('whether a photo may appear on the public wall', () => {
  const photo = { selfie_path: 'e1/photo.jpg', selfie_public: true };

  it('shows it only when the organiser allows it AND the guest chose to share', () => {
    expect(canShowPhotoOnWall({ publicSelfies: true }, photo)).toBe(true);
  });

  it('hides it when the guest kept it for the hosts', () => {
    expect(canShowPhotoOnWall({ publicSelfies: true }, { ...photo, selfie_public: false })).toBe(false);
  });

  it('hides it when the organiser has photos on the wall switched off', () => {
    expect(canShowPhotoOnWall({ publicSelfies: false }, photo)).toBe(false);
  });

  it('hides it when the guest chose to share but never added one', () => {
    expect(canShowPhotoOnWall({ publicSelfies: true }, { ...photo, selfie_path: null })).toBe(false);
  });

  it('needs both locks open — neither alone is enough', () => {
    expect(canShowPhotoOnWall({ publicSelfies: false }, { ...photo, selfie_public: false })).toBe(false);
  });
});

describe('the live wall QR setting as stored', () => {
  it('defaults to a large code', () => {
    expect(parseSettings({}).liveQr).toBe('full');
  });

  it('keeps small and hidden', () => {
    expect(parseSettings({ liveQr: 'compact' }).liveQr).toBe('compact');
    expect(parseSettings({ liveQr: 'hidden' }).liveQr).toBe('hidden');
  });

  it('treats anything unexpected as large rather than hiding the code by accident', () => {
    expect(parseSettings({ liveQr: 'off' as never }).liveQr).toBe('full');
  });
});

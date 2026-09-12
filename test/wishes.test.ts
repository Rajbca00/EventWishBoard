import { beforeEach, describe, expect, it } from 'vitest';
import { visibleWishDecorations } from '@/components/wall/WishCard';
import {
  getWallWishes,
  submitGuestWish,
  SubmissionError,
  exportWishesCsv,
  updateWishes,
  deleteWishes,
} from '@/lib/data/wishes';
import { getEvent } from '@/lib/data/events';
import { demoData } from '@/lib/demo/store';
import { LIMITS } from '@/lib/env';
import type { CelebrationEvent, WishSubmissionInput } from './helpers';
import { freshStore, wedding } from './helpers';

/*
 * These run against the in-memory demo store, which is the same code path the
 * app takes when no Supabase credentials are present. It exercises the real
 * sanitising, moderation and shaping rather than a mock of them.
 */

let event: CelebrationEvent;

beforeEach(async () => {
  freshStore();
  event = await wedding();
});

const submit = (over: Partial<WishSubmissionInput> = {}) =>
  submitGuestWish(
    event,
    {
      message: 'Wishing you both every happiness',
      guestName: 'Meera',
      isAnonymous: false,
      stickers: [],
      gifs: [],
      memes: [],
      selfiePublic: false,
      ...over,
    } as WishSubmissionInput,
    'test-ip-hash',
  );

describe('wish card decoration cap', () => {
  it('keeps a wish card to the first two decorations across emojis, gifs and memes', () => {
    const decorations = visibleWishDecorations({
      stickers: ['🎉', '💖', '✨'],
      gifs: ['/library/gifs/balloons.svg', '/library/gifs/hearts.svg'],
      memes: ['/library/memes/finally.svg'],
    });

    expect(decorations).toEqual(['/library/gifs/balloons.svg', '/library/gifs/hearts.svg']);
    expect(decorations.length).toBeLessThanOrEqual(2);
  });
});

describe('submitting a wish', () => {
  it('returns the wish, approved, when moderation is automatic', async () => {
    const { wish, pending } = await submit();
    expect(pending).toBe(false);
    expect(wish.message).toBe('Wishing you both every happiness');
    expect(wish.name).toBe('Meera');
  });

  it('keeps every sticker, GIF and meme the guest picked', async () => {
    const { wish } = await submit({
      stickers: ['🎊', '🌸', '💖'],
      gifs: ['/library/gifs/hearts.svg', '/library/gifs/balloons.svg'],
      memes: ['/library/memes/finally.svg'],
    });
    expect(wish.stickers).toEqual(['🎊', '🌸', '💖']);
    expect(wish.gifs).toHaveLength(2);
    expect(wish.memes).toEqual(['/library/memes/finally.svg']);
  });

  it('hides the name when the guest chose to stay anonymous', async () => {
    const { wish } = await submit({ isAnonymous: true, guestName: 'Meera' });
    expect(wish.name).toBeNull();
  });

  it('strips markup out of a message rather than storing it', async () => {
    const { wish } = await submit({ message: 'Congratulations <script>alert(1)</script> both!' });
    expect(wish.message).not.toContain('<script>');
    expect(wish.message).toContain('Congratulations');
  });

  it('truncates a message to the event limit instead of refusing it', async () => {
    const { wish } = await submit({ message: 'a'.repeat(LIMITS.wishChars + 50) });
    expect(wish.message.length).toBeLessThanOrEqual(event.settings.charLimit);
  });

  it('refuses a message that is only markup', async () => {
    await expect(submit({ message: '<b></b>' })).rejects.toBeInstanceOf(SubmissionError);
  });
});

describe('the two locks on a guest photo', () => {
  it('keeps a photo private when the guest asked for that', async () => {
    await submit({ selfie: 'stand-in-path.jpg', selfiePublic: false });
    const stored = demoData().wishes.at(-1)!;
    expect(stored.selfie_public).toBe(false);
  });

  it('publishes only when the guest asks AND the organiser allows it', async () => {
    // The seeded event has public photos switched off.
    await submit({ selfie: 'stand-in-path.jpg', selfiePublic: true });
    expect(demoData().wishes.at(-1)!.selfie_public).toBe(false);

    const openEvent = { ...event, settings: { ...event.settings, publicSelfies: true } };
    await submitGuestWish(
      openEvent,
      {
        message: 'with a photo',
        guestName: '',
        isAnonymous: true,
        stickers: [],
        gifs: [],
        memes: [],
        selfie: 'stand-in-path.jpg',
        selfiePublic: true,
      } as WishSubmissionInput,
      'test-ip-hash',
    );
    expect(demoData().wishes.at(-1)!.selfie_public).toBe(true);
  });

  it('ignores a photo entirely when the event has selfies switched off', async () => {
    const noSelfies = { ...event, settings: { ...event.settings, selfieEnabled: false } };
    await submitGuestWish(
      noSelfies,
      {
        message: 'no photo allowed',
        guestName: '',
        isAnonymous: true,
        stickers: [],
        gifs: [],
        memes: [],
        selfie: 'stand-in-path.jpg',
        selfiePublic: true,
      } as WishSubmissionInput,
      'test-ip-hash',
    );
    expect(demoData().wishes.at(-1)!.selfie_path).toBeNull();
  });
});

describe('moderation', () => {
  it('holds everything for review when the organiser asked for that', async () => {
    const manual = { ...event, settings: { ...event.settings, moderation: 'manual' as const } };
    const { pending, wish } = await submitGuestWish(
      manual,
      {
        message: 'a perfectly nice wish',
        guestName: '',
        isAnonymous: true,
        stickers: [],
        gifs: [],
        memes: [],
        selfiePublic: false,
      } as WishSubmissionInput,
      'test-ip-hash',
    );
    expect(pending).toBe(true);
    expect(demoData().wishes.find((w) => w.id === wish.id)!.status).toBe('pending');
  });

  it('quarantines obvious spam even on automatic', async () => {
    const { pending } = await submit({
      message: 'Buy cheap watches now at http://spam.example.com http://spam2.example.com',
    });
    expect(pending).toBe(true);
  });
});

describe('the wall a guest sees', () => {
  it('never carries a photo URL when the event keeps photos private', async () => {
    await submit({ selfie: 'stand-in-path.jpg', selfiePublic: true });
    const wall = await getWallWishes(event);
    expect(wall.every((wish) => wish.selfieUrl === null)).toBe(true);
  });

  it('leaves pending wishes off it', async () => {
    const manual = { ...event, settings: { ...event.settings, moderation: 'manual' as const } };
    const before = (await getWallWishes(event)).length;
    await submitGuestWish(
      manual,
      {
        message: 'awaiting review',
        guestName: '',
        isAnonymous: true,
        stickers: [],
        gifs: [],
        memes: [],
        selfiePublic: false,
      } as WishSubmissionInput,
      'test-ip-hash',
    );
    const wall = await getWallWishes(event);
    expect(wall).toHaveLength(before);
    expect(wall.some((wish) => wish.message === 'awaiting review')).toBe(false);
  });

  it('is capped, however many wishes the event has collected', async () => {
    for (let i = 0; i < 90; i++) await submit({ message: `Wish number ${i}` });
    expect((await getWallWishes(event)).length).toBeLessThanOrEqual(60);
    expect(await getWallWishes(event, 12)).toHaveLength(12);
  });

  it('gives every card all three lists, and none of the singular fields', async () => {
    await submit({ stickers: ['🎉'] });
    const wall = await getWallWishes(event);
    for (const wish of wall) {
      expect(Array.isArray(wish.stickers)).toBe(true);
      expect(Array.isArray(wish.gifs)).toBe(true);
      expect(Array.isArray(wish.memes)).toBe(true);
      expect(wish).not.toHaveProperty('sticker');
      expect(wish).not.toHaveProperty('gif');
    }
  });
});

describe('bulk admin actions', () => {
  it('approves multiple wishes at once', async () => {
    const a = await submit({ message: 'first approved' });
    const b = await submit({ message: 'second approved' });

    const updated = await updateWishes([a.wish.id, b.wish.id], { status: 'approved' });

    expect(updated).toHaveLength(2);
    expect(updated.every((wish) => wish.status === 'approved')).toBe(true);
  });

  it('hides multiple wishes at once', async () => {
    const a = await submit({ message: 'first hidden' });
    const b = await submit({ message: 'second hidden' });

    const updated = await updateWishes([a.wish.id, b.wish.id], { status: 'hidden' });

    expect(updated).toHaveLength(2);
    expect(updated.every((wish) => wish.status === 'hidden')).toBe(true);
  });

  it('deletes multiple wishes at once', async () => {
    const a = await submit({ message: 'delete one' });
    const b = await submit({ message: 'delete two' });

    await deleteWishes([a.wish.id, b.wish.id]);

    expect(demoData().wishes.some((wish) => wish.id === a.wish.id)).toBe(false);
    expect(demoData().wishes.some((wish) => wish.id === b.wish.id)).toBe(false);
  });
});

describe('the CSV an organiser exports', () => {
  it('lists every decoration rather than only the first', async () => {
    await submit({ message: 'busy card', stickers: ['🎊', '🌸'], gifs: ['/a.svg', '/b.svg'] });
    const csv = await exportWishesCsv(event.id);
    const line = csv.split('\n').find((row) => row.includes('busy card'))!;
    expect(line).toContain('🎊 🌸');
    expect(line).toContain('/a.svg /b.svg');
  });

  it('quotes a message containing a comma so the columns do not shift', async () => {
    await submit({ message: 'Congratulations, both of you' });
    const csv = await exportWishesCsv(event.id);
    expect(csv).toContain('"Congratulations, both of you"');
  });

  it('names the list columns in its header', async () => {
    const csv = await exportWishesCsv(event.id);
    expect(csv.split('\n')[0]).toContain('stickers,gifs,memes');
  });
});

describe('an event that is full', () => {
  it('refuses further wishes once the organiser cap is reached', async () => {
    const capped = { ...event, settings: { ...event.settings, maxWishes: 1 } };
    const one = {
      message: 'the last one in',
      guestName: '',
      isAnonymous: true,
      stickers: [],
      gifs: [],
      memes: [],
      selfiePublic: false,
    } as WishSubmissionInput;

    await expect(submitGuestWish(capped, one, 'test-ip-hash')).rejects.toBeInstanceOf(
      SubmissionError,
    );
  });
});

describe('an event that does not exist', () => {
  it('is simply not found', async () => {
    expect(await getEvent('no-such-event')).toBeNull();
  });
});

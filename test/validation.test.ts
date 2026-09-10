import { describe, expect, it } from 'vitest';
import {
  wishSubmissionSchema,
  preloadedWishSchema,
  seedBatchSchema,
  eventSettingsSchema,
  firstIssue,
} from '@/lib/validation';
import { LIMITS } from '@/lib/env';

const parse = (input: unknown) => wishSubmissionSchema.safeParse(input);
const ok = (input: unknown) => {
  const result = parse(input);
  if (!result.success) throw new Error(`expected valid, got: ${firstIssue(result.error)}`);
  return result.data;
};

describe('wish submission — the message', () => {
  it('accepts an ordinary wish', () => {
    const wish = ok({ message: 'Wishing you both every happiness', guestName: 'Meera' });
    expect(wish.message).toBe('Wishing you both every happiness');
    expect(wish.guestName).toBe('Meera');
  });

  it('refuses an empty message, and says so in words a guest can act on', () => {
    const result = parse({ message: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toBe('Write a little something first');
  });

  it(`refuses more than ${LIMITS.wishChars} characters`, () => {
    expect(parse({ message: 'a'.repeat(LIMITS.wishChars) }).success).toBe(true);
    expect(parse({ message: 'a'.repeat(LIMITS.wishChars + 1) }).success).toBe(false);
  });

  it('trims surrounding whitespace rather than counting it', () => {
    expect(ok({ message: `  ${'a'.repeat(LIMITS.wishChars)}  ` }).message.length).toBe(
      LIMITS.wishChars,
    );
  });

  it('caps the guest name', () => {
    expect(parse({ message: 'hi', guestName: 'n'.repeat(LIMITS.nameChars + 1) }).success).toBe(false);
  });
});

describe('wish submission — decorations', () => {
  it('keeps several of each, in the order they were picked', () => {
    const wish = ok({
      message: 'hi',
      stickers: ['🎊', '🌸', '💖'],
      gifs: ['/library/gifs/hearts.svg', '/library/gifs/balloons.svg'],
      memes: ['/library/memes/finally.svg'],
    });
    expect(wish.stickers).toEqual(['🎊', '🌸', '💖']);
    expect(wish.gifs).toHaveLength(2);
    expect(wish.memes).toEqual(['/library/memes/finally.svg']);
  });

  it('defaults every list to empty rather than undefined', () => {
    const wish = ok({ message: 'just words' });
    expect(wish.stickers).toEqual([]);
    expect(wish.gifs).toEqual([]);
    expect(wish.memes).toEqual([]);
  });

  it('refuses more than the cap of each', () => {
    expect(parse({ message: 'hi', stickers: Array(LIMITS.maxStickers).fill('a').map((_, i) => `s${i}`) }).success).toBe(true);
    expect(parse({ message: 'hi', stickers: Array(LIMITS.maxStickers + 1).fill(0).map((_, i) => `s${i}`) }).success).toBe(false);
    expect(parse({ message: 'hi', gifs: Array(LIMITS.maxGifs + 1).fill(0).map((_, i) => `g${i}`) }).success).toBe(false);
    expect(parse({ message: 'hi', memes: Array(LIMITS.maxMemes + 1).fill(0).map((_, i) => `m${i}`) }).success).toBe(false);
  });

  it('collapses the same choice picked twice — a mis-tap is not a choice', () => {
    expect(ok({ message: 'hi', stickers: ['❤️', '❤️', '❤️'] }).stickers).toEqual(['❤️']);
  });

  it('refuses a blank decoration', () => {
    expect(parse({ message: 'hi', stickers: [''] }).success).toBe(false);
  });
});

/*
 * A wish that fails to send is kept on the device and retried later, so a draft
 * written before multi-select shipped can still arrive days afterwards. If the
 * schema stopped accepting the old shape, those wishes would be silently thrown
 * away — precisely the ones the retry logic exists to rescue.
 */
describe('wish submission — drafts from the previous version', () => {
  it('accepts the old single-value fields', () => {
    const wish = ok({
      message: 'queued before the update',
      sticker: '💕',
      gif: '/library/gifs/hearts.svg',
      meme: '/library/memes/finally.svg',
    });
    expect(wish.stickers).toEqual(['💕']);
    expect(wish.gifs).toEqual(['/library/gifs/hearts.svg']);
    expect(wish.memes).toEqual(['/library/memes/finally.svg']);
  });

  it('merges a legacy field into a list, keeping the list first', () => {
    expect(ok({ message: 'hi', stickers: ['🎉', '✨'], sticker: '🎂' }).stickers).toEqual([
      '🎉',
      '✨',
      '🎂',
    ]);
  });

  it('does not duplicate when the legacy field repeats a list entry', () => {
    expect(ok({ message: 'hi', stickers: ['🎉'], sticker: '🎉' }).stickers).toEqual(['🎉']);
  });

  it('still respects the cap once merged', () => {
    const stickers = ['a', 'b', 'c', 'd'].slice(0, LIMITS.maxStickers);
    expect(ok({ message: 'hi', stickers, sticker: 'z' }).stickers).toHaveLength(LIMITS.maxStickers);
  });
});

describe('wish submission — the photo', () => {
  const jpeg = (bytes: number) =>
    `data:image/jpeg;base64,${Buffer.alloc(bytes, 1).toString('base64')}`;

  it('accepts a photo comfortably under the cap', () => {
    expect(parse({ message: 'hi', selfie: jpeg(400_000) }).success).toBe(true);
  });

  it('refuses one past it, before anything decodes the bytes', () => {
    const result = parse({ message: 'hi', selfie: jpeg(LIMITS.selfieBytes * 2) });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toBe('That photo is too large');
  });

  it('refuses a non-image data URL', () => {
    expect(parse({ message: 'hi', selfie: 'data:text/html;base64,PGgxPmhpPC9oMT4=' }).success).toBe(
      false,
    );
    expect(parse({ message: 'hi', selfie: 'https://example.com/photo.jpg' }).success).toBe(false);
  });

  it('treats no photo and a null photo the same', () => {
    expect(ok({ message: 'hi', selfie: null }).selfie).toBeNull();
    expect(ok({ message: 'hi' }).selfie).toBeUndefined();
  });

  it('defaults the sharing choice to private', () => {
    expect(ok({ message: 'hi', selfie: jpeg(1000) }).selfiePublic).toBe(false);
  });
});

describe('preloaded wishes', () => {
  it('are anonymous unless told otherwise', () => {
    const parsed = preloadedWishSchema.parse({ message: 'A warm start' });
    expect(parsed.isAnonymous).toBe(true);
  });

  it('take a list of stickers', () => {
    expect(preloadedWishSchema.parse({ message: 'hi', stickers: ['🎂', '🥂'] }).stickers).toEqual([
      '🎂',
      '🥂',
    ]);
  });
});

describe('test-data batches', () => {
  const wish = { message: 'test' };

  it('accept a full batch of ten', () => {
    expect(seedBatchSchema.safeParse({ wishes: Array(10).fill(wish) }).success).toBe(true);
  });

  it('refuse an eleventh, so one request never carries too many photos', () => {
    expect(seedBatchSchema.safeParse({ wishes: Array(11).fill(wish) }).success).toBe(false);
  });

  it('refuse an empty batch', () => {
    expect(seedBatchSchema.safeParse({ wishes: [] }).success).toBe(false);
  });
});

describe('event settings', () => {
  const base = {
    selfieEnabled: true,
    wallEnabled: true,
    publicSelfies: false,
    moderation: 'auto' as const,
    charLimit: 300,
    maxWishes: 0,
    useDefaultAssets: true,
    showInstagram: true,
    showReview: true,
  };

  it('accept a sane set', () => {
    expect(eventSettingsSchema.safeParse(base).success).toBe(true);
  });

  it('refuse a character limit above the app-wide maximum', () => {
    expect(
      eventSettingsSchema.safeParse({ ...base, charLimit: LIMITS.wishChars + 1 }).success,
    ).toBe(false);
  });

  it('refuse an unknown moderation mode', () => {
    expect(eventSettingsSchema.safeParse({ ...base, moderation: 'whenever' }).success).toBe(false);
  });
});

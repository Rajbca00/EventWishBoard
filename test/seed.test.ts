import { beforeEach, describe, expect, it } from 'vitest';
import { countSeededWishes, removeSeededWishes, seedWishes, SEED_MARKER } from '@/lib/data/seed';
import { getWallWishes, submitGuestWish } from '@/lib/data/wishes';
import { demoData } from '@/lib/demo/store';
import { LIMITS } from '@/lib/env';
import { freshStore, wedding, EVENT_IDS, type CelebrationEvent, type WishSubmissionInput } from './helpers';

let event: CelebrationEvent;

beforeEach(async () => {
  freshStore();
  event = await wedding();
});

const batch = (n: number, over: Partial<Parameters<typeof seedWishes>[1][number]> = {}) =>
  Array.from({ length: n }, (_, i) => ({ message: `Test wish ${i + 1}`, ...over }));

describe('generating test wishes', () => {
  it('creates what it was asked for', async () => {
    const { created, failed } = await seedWishes(event.id, batch(10));
    expect(created).toHaveLength(10);
    expect(failed).toBe(0);
    expect(await countSeededWishes(event.id)).toBe(10);
  });

  it('stamps every one so it can be found again', async () => {
    await seedWishes(event.id, batch(3));
    const stamped = demoData().wishes.filter((wish) => wish.ip_hash === SEED_MARKER);
    expect(stamped).toHaveLength(3);
  });

  it('uses a marker that could never be a real IP hash', () => {
    // Real hashes are 32 hex characters; this is deliberately neither.
    expect(SEED_MARKER).not.toMatch(/^[0-9a-f]{32}$/);
  });

  it('carries decorations through, capped', async () => {
    const { created } = await seedWishes(event.id, [
      {
        message: 'busy card',
        stickers: ['🎊', '🌸', '💖', '🥂', '🎂', '✨'],
        gifs: ['/a.svg', '/b.svg', '/c.svg'],
        memes: ['/m1.svg', '/m2.svg', '/m3.svg'],
      },
    ]);
    expect(created[0]!.stickers).toHaveLength(LIMITS.maxStickers);
    expect(created[0]!.gifs).toHaveLength(LIMITS.maxGifs);
    expect(created[0]!.memes).toHaveLength(LIMITS.maxMemes);
  });

  it('counts an unusable wish as failed instead of throwing the batch away', async () => {
    const { created, failed } = await seedWishes(event.id, [
      { message: 'a good one' },
      { message: '   ' },
      { message: 'another good one' },
    ]);
    expect(created).toHaveLength(2);
    expect(failed).toBe(1);
  });

  it('honours the anonymous flag', async () => {
    const { created } = await seedWishes(event.id, [
      { message: 'from nobody', isAnonymous: true, guestName: 'Meera' },
    ]);
    expect(created[0]!.name).toBeNull();
  });

  it('puts them on the wall', async () => {
    const before = (await getWallWishes(event)).length;
    await seedWishes(event.id, batch(20));
    expect((await getWallWishes(event)).length).toBeGreaterThan(before);
  });
});

describe('removing test wishes', () => {
  it('takes back exactly what it created', async () => {
    await seedWishes(event.id, batch(25));
    const { wishes } = await removeSeededWishes(event.id);
    expect(wishes).toBe(25);
    expect(await countSeededWishes(event.id)).toBe(0);
  });

  /*
   * The whole point of the marker. A clean-up that matched on anything looser —
   * "recent", "no IP", "looks generated" — could take a real guest's wish with
   * it, and at that point the tool has destroyed the thing it exists to test.
   */
  it('leaves real wishes and preloaded ones completely alone', async () => {
    const realWish = await submitGuestWish(
      event,
      {
        message: 'A real guest wrote this',
        guestName: 'Meera',
        isAnonymous: false,
        stickers: ['❤️'],
        gifs: [],
        memes: [],
        selfiePublic: false,
      } as WishSubmissionInput,
      'a-real-salted-hash',
    );

    const before = demoData().wishes.length;
    await seedWishes(event.id, batch(30));
    await removeSeededWishes(event.id);

    expect(demoData().wishes).toHaveLength(before);
    expect(demoData().wishes.some((wish) => wish.id === realWish.wish.id)).toBe(true);
    expect(demoData().wishes.some((wish) => wish.message === 'A real guest wrote this')).toBe(true);
    expect(demoData().wishes.filter((wish) => wish.is_preloaded).length).toBeGreaterThan(0);
  });

  it('does not reach into another event', async () => {
    await seedWishes(event.id, batch(5));
    await seedWishes(EVENT_IDS.birthday, batch(7));

    await removeSeededWishes(event.id);

    expect(await countSeededWishes(event.id)).toBe(0);
    expect(await countSeededWishes(EVENT_IDS.birthday)).toBe(7);
  });

  it('is safe to run when there is nothing to remove', async () => {
    expect(await removeSeededWishes(event.id)).toEqual({ wishes: 0, photos: 0 });
  });

  it('is safe to run twice', async () => {
    await seedWishes(event.id, batch(4));
    expect((await removeSeededWishes(event.id)).wishes).toBe(4);
    expect((await removeSeededWishes(event.id)).wishes).toBe(0);
  });
});

describe('counting', () => {
  it('starts at nothing on a fresh event', async () => {
    expect(await countSeededWishes(event.id)).toBe(0);
  });

  it('counts only this event', async () => {
    await seedWishes(EVENT_IDS.birthday, batch(6));
    expect(await countSeededWishes(event.id)).toBe(0);
    expect(await countSeededWishes(EVENT_IDS.birthday)).toBe(6);
  });
});

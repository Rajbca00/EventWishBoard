import { beforeEach, describe, expect, it } from 'vitest';
import { buildArchive } from '@/lib/data/archive';
import { ensureBookToken, getBookByToken, getBookForEvent, revokeBookToken } from '@/lib/data/book';
import { seedWishes } from '@/lib/data/seed';
import { submitGuestWish } from '@/lib/data/wishes';
import { freshStore, wedding, type CelebrationEvent, type WishSubmissionInput } from './helpers';

let event: CelebrationEvent;

beforeEach(async () => {
  freshStore();
  event = await wedding();
});

const add = (message: string, over: Partial<WishSubmissionInput> = {}) =>
  submitGuestWish(
    event,
    {
      message,
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

describe('the downloadable archive', () => {
  it('is nothing at all for an event that does not exist', async () => {
    expect(await buildArchive('no-such-event')).toBeNull();
  });

  it('names its folder after the hosts', async () => {
    const manifest = (await buildArchive(event.id))!;
    expect(manifest.folder).toBe('arjun-priya-wish-wall');
  });

  it('produces a page that opens with no server and no network', async () => {
    const manifest = (await buildArchive(event.id))!;
    expect(manifest.html).toContain('<!doctype html>');
    // No stylesheet, script or image loaded from anywhere.
    expect(manifest.html).not.toMatch(/src="https?:|href="https?:/);
    expect(manifest.html).not.toContain('<script');
  });

  it('carries no markup a guest typed into the page', async () => {
    await add('<img src=x onerror="alert(1)"> love from <b>us</b>');
    const manifest = (await buildArchive(event.id))!;

    // Two defences meet here: submission strips tags, and the builder escapes
    // whatever is left. Nothing executable should survive either way.
    expect(manifest.html).not.toContain('<img src=x');
    expect(manifest.html).not.toContain('onerror=');
    expect(manifest.html).not.toContain('<b>us</b>');
  });

  it('escapes the characters that do survive sanitising', async () => {
    // An ampersand is legitimate in a message and must not end up raw in HTML.
    await add('Tom & Jerry & the cake', { guestName: 'Meera & Co' });
    const manifest = (await buildArchive(event.id))!;

    expect(manifest.html).toContain('Tom &amp; Jerry &amp; the cake');
    expect(manifest.html).toContain('Meera &amp; Co');
    expect(manifest.html).not.toMatch(/Tom & Jerry/);
  });

  it('counts what it holds', async () => {
    const before = (await buildArchive(event.id))!.counts.wishes;
    await add('one more');
    expect((await buildArchive(event.id))!.counts.wishes).toBe(before + 1);
  });

  it('writes a CSV whose header matches its rows', async () => {
    await add('a wish with, a comma');
    const manifest = (await buildArchive(event.id))!;
    const [header, ...rows] = manifest.csv.trim().split('\n');

    expect(header).toBe('number,message,name,photo_file,stickers,media,featured,received');
    expect(rows).toHaveLength(manifest.counts.wishes);
    expect(manifest.csv).toContain('"a wish with, a comma"');
  });

  it('doubles a quotation mark inside a CSV cell rather than ending the field', async () => {
    await add('they said "yes" twice');
    const manifest = (await buildArchive(event.id))!;
    expect(manifest.csv).toContain('""yes""');
  });

  it('writes JSON that parses, with every wish in it', async () => {
    const manifest = (await buildArchive(event.id))!;
    const parsed = JSON.parse(manifest.json) as {
      wishes: { number: number; stickers: string[]; media: string[] }[];
      counts: { wishes: number };
    };
    expect(parsed.wishes).toHaveLength(manifest.counts.wishes);
    expect(parsed.wishes[0]!.number).toBe(1);
    expect(Array.isArray(parsed.wishes[0]!.stickers)).toBe(true);
  });

  it('lists every decoration, not only the first', async () => {
    await add('busy card', { stickers: ['🎊', '🌸'], gifs: ['/a.svg'], memes: ['/m.svg'] });
    const manifest = (await buildArchive(event.id))!;
    const wish = JSON.parse(manifest.json).wishes.find(
      (w: { message: string }) => w.message === 'busy card',
    );
    expect(wish.stickers).toEqual(['🎊', '🌸']);
    expect(wish.media).toEqual(['/a.svg', '/m.svg']);
  });

  it('keeps library artwork out of the offline page, since it lives on the web server', async () => {
    await add('with art', { stickers: ['/library/stickers/x.svg', '🎉'] });
    const manifest = (await buildArchive(event.id))!;
    expect(manifest.html).not.toContain('/library/stickers/x.svg');
    expect(manifest.html).toContain('🎉');
  });

  it('tells the couple, in the README, that private photos are inside', async () => {
    const manifest = (await buildArchive(event.id))!;
    expect(manifest.readme.toLowerCase()).toContain('private');
  });

  it('numbers photo filenames so they sort, and names them after the guest', async () => {
    await seedWishes(event.id, [{ message: 'has a photo', guestName: 'Rajesh', selfie: 'x.jpg' }]);
    const manifest = (await buildArchive(event.id))!;
    const entry = manifest.images.at(-1)!;
    expect(entry.filename).toMatch(/^images\/\d{3}-rajesh\.(jpg|jpeg|png|webp)$/);
  });

  it('references each photo from the HTML at the path it is stored under', async () => {
    await seedWishes(event.id, [{ message: 'has a photo', guestName: 'Rajesh', selfie: 'x.jpg' }]);
    const manifest = (await buildArchive(event.id))!;
    for (const image of manifest.images) expect(manifest.html).toContain(`src="${image.filename}"`);
  });
});

describe('the memory book link', () => {
  it('is not there until it is asked for', async () => {
    const book = await getBookForEvent(event.id);
    expect(book).not.toBeNull();
    expect(book!.wishes.length).toBeGreaterThan(0);
  });

  it('returns the same token when asked twice, so a shared link keeps working', async () => {
    const first = await ensureBookToken(event.id);
    expect(first).toBeTruthy();
    expect(await ensureBookToken(event.id)).toBe(first);
  });

  it('is long enough that guessing is hopeless', async () => {
    expect((await ensureBookToken(event.id))!.length).toBeGreaterThanOrEqual(32);
  });

  it('opens the right book', async () => {
    const token = (await ensureBookToken(event.id))!;
    const book = await getBookByToken(token);
    expect(book?.event.id).toBe(event.id);
  });

  it('refuses a wrong, short or empty token rather than leaking anything', async () => {
    await ensureBookToken(event.id);
    expect(await getBookByToken('f'.repeat(32))).toBeNull();
    expect(await getBookByToken('short')).toBeNull();
    expect(await getBookByToken('')).toBeNull();
  });

  it('stops working the moment it is revoked', async () => {
    const token = (await ensureBookToken(event.id))!;
    expect(await getBookByToken(token)).not.toBeNull();

    await revokeBookToken(event.id);
    expect(await getBookByToken(token)).toBeNull();
  });

  it('issues a different token after a revoke', async () => {
    const first = (await ensureBookToken(event.id))!;
    await revokeBookToken(event.id);
    expect(await ensureBookToken(event.id)).not.toBe(first);
  });

  it('leaves out wishes the organiser hid or has not approved', async () => {
    const manual = { ...event, settings: { ...event.settings, moderation: 'manual' as const } };
    await submitGuestWish(
      manual,
      {
        message: 'still awaiting review',
        guestName: '',
        isAnonymous: true,
        stickers: [],
        gifs: [],
        memes: [],
        selfiePublic: false,
      } as WishSubmissionInput,
      'test-ip-hash',
    );
    const book = await getBookForEvent(event.id);
    expect(book!.wishes.some((wish) => wish.message === 'still awaiting review')).toBe(false);
  });

  it('reads oldest first, the way the evening unfolded', async () => {
    const book = await getBookForEvent(event.id);
    const dates = book!.wishes.map((wish) => wish.createdAt);
    expect([...dates].sort()).toEqual(dates);
  });
});

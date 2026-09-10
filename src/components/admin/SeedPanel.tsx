'use client';

import { useCallback, useState } from 'react';
import { FlaskConical, Trash2 } from 'lucide-react';
import { processImage } from '@/lib/image-client';
import { LIMITS } from '@/lib/env';
import type { AssetLibrary, CelebrationEvent } from '@/lib/types';

interface Props {
  event: CelebrationEvent;
  /** The same library a guest sees, so test wishes use the real stickers. */
  assets: AssetLibrary;
  /** Counted on the server, so the button reads correctly before any fetch. */
  initialSeeded: number;
}

/* ------------------------------------------------------------------ content */

const OPENERS = [
  'Wishing you both',
  'So happy for you',
  'Congratulations',
  'Here is to',
  'May you always have',
  'What a day',
  'Thank you for having us',
  'To the two of you',
  'Cannot stop smiling about',
  'Sending you',
];

const BODIES = [
  'a lifetime of small, ordinary, perfect days together',
  'more laughter than you know what to do with',
  'every good thing this next chapter can hold',
  'slow mornings, long dinners and a house full of noise',
  'the kind of love the rest of us keep writing songs about',
  'patience on the hard days and cake on the good ones',
  'adventures that make excellent stories later',
  'a marriage as warm as this evening has been',
  'someone who still makes you laugh at breakfast',
  'the courage to keep choosing each other',
  'quiet Sundays and dancing in the kitchen',
  'friends who show up and family who stay',
];

const TAILS = [
  '',
  ' We love you both.',
  ' Save us a slice.',
  ' See you on the dance floor!',
  ' What a beautiful day this has been.',
  ' Thank you for letting us be part of it.',
  ' Cannot wait for the next one.',
];

const NAMES = [
  'Meera', 'Rajesh', 'Ananya', 'Vikram', 'Priya', 'Arjun', 'Kavya', 'Rohit',
  'Divya', 'Nikhil', 'Sneha', 'Karthik', 'Lakshmi', 'Aditya', 'Pooja', 'Suresh',
  'Deepa', 'Manoj', 'Anita', 'Ravi', 'Shreya', 'Varun', 'Nandini', 'Sanjay',
  'Aunty Latha', 'Uncle Mohan', 'The Iyers', 'Grandma Kamala', 'Team Finance',
  'Your cousins in Chennai',
];

/** Deterministic-ish variety without pulling in a PRNG. */
const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;

function makeMessage(): string {
  const text = `${pick(OPENERS)} ${pick(BODIES)}.${pick(TAILS)}`;
  return text.slice(0, LIMITS.wishChars);
}

/* ------------------------------------------------------------------ photos */

const PALETTES: [string, string, string][] = [
  ['#f6e2c8', '#b9738a', '#4a2c33'],
  ['#dbe9f4', '#7c9cc4', '#2f3f56'],
  ['#f7e9d0', '#d7a26a', '#5c4030'],
  ['#e8e2f4', '#9b86c4', '#3b3350'],
  ['#e2f0e6', '#7fa98c', '#2f4436'],
  ['#fbe4e6', '#d98b98', '#54303a'],
];

/**
 * A stand-in portrait: lit background, a figure, some grain.
 *
 * It is not a photograph, but it is the right shape, the right tonal range and
 * the right file size once compressed, which is what the layout is being tested
 * against. It also goes through `processImage`, the same path a guest's camera
 * roll takes, so the stored files are ordinary JPEGs of ordinary size.
 */
async function makePhoto(index: number): Promise<string> {
  const portrait = index % 5 !== 0;
  const w = portrait ? 1400 : 1750;
  const h = portrait ? 1750 : 1400;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot generate test photos');

  const [light, mid, dark] = PALETTES[index % PALETTES.length]!;

  const bg = ctx.createLinearGradient(0, 0, w * 0.6, h);
  bg.addColorStop(0, light);
  bg.addColorStop(0.55, mid);
  bg.addColorStop(1, dark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Out-of-focus lights behind the subject.
  for (let i = 0; i < 14; i++) {
    const r = (0.03 + Math.random() * 0.09) * w;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h * 0.8, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${30 + Math.random() * 40},70%,80%,${0.06 + Math.random() * 0.14})`;
    ctx.fill();
  }

  // The figure: shoulders, neck, head, hair.
  const cx = w / 2 + (Math.random() - 0.5) * w * 0.1;
  const headR = w * 0.17;
  const headY = h * 0.42;

  ctx.fillStyle = `hsl(${20 + Math.random() * 15},${28 + Math.random() * 18}%,${34 + Math.random() * 30}%)`;
  ctx.beginPath();
  ctx.ellipse(cx, h * 1.02, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  const skin = `hsl(${26 + Math.random() * 8},${38 + Math.random() * 14}%,${52 + Math.random() * 26}%)`;
  ctx.fillStyle = skin;
  ctx.fillRect(cx - headR * 0.4, headY, headR * 0.8, headR * 1.6);
  ctx.beginPath();
  ctx.ellipse(cx, headY, headR * 0.82, headR, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `hsl(${20 + Math.random() * 20},30%,${12 + Math.random() * 14}%)`;
  ctx.beginPath();
  ctx.ellipse(cx, headY - headR * 0.34, headR * 0.86, headR * 0.7, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Grain, so the encoder has something real to chew on.
  const grain = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    grain.data[i] += n;
    grain.data[i + 1] += n;
    grain.data[i + 2] += n;
  }
  ctx.putImageData(grain, 0, 0);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw a test photo'))), 'image/jpeg', 0.95),
  );
  return (await processImage(blob)).dataUrl;
}

/* ------------------------------------------------------------------ panel */

type Phase = 'idle' | 'working' | 'removing';

const BATCH = 10;

export default function SeedPanel({ event, assets, initialSeeded }: Props) {
  const [count, setCount] = useState(100);
  const [photos, setPhotos] = useState(40);
  const [publicPhotos, setPublicPhotos] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [done, setDone] = useState(0);
  const [seeded, setSeeded] = useState(initialSeeded);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = `/api/admin/events/${event.id}/seed`;
  const busy = phase !== 'idle';

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { seeded: number };
      setSeeded(data.seeded);
    } catch {
      // A failed count is not worth an error message.
    }
  }, [url]);

  const stickerValues = assets.stickers.map((a) => a.emoji ?? a.url).filter(Boolean) as string[];
  const gifValues = assets.gifs.map((a) => a.url).filter(Boolean) as string[];
  const memeValues = assets.memes.map((a) => a.url).filter(Boolean) as string[];

  const some = (pool: string[], max: number) => {
    if (!pool.length) return [];
    const how = Math.floor(Math.random() * (max + 1));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, how);
  };

  const run = async () => {
    setError(null);
    setNote(null);
    setDone(0);
    setPhase('working');

    const total = Math.max(1, Math.min(500, count));
    const withPhoto = Math.max(0, Math.min(total, photos));
    let created = 0;
    let failed = 0;

    /*
     * Which wishes get a photo, spread across the whole run rather than taken
     * from the front. The wall shows the most recent sixty: front-loading the
     * photos put them all outside that window, so an organiser asking for a
     * hundred wishes with forty photos saw a wall with almost none.
     */
    const photoAt = new Set(
      Array.from({ length: total }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, withPhoto),
    );

    try {
      for (let start = 0; start < total; start += BATCH) {
        const batch = [];
        for (let i = start; i < Math.min(start + BATCH, total); i++) {
          const anonymous = i % 7 === 0;
          batch.push({
            message: makeMessage(),
            guestName: anonymous ? null : pick(NAMES),
            isAnonymous: anonymous,
            stickers: some(stickerValues, LIMITS.maxStickers),
            gifs: some(gifValues, LIMITS.maxGifs),
            memes: some(memeValues, LIMITS.maxMemes),
            selfie: photoAt.has(i) ? await makePhoto(i) : null,
            selfiePublic: photoAt.has(i) && publicPhotos,
            featured: i % 25 === 0,
          });
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wishes: batch }),
        });

        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(detail?.error ?? `The server refused a batch (${response.status})`);
        }

        const result = (await response.json()) as { created: number; failed: number };
        created += result.created;
        failed += result.failed;
        setDone(Math.min(start + BATCH, total));
      }

      setNote(
        `Added ${created} test wish${created === 1 ? '' : 'es'}` +
          (withPhoto ? ` — ${Math.min(withPhoto, created)} with a photo.` : '.') +
          (failed ? ` ${failed} could not be saved.` : ''),
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The test wishes could not be added');
    } finally {
      setPhase('idle');
    }
  };

  const remove = async () => {
    setError(null);
    setNote(null);
    setPhase('removing');
    try {
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove the test wishes');
      const result = (await response.json()) as { wishes: number; photos: number };
      setNote(
        result.wishes
          ? `Removed ${result.wishes} test wish${result.wishes === 1 ? '' : 'es'}` +
              (result.photos ? ` and ${result.photos} photo${result.photos === 1 ? '' : 's'}.` : '.')
          : 'There were no test wishes to remove.',
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the test wishes');
    } finally {
      setPhase('idle');
    }
  };

  const photosInvisible = photos > 0 && publicPhotos && !event.settings.publicSelfies;

  return (
    <div className="p-5">
      <p className="mb-4 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
        Fills this event with generated wishes so you can see how the wall, the live board and
        the memory book look when they are full. Every one is tagged as test data and comes back
        out in a single click.
      </p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[0.78rem] font-medium text-[var(--ink)]">
            How many wishes
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={count}
            disabled={busy}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-10 w-full rounded-xl border border-[var(--card-line)] bg-white px-3 text-[0.9rem] text-[var(--ink)] disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.78rem] font-medium text-[var(--ink)]">
            How many with a photo
          </span>
          <input
            type="number"
            min={0}
            max={500}
            value={photos}
            disabled={busy}
            onChange={(e) => setPhotos(Number(e.target.value))}
            className="h-10 w-full rounded-xl border border-[var(--card-line)] bg-white px-3 text-[0.9rem] text-[var(--ink)] disabled:opacity-60"
          />
        </label>
      </div>

      <label className="mb-4 flex items-start gap-2.5 text-[0.84rem] text-[var(--ink-soft)]">
        <input
          type="checkbox"
          checked={publicPhotos}
          disabled={busy}
          onChange={(e) => setPublicPhotos(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span>
          Mark the test photos as shown on the wall.
          {photosInvisible && (
            <span className="mt-1 block text-[var(--accent-2)]">
              This event has guest photos on the wall switched off, so they will only appear in the
              dashboard and the memory book. Turn on &ldquo;Show guest photos&rdquo; above to see
              them on the wall itself.
            </span>
          )}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
        >
          <FlaskConical className="size-4" />
          {phase === 'working' ? `Adding ${done}/${Math.min(500, count)}…` : 'Add test wishes'}
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={busy || seeded === 0}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--card-line)] px-4 text-[0.85rem] text-[var(--ink)] transition-colors hover:bg-cocoa-50 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
          {phase === 'removing'
            ? 'Removing…'
            : seeded
              ? `Remove ${seeded} test wish${seeded === 1 ? '' : 'es'}`
              : 'Remove test wishes'}
        </button>
      </div>

      {phase === 'working' && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cocoa-100">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
            style={{ width: `${Math.round((done / Math.max(1, Math.min(500, count))) * 100)}%` }}
          />
        </div>
      )}

      {note && <p className="mt-3 text-[0.84rem] text-emerald-700">{note}</p>}
      {error && (
        <p className="mt-3 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
        The photos are generated drawings, not real people, and they are compressed by the same
        code a guest&apos;s camera goes through — so 100 of them costs roughly the storage 100 real
        ones would. Remove them before the event so guests never see them.
      </p>
    </div>
  );
}

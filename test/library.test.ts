import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGuestAssets } from '@/lib/data/assets';
import { wedding, freshStore } from './helpers';

/*
 * The sticker, GIF and meme library lives in three places that have to agree:
 * files on disk, the SQL that seeds a real database, and the in-memory demo
 * store. They have drifted before, and the symptom is a broken image on a
 * guest's phone at somebody's wedding, which is the worst possible place to
 * discover it.
 */

const GIF_DIR = join(process.cwd(), 'public/library/gifs');
const MEME_DIR = join(process.cwd(), 'public/library/memes');
const MIGRATIONS = join(process.cwd(), 'supabase/migrations');

const svgFiles = (dir: string) => readdirSync(dir).filter((name) => name.endsWith('.svg'));
const read = (dir: string, name: string) => readFileSync(join(dir, name), 'utf8');

const migrationSql = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(join(MIGRATIONS, name), 'utf8'))
  .join('\n');

const allSvgs = [
  ...svgFiles(GIF_DIR).map((name) => ({ dir: GIF_DIR, name, kind: 'gif' as const })),
  ...svgFiles(MEME_DIR).map((name) => ({ dir: MEME_DIR, name, kind: 'meme' as const })),
];

describe('the artwork on disk', () => {
  it('has a decent number of pieces in each shelf', () => {
    expect(svgFiles(GIF_DIR).length).toBeGreaterThanOrEqual(11);
    expect(svgFiles(MEME_DIR).length).toBeGreaterThanOrEqual(8);
  });

  it.each(allSvgs)('$name is a well-formed SVG', ({ dir, name }) => {
    const svg = read(dir, name);
    expect(svg.trimStart().startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
  });

  /*
   * The whole shelf once looked static because every file switched its own CSS
   * animation off under `prefers-reduced-motion`. These are stand-ins for
   * animated GIFs, and no browser stops a GIF for that setting, so the motion
   * is SMIL — which is not gated by it.
   */
  it.each(allSvgs)('$name actually animates', ({ dir, name }) => {
    const svg = read(dir, name);
    const smilTags = (svg.match(/<animate(Transform|Motion)?[\s>]/g) ?? []).length;
    expect(smilTags).toBeGreaterThan(0);
  });

  it.each(allSvgs)('$name carries no rule that would switch its motion off', ({ dir, name }) => {
    expect(read(dir, name)).not.toContain('prefers-reduced-motion');
  });

  it.each(allSvgs)('$name declares repeating, indefinite motion', ({ dir, name }) => {
    expect(read(dir, name)).toContain('repeatCount="indefinite"');
  });

  it.each(allSvgs)('$name stays small enough to send to a phone', ({ dir, name }) => {
    expect(statSync(join(dir, name)).size).toBeLessThan(64 * 1024);
  });

  it.each(allSvgs)('$name loads nothing from the network', ({ dir, name }) => {
    const svg = read(dir, name);
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(svg).not.toContain('<script');
  });
});

describe('the three places the library is listed', () => {
  it('every file the migrations reference exists on disk', () => {
    const referenced = [...migrationSql.matchAll(/'(\/library\/[^']+)'/g)].map((m) => m[1]!);
    expect(referenced.length).toBeGreaterThan(0);

    const missing = referenced.filter((path) => {
      const dir = path.includes('/gifs/') ? GIF_DIR : MEME_DIR;
      return !svgFiles(dir).includes(path.split('/').pop()!);
    });
    expect(missing).toEqual([]);
  });

  it('every file on disk is offered to guests by the demo store', async () => {
    freshStore();
    const assets = await getGuestAssets(await wedding());
    const offered = new Set([...assets.gifs, ...assets.memes].map((asset) => asset.url));

    const onDisk = [
      ...svgFiles(GIF_DIR).map((name) => `/library/gifs/${name}`),
      ...svgFiles(MEME_DIR).map((name) => `/library/memes/${name}`),
    ];
    expect(onDisk.filter((path) => !offered.has(path))).toEqual([]);
  });

  it('the demo store and the migrations offer the same artwork', async () => {
    freshStore();
    const assets = await getGuestAssets(await wedding());
    const inDemo = [...assets.gifs, ...assets.memes].map((asset) => asset.url!).sort();
    const inSql = [...new Set([...migrationSql.matchAll(/'(\/library\/[^']+)'/g)].map((m) => m[1]!))].sort();

    expect(inDemo).toEqual(inSql);
  });

  it('offers a generous spread of emoji stickers', async () => {
    freshStore();
    const assets = await getGuestAssets(await wedding());
    expect(assets.stickers.length).toBeGreaterThanOrEqual(24);
    expect(assets.stickers.every((sticker) => Boolean(sticker.emoji))).toBe(true);
  });

  it('gives every emoji sticker in the migrations a home in the demo store too', async () => {
    freshStore();
    const assets = await getGuestAssets(await wedding());
    const demoEmoji = new Set(assets.stickers.map((sticker) => sticker.emoji));

    // Emoji rows in the SQL look like: ('🎊', 'Party popper', 130)
    const sqlEmoji = [...migrationSql.matchAll(/\(\s*'([^\p{ASCII}][^']*)',\s*'[^']+',\s*\d+\s*\)/gu)]
      .map((m) => m[1]!)
      .filter((value) => !value.startsWith('/'));

    expect(sqlEmoji.length).toBeGreaterThan(0);
    expect(sqlEmoji.filter((emoji) => !demoEmoji.has(emoji))).toEqual([]);
  });

  it('names every asset, so the picker has something to show on hover', async () => {
    freshStore();
    const assets = await getGuestAssets(await wedding());
    const all = [...assets.stickers, ...assets.gifs, ...assets.memes];
    expect(all.filter((asset) => !asset.name.trim())).toEqual([]);
  });
});

describe('the migrations themselves', () => {
  it('re-run without duplicating the library', () => {
    const inserts = migrationSql.match(/insert into public\.assets/g) ?? [];
    const guards = migrationSql.match(/where not exists/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(inserts.length);
  });

  it('add the decoration columns without assuming they are absent', () => {
    const sql = readFileSync(join(MIGRATIONS, '0004_multi_decorations.sql'), 'utf8');
    expect(sql).toContain('add column if not exists stickers');
    expect(sql).toContain('add column if not exists gifs');
    expect(sql).toContain('add column if not exists memes');
  });

  it('backfill existing wishes rather than leaving their choices behind', () => {
    const sql = readFileSync(join(MIGRATIONS, '0004_multi_decorations.sql'), 'utf8');
    expect(sql).toContain('set stickers = array[sticker]');
    expect(sql).toContain('set gifs = array[gif]');
    expect(sql).toContain('set memes = array[meme]');
  });
});

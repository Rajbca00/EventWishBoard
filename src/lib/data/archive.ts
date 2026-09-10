import 'server-only';
import { getBookForEvent, type MemoryBook } from './book';
import { slugify, formatDate } from '../utils';
import { BRAND } from '../env';

/**
 * The downloadable archive.
 *
 * Everything is assembled here and zipped in the organiser's browser rather
 * than on the server: a full event runs to a hundred megabytes or more of
 * photos, well past what a serverless function may return in one response.
 * The server hands over a manifest plus signed URLs; the browser fetches the
 * images and writes the zip.
 */

export interface ArchiveEntry {
  /** Path inside the zip, e.g. images/003-rajesh.jpg */
  filename: string;
  url: string;
}

export interface ArchiveManifest {
  folder: string;
  html: string;
  csv: string;
  json: string;
  readme: string;
  images: ArchiveEntry[];
  counts: MemoryBook['counts'];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Extension from a signed storage URL, falling back to jpg. */
function extensionFor(url: string): string {
  const match = /\.(jpg|jpeg|png|webp)(?:\?|$)/i.exec(url);
  return match ? match[1]!.toLowerCase() : 'jpg';
}

/**
 * A standalone page that opens from the unzipped folder with no server, no
 * network and no build step — images are referenced by relative path and all
 * styling is inline, so it still works in ten years on a laptop with no
 * internet.
 */
function buildHtml(book: MemoryBook, imageFor: Map<string, string>): string {
  const { event, wishes, counts } = book;
  const hosts = escapeHtml(event.hosts || event.name);
  const date = event.eventDate
    ? formatDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const cards = wishes
    .map((wish, index) => {
      const photo = wish.selfieUrl ? imageFor.get(wish.id) : null;
      // Only emoji travel into the offline page: the library art lives on the
      // web server the archive is meant to outlive.
      const emoji = wish.stickers.filter((value) => !value.startsWith('/') && !value.startsWith('http'));
      return `      <li class="wish">
        ${photo ? `<img class="photo" src="${photo}" alt="Photo from ${escapeHtml(wish.name ?? 'a guest')}">` : ''}
        <div class="body">
          <p class="message">${escapeHtml(wish.message)}</p>
          <p class="author">— ${escapeHtml(wish.name ?? 'Anonymous')}${
            emoji.length ? ` <span>${escapeHtml(emoji.join(' '))}</span>` : ''
          }</p>
        </div>
        <span class="num">${String(index + 1).padStart(2, '0')}</span>
      </li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A book of wishes for ${hosts}</title>
<style>
  :root {
    --ink: #4a2c33; --ink-soft: #85676e; --gold: #d8a657;
    --bg: #fff7f3; --bg2: #f4e7ff; --card: #fffcf8; --line: rgba(168,116,128,.22);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: var(--ink);
    background: linear-gradient(170deg, var(--bg), #ffe9ef 48%, var(--bg2));
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    line-height: 1.6;
  }
  header { text-align: center; padding: 72px 24px 40px; }
  .eyebrow { font-size: .72rem; letter-spacing: .3em; text-transform: uppercase; color: var(--ink-soft); margin: 0; }
  h1 { font-size: clamp(2.2rem, 7vw, 4rem); line-height: 1.05; margin: 20px 0 0; letter-spacing: -.02em; }
  .date { margin: 18px 0 0; font-size: .82rem; letter-spacing: .2em; text-transform: uppercase; color: var(--ink-soft); }
  .rule { width: 96px; height: 1px; margin: 30px auto 0; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
  .stats { display: flex; gap: 40px; justify-content: center; margin: 30px 0 0; padding: 0; list-style: none; }
  .stats b { display: block; font-size: 1.9rem; line-height: 1; font-weight: 600; }
  .stats span { font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-soft); }
  main { max-width: 820px; margin: 0 auto; padding: 0 20px 72px; }
  ul { list-style: none; margin: 0; padding: 0; }
  .wish {
    position: relative; display: flex; gap: 22px; align-items: flex-start;
    background: var(--card); border: 1px solid var(--line); border-radius: 22px;
    padding: 26px 28px; margin-bottom: 18px;
    box-shadow: 0 16px 40px -32px rgba(94,58,46,.55);
  }
  .photo { width: 128px; height: 160px; object-fit: cover; border-radius: 14px; flex: none; }
  .message { font-size: 1.22rem; margin: 0; }
  .author { margin: 12px 0 0; font-style: italic; color: var(--ink-soft); font-size: .95rem; }
  .num { position: absolute; top: 18px; right: 22px; font-size: .78rem; color: var(--ink-soft); opacity: .5; }
  footer { text-align: center; padding: 40px 24px 64px; border-top: 1px solid var(--line); }
  footer p { margin: 6px 0; color: var(--ink-soft); font-size: .9rem; }
  footer .brand { color: var(--ink); font-size: 1.1rem; letter-spacing: .12em; text-transform: uppercase; }
  @media print {
    body { background: #fff; }
    .wish { break-inside: avoid; box-shadow: none; border-width: 0 0 1px; border-radius: 0; padding: 14px 0; }
  }
  @media (max-width: 560px) { .wish { flex-direction: column; } .photo { width: 100%; height: 220px; } }
</style>
</head>
<body>
  <header>
    <p class="eyebrow">A book of wishes for</p>
    <h1>${hosts}</h1>
    ${date ? `<p class="date">${escapeHtml(date)}</p>` : ''}
    <div class="rule"></div>
    <ul class="stats">
      <li><b>${counts.wishes}</b><span>${counts.wishes === 1 ? 'wish' : 'wishes'}</span></li>
      ${counts.named ? `<li><b>${counts.named}</b><span>well-wishers</span></li>` : ''}
      ${counts.photos ? `<li><b>${counts.photos}</b><span>${counts.photos === 1 ? 'photo' : 'photos'}</span></li>` : ''}
    </ul>
  </header>
  <main>
    <ul>
${cards}
    </ul>
  </main>
  <footer>
    <p class="brand">Laya &amp; Bee</p>
    <p>${escapeHtml(BRAND.tagline)}</p>
  </footer>
</body>
</html>
`;
}

export async function buildArchive(eventId: string): Promise<ArchiveManifest | null> {
  const book = await getBookForEvent(eventId);
  if (!book) return null;

  const { event, wishes, counts } = book;
  const folder = `${slugify(event.hosts || event.name)}-wish-wall`;

  // Stable, sortable, human-readable filenames.
  const images: ArchiveEntry[] = [];
  const imageFor = new Map<string, string>();
  wishes.forEach((wish, index) => {
    if (!wish.selfieUrl) return;
    const who = slugify(wish.name ?? 'anonymous', 'guest');
    const filename = `images/${String(index + 1).padStart(3, '0')}-${who}.${extensionFor(wish.selfieUrl)}`;
    images.push({ filename, url: wish.selfieUrl });
    imageFor.set(wish.id, filename);
  });

  const csv = [
    ['number', 'message', 'name', 'photo_file', 'stickers', 'media', 'featured', 'received'].join(','),
    ...wishes.map((wish, index) =>
      [
        index + 1,
        wish.message,
        wish.name ?? 'Anonymous',
        imageFor.get(wish.id) ?? '',
        wish.stickers.join(' '),
        wish.media.join(' '),
        wish.featured ? 'yes' : 'no',
        wish.createdAt,
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\n');

  const json = JSON.stringify(
    {
      event: {
        id: event.id,
        name: event.name,
        hosts: event.hosts,
        date: event.eventDate,
      },
      exportedAt: new Date().toISOString(),
      counts,
      wishes: wishes.map((wish, index) => ({
        number: index + 1,
        message: wish.message,
        name: wish.name,
        stickers: wish.stickers,
        media: wish.media,
        photo: imageFor.get(wish.id) ?? null,
        featured: wish.featured,
        receivedAt: wish.createdAt,
      })),
    },
    null,
    2,
  );

  const readme = `${event.hosts || event.name} — Wish Wall archive
${'='.repeat(48)}

Exported ${formatDate(new Date().toISOString())} from the Laya & Bee Wish Wall.

  index.html    Open this in any browser to read the whole book.
                It works offline — no internet needed.
  images/       Every guest photo, at full stored resolution.
  wishes.csv    All the wishes as a spreadsheet.
  wishes.json   The same data for developers.

${counts.wishes} wishes${counts.photos ? `, ${counts.photos} photos` : ''}.

These photos include ones guests asked to be kept private to the hosts.
Please treat the folder as the couple's own copy.

Made for celebrations by Laya & Bee.
`;

  return { folder, html: buildHtml(book, imageFor), csv, json, readme, images, counts };
}

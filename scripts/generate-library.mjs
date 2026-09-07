/**
 * Generates the bundled default asset library.
 *
 * These ship as animated SVGs rather than binary GIFs: they are a couple of KB
 * each, stay crisp on any screen, and animate inside a plain <img>. Organisers
 * upload real GIFs/PNGs from the dashboard; these exist so a brand new install
 * can demo the full picker before anything is configured.
 *
 * Two rules every asset here follows:
 *   1. The artwork is fully visible at rest. Motion is layered *on top* of a
 *      static composition, never the thing that brings it into existence — a
 *      paused or throttled tab must still show a sensible poster frame.
 *   2. Each file carries its own prefers-reduced-motion guard, because page CSS
 *      cannot reach inside an SVG loaded through <img>.
 *
 * Run: node scripts/generate-library.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gifsDir = join(root, 'public', 'library', 'gifs');
const memesDir = join(root, 'public', 'library', 'memes');

mkdirSync(gifsDir, { recursive: true });
mkdirSync(memesDir, { recursive: true });

const KEYFRAMES = `
  @keyframes bob   { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-7px) } }
  @keyframes rise  { 0% { transform: translateY(10px); opacity: .55 } 50% { opacity: 1 } 100% { transform: translateY(-16px); opacity: .2 } }
  @keyframes tw    { 0%,100% { opacity: .55; transform: scale(.9) } 50% { opacity: 1; transform: scale(1.15) } }
  @keyframes sway  { 0%,100% { transform: rotate(-6deg) } 50% { transform: rotate(6deg) } }
  @keyframes drift { 0% { transform: translateY(-6px) rotate(-8deg) } 100% { transform: translateY(10px) rotate(8deg) } }
  @keyframes pop   { 0%,100% { transform: scale(1) } 45% { transform: scale(1.1) } }
`;

const wrap = (body, { width = 120, height = 120 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
<style>
${KEYFRAMES}
  .bob   { animation: bob 3.2s ease-in-out infinite; transform-origin: center }
  .rise  { animation: rise 2.8s ease-in-out infinite; transform-origin: center }
  .tw    { animation: tw 2.1s ease-in-out infinite; transform-origin: center }
  .sway  { animation: sway 2.6s ease-in-out infinite; transform-origin: 50% 90% }
  .drift { animation: drift 3.4s ease-in-out infinite alternate; transform-origin: center }
  .pop   { animation: pop 2.4s ease-in-out infinite; transform-origin: center }

  /* Motion is decoration; the composition above already reads without it. */
  @media (prefers-reduced-motion: reduce) {
    .bob, .rise, .tw, .sway, .drift, .pop { animation: none }
  }
</style>
${body}
</svg>
`;

const heart = (x, y, size, fill, opacity = 1) =>
  `<path transform="translate(${x} ${y}) scale(${size / 32})" opacity="${opacity}" d="M16 29S1.5 20.4 1.5 10.8C1.5 5.4 5.6 1.5 10.4 1.5c3 0 5 1.6 5.6 3.4C16.6 3.1 18.6 1.5 21.6 1.5c4.8 0 8.9 3.9 8.9 9.3C30.5 20.4 16 29 16 29Z" fill="${fill}"/>`;

const spark = (x, y, size, fill, opacity = 1) =>
  `<path transform="translate(${x} ${y}) scale(${size / 24})" opacity="${opacity}" d="M12 0c.9 6.6 4.5 10.4 12 12-7.5 1.6-11.1 5.4-12 12-.9-6.6-4.5-10.4-12-12C7.5 10.4 11.1 6.6 12 0Z" fill="${fill}"/>`;

const confettiBit = (x, y, w, h, fill, rotate) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}" transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})"/>`;

/* ------------------------------------------------------------------ motion stickers */

const gifs = {
  'hearts.svg': wrap(`
  <g class="bob">${heart(40, 44, 34, '#e5789c')}</g>
  <g class="rise" style="animation-delay:.2s">${heart(18, 60, 20, '#f2a5bd', .9)}</g>
  <g class="rise" style="animation-delay:1.1s">${heart(72, 56, 24, '#d95f83', .9)}</g>
  <g class="tw" style="animation-delay:.5s">${spark(84, 22, 16, '#f0d9a4')}</g>
  <g class="tw" style="animation-delay:1.3s">${spark(16, 26, 12, '#e8cb8e')}</g>`),

  'confetti.svg': wrap(`
  <g class="drift">${confettiBit(20, 30, 7, 15, '#d4738f', -20)}</g>
  <g class="drift" style="animation-delay:.4s">${confettiBit(44, 18, 7, 15, '#dcb463', 25)}</g>
  <g class="drift" style="animation-delay:.8s">${confettiBit(68, 34, 7, 15, '#a99bea', -10)}</g>
  <g class="drift" style="animation-delay:1.2s">${confettiBit(88, 22, 7, 15, '#7fb2e5', 35)}</g>
  <g class="drift" style="animation-delay:1.6s">${confettiBit(32, 70, 7, 15, '#e07a5f', 15)}</g>
  <g class="drift" style="animation-delay:2s">${confettiBit(60, 78, 7, 15, '#f2a5bd', -30)}</g>
  <g class="tw">${spark(48, 44, 26, '#f0d9a4')}</g>`),

  'cheers.svg': wrap(`
  <g class="sway">
    <path d="M30 28h26l-9 26v22h9v6H21v-6h9V54l-9-26Z" fill="#f4e3c0"/>
    <path d="M32 32h22l-5 15H37l-5-15Z" fill="#e8a8bf"/>
  </g>
  <g class="sway" style="animation-delay:.6s">
    <path d="M64 28h26l-9 26v22h9v6H55v-6h9V54l-9-26Z" fill="#f8ecd6"/>
    <path d="M66 32h22l-5 15H71l-5-15Z" fill="#f2bcce"/>
  </g>
  <g class="tw">${spark(50, 4, 18, '#dcb463')}</g>
  <g class="tw" style="animation-delay:.7s">${spark(86, 12, 13, '#e8cb8e')}</g>`),

  'sparkle.svg': wrap(`
  <g class="tw">${spark(38, 32, 46, '#e0bd7a')}</g>
  <g class="tw" style="animation-delay:.45s">${spark(16, 16, 24, '#eccf96')}</g>
  <g class="tw" style="animation-delay:.9s">${spark(72, 64, 28, '#d8ac5e')}</g>
  <g class="tw" style="animation-delay:1.3s">${spark(82, 18, 18, '#f2e0bd')}</g>`),

  'cake.svg': wrap(`
  <g class="pop">
    <rect x="24" y="58" width="72" height="36" rx="8" fill="#efd9c2"/>
    <path d="M24 66h72v9H24z" fill="#e6b9cb"/>
    <rect x="28" y="40" width="64" height="21" rx="7" fill="#f5adc2"/>
    <rect x="56" y="22" width="7" height="19" rx="3.5" fill="#fff3e2"/>
    <ellipse cx="59.5" cy="19" rx="5" ry="7" fill="#f0a848"/>
  </g>
  <g class="rise" style="animation-delay:.3s">${heart(80, 36, 17, '#e5789c', .9)}</g>
  <g class="rise" style="animation-delay:1.4s">${heart(24, 38, 14, '#f2a5bd', .9)}</g>`),
};

/* ------------------------------------------------------------------ event memes */

const meme = (emoji, top, bottom, bg, accent) =>
  wrap(
    `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="192" height="152" rx="18" fill="url(#g)" stroke="${accent}" stroke-opacity=".35" stroke-width="2"/>
  <text x="100" y="34" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="${accent}" letter-spacing="2">${top}</text>
  <text x="100" y="96" text-anchor="middle" font-size="46" class="pop">${emoji}</text>
  <text x="100" y="132" text-anchor="middle" font-family="Georgia, serif" font-size="15" font-style="italic" fill="#5c4237">${bottom}</text>`,
    { width: 200, height: 160 },
  );

const memes = {
  'best-couple.svg': meme('🏆', 'AWARD GOES TO', 'Best couple, hands down', '#fce3ec', '#b8577a'),
  'finally.svg': meme('🎊', 'FINALLY', 'It only took them forever', '#fff2e4', '#c97b62'),
  'dessert.svg': meme('🧁', "LET'S BE HONEST", 'I came for the dessert', '#f7e9d8', '#916a55'),
  'dance.svg': meme('💃', 'SEE YOU LATER', 'On the dance floor', '#e8dcff', '#8b6ab8'),
};

let count = 0;
for (const [name, contents] of Object.entries(gifs)) {
  writeFileSync(join(gifsDir, name), contents);
  count += 1;
}
for (const [name, contents] of Object.entries(memes)) {
  writeFileSync(join(memesDir, name), contents);
  count += 1;
}

console.log(`Generated ${count} default library assets into public/library/`);

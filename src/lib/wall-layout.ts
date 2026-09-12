import { clamp } from '@/lib/utils';

/**
 * Working out how to lay the venue board out.
 *
 * The board shows a fixed handful of the newest wishes and has to fit them all
 * on one screen — nothing scrolls, nothing may be clipped by the edge of a
 * projector, and nothing may slide under the header. So the layout is solved
 * for the space available rather than assumed: pick the column count that lets
 * the type be largest, then size the cards and the type to what is left.
 *
 * Pure and side-effect free, so the arithmetic can be tested without a browser.
 */

/** How many of the most recent wishes the board shows at once. */
export const BOARD_LIMIT = 16;

export interface BoardSpace {
  /** Usable width in px, with the side margins already removed. */
  width: number;
  /** Usable height in px, with the header and footer bands already removed. */
  height: number;
  count: number;
  gap?: number;
}

export interface BoardLayout {
  columns: number;
  rows: number;
  /** Card box in px. Cards are centred in their cell at this size. */
  cardWidth: number;
  cardHeight: number;
  /** Type sizes in px, derived from the card so they always fit inside it. */
  messagePx: number;
  metaPx: number;
  /**
   * How a photo is shown. A big card can carry it as a banner above the
   * message; a small one shows a face beside the author instead, because a
   * banner there leaves room for about one line of the wish.
   */
  photoStyle: 'banner' | 'avatar';
  /** Height of the banner, or the diameter of the avatar. */
  photoPx: number;
  /** Lines of message a card can hold, with and without a photo above it. */
  lines: number;
  linesWithPhoto: number;
  gap: number;
}

/*
 * A wish card reads badly when it is much wider than tall (a couple of long
 * lines floating in white space) or much taller than wide (a thin ribbon of
 * one-word lines). Cards are held between these two shapes and centred in
 * whatever cell the grid gives them.
 */
const MIN_ASPECT = 0.6;
const MAX_ASPECT = 1.15;

/* Roughly how much of a card the message should be able to fill: about
 * eighteen characters across and six lines down, at which point a wish reads
 * as a paragraph rather than a column of syllables. */
const CHARS_PER_LINE = 18;
const AVERAGE_GLYPH = 0.5;
const LINES = 6;
const LINE_HEIGHT = 1.45;

/* The author line, measured in units of the message's own font size, so the
 * type can be solved for without knowing it first. */
const META_RATIO = 0.7;
const AUTHOR_ROW = META_RATIO * 1.8;

/** Padding scales with the card, so a small card does not lose most of itself to it. */
const paddingFor = (cardWidth: number) => Math.max(12, cardWidth * 0.09) * 2;

/** A banner photo is only worth having if this much of the message still fits. */
const MIN_LINES_BESIDE_BANNER = 3;

/* Below this nobody across a room can read it; above it the card is mostly
 * empty and the message looks like a headline. */
const MIN_FONT = 14;
const MAX_FONT = 60;

/**
 * The largest type that fits a card of this size, in px.
 *
 * The height side has to account for the padding and the author line, not just
 * the message. Solving for the message alone produced type that looked right
 * and then left room for three lines of a six-line wish.
 */
function fontFor(width: number, height: number): number {
  const fromWidth = width / (CHARS_PER_LINE * AVERAGE_GLYPH);
  const fromHeight = (height - paddingFor(width)) / (LINES * LINE_HEIGHT + AUTHOR_ROW);
  return Math.min(fromWidth, Math.max(0, fromHeight));
}

export function fitBoard({ width, height, count, gap = 24 }: BoardSpace): BoardLayout {
  const empty: BoardLayout = {
    columns: 1,
    rows: 0,
    cardWidth: 0,
    cardHeight: 0,
    messagePx: MIN_FONT,
    metaPx: MIN_FONT * 0.7,
    photoStyle: 'avatar',
    photoPx: 0,
    lines: 1,
    linesWithPhoto: 1,
    gap,
  };
  if (count <= 0 || width <= 0 || height <= 0) return empty;

  interface Candidate {
    columns: number;
    rows: number;
    cardWidth: number;
    cardHeight: number;
    font: number;
  }

  const candidates: Candidate[] = [];

  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const cellW = (width - gap * (columns - 1)) / columns;
    const cellH = (height - gap * (rows - 1)) / rows;
    if (cellW <= 0 || cellH <= 0) continue;

    // Hold the card between the two shapes it reads well at.
    const cardWidth = Math.min(cellW, cellH * MAX_ASPECT);
    const cardHeight = Math.min(cellH, cellW / MIN_ASPECT);
    candidates.push({ columns, rows, cardWidth, cardHeight, font: fontFor(cardWidth, cardHeight) });
  }

  if (!candidates.length) return empty;

  /*
   * Two stages, because the largest type on its own is a bad objective: it
   * picks tall, narrow cards, and fifteen wishes came out as eight columns of
   * something the shape of a raffle ticket. So take the layouts whose type is
   * within a hair of the best, and among those take the one with the roomiest
   * cards.
   */
  const NEARLY = 0.85;
  const bestFontOverall = Math.max(...candidates.map((entry) => entry.font));
  const shortlist = candidates.filter((entry) => entry.font >= bestFontOverall * NEARLY);

  const chosen = shortlist.reduce((a, b) =>
    b.cardWidth * b.cardHeight > a.cardWidth * a.cardHeight ? b : a,
  );

  const bestFont = chosen.font;
  const best: BoardLayout = {
    columns: chosen.columns,
    rows: chosen.rows,
    cardWidth: chosen.cardWidth,
    cardHeight: chosen.cardHeight,
    messagePx: 0,
    metaPx: 0,
    photoStyle: 'banner',
    photoPx: 0,
    lines: 0,
    linesWithPhoto: 0,
    gap,
  };

  const messagePx = Math.round(Math.max(MIN_FONT, Math.min(MAX_FONT, bestFont)));
  const metaPx = Math.round(Math.max(11, messagePx * META_RATIO));

  const cardWidth = Math.floor(best.cardWidth);
  const cardHeight = Math.floor(best.cardHeight);

  /*
   * How many lines the message may run to. Working this out rather than fixing
   * it at six is what stops a long wish spilling past the bottom of a short
   * card — which is exactly what the board used to do — and stops a tall card
   * clamping a message that had room to finish.
   */
  const room = cardHeight - paddingFor(cardWidth) - metaPx * 1.8;
  const linesIn = (available: number) =>
    Math.max(1, Math.floor(available / (messagePx * LINE_HEIGHT)));

  const lines = linesIn(room);

  /*
   * Decide how to show a photo. A banner across the top is the nicer treatment
   * and gets used whenever the message still has room to be read underneath;
   * otherwise the face moves down beside the author as a small circle, which
   * costs the message nothing.
   */
  const bannerPx = Math.round(Math.min(cardHeight * 0.34, cardWidth * 0.6));
  const linesBesideBanner = linesIn(room - bannerPx - messagePx * 0.4);
  const banner = linesBesideBanner >= MIN_LINES_BESIDE_BANNER;

  return {
    ...best,
    cardWidth,
    cardHeight,
    messagePx,
    metaPx,
    photoStyle: banner ? 'banner' : 'avatar',
    photoPx: banner ? bannerPx : Math.round(Math.min(metaPx * 2.6, cardWidth * 0.28)),
    lines,
    // An avatar sits on the author line, so it costs the message nothing.
    linesWithPhoto: banner ? linesBesideBanner : lines,
  };
}

export function messageScaleFor(message: string, availableChars = 28): number {
  const clean = message.trim();
  if (!clean) return 1;

  const ratio = availableChars / Math.max(clean.length, 1);
  return clamp(Number((Math.min(1, ratio) * 1.08).toFixed(3)), 0.46, 1);
}

/**
 * Shortens a wish to fit, at a word boundary, with a real ellipsis.
 *
 * Cutting mid-word ("congratulat…") reads as a glitch on a screen people are
 * standing in front of. The cut backs up to the last space, unless that would
 * throw away most of the text — a single enormous word still gets cut.
 */
export function truncateMessage(message: string, maxChars = 140): string {
  const clean = message.trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;

  const hard = clean.slice(0, Math.max(1, maxChars - 1));
  const lastSpace = hard.lastIndexOf(' ');
  const cut = lastSpace >= hard.length * 0.6 ? hard.slice(0, lastSpace) : hard;
  return `${cut.replace(/[\s,;:.–—-]+$/u, '')}…`;
}

/**
 * How many characters of a wish a side-wall card can show before it should be
 * shortened, given the layout the board chose.
 *
 * Worked out from the card rather than from how many cards there are, so the
 * cut lands where the text actually runs out of room.
 */
export function messageBudgetFor(
  layout: Pick<BoardLayout, 'cardWidth' | 'messagePx' | 'lines' | 'linesWithPhoto'>,
  hasPhoto: boolean,
  paddingPx: number,
  /** Lines given over to something else in the card, such as its decorations. */
  reservedLines = 0,
): number {
  const inner = Math.max(0, layout.cardWidth - paddingPx * 2);
  const perLine = inner / Math.max(1, layout.messagePx * AVERAGE_GLYPH);
  const lines = Math.max(1, (hasPhoto ? layout.linesWithPhoto : layout.lines) - reservedLines);
  // A little under the full box: words do not pack a line perfectly.
  return Math.max(24, Math.floor(perLine * lines * 0.88));
}

/**
 * How many side-wall cards fit while every one stays readable.
 *
 * `floorPx` is the smallest message type allowed. Cards are sized as though
 * there were at least `minCells` of them, so two early wishes do not balloon
 * into giant cards beside the spotlight and then shrink as more arrive.
 */
export function readableCapacity({
  width,
  height,
  floorPx,
  max = 12,
  minCells = 4,
  gap = 24,
}: {
  width: number;
  height: number;
  floorPx: number;
  max?: number;
  minCells?: number;
  gap?: number;
}): number {
  if (width <= 0 || height <= 0) return 0;

  for (let count = max; count >= 1; count--) {
    const layout = fitBoard({ width, height, count: Math.max(count, minCells), gap });
    if (layout.messagePx >= floorPx) return count;
  }
  // A small screen that cannot hold even the minimum at the floor: take the
  // fewest cards it can show at all rather than none.
  for (let count = Math.min(max, minCells - 1); count >= 1; count--) {
    if (fitBoard({ width, height, count, gap }).messagePx >= floorPx) return count;
  }
  return 1;
}

/**
 * The newest wishes, oldest of them first.
 *
 * The wall hands back its list oldest-first, so the recent ones are at the end.
 * Reading order stays the same; only the window moves.
 */
export function boardWishes<T>(wishes: T[], limit = BOARD_LIMIT): T[] {
  return wishes.length <= limit ? wishes : wishes.slice(wishes.length - limit);
}

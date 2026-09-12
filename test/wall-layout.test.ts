import { describe, expect, it } from 'vitest';
import {
  fitBoard,
  boardWishes,
  BOARD_LIMIT,
  messageScaleFor,
  truncateMessage,
  messageBudgetFor,
  readableCapacity,
} from '@/lib/wall-layout';

/*
 * The screen sizes a venue board actually runs on, with the header and footer
 * bands already taken off the height.
 */
const SCREENS = {
  projector: { width: 1805, height: 800 }, // 1920x1080
  tv: { width: 3610, height: 1650 }, // 4K
  laptop: { width: 1250, height: 520 }, // 1440x900
  tall: { width: 1000, height: 1400 }, // a portrait screen on a stand
  phone: { width: 340, height: 520 },
};

const layoutFor = (screen: keyof typeof SCREENS, count: number) =>
  fitBoard({ ...SCREENS[screen], count });

describe('how many wishes reach the board', () => {
  const wishes = Array.from({ length: 40 }, (_, i) => i);

  it('shows the newest sixteen once there are more than that', () => {
    const shown = boardWishes(wishes);
    expect(shown).toHaveLength(BOARD_LIMIT);
    expect(shown.at(-1)).toBe(39);
    expect(shown[0]).toBe(24);
  });

  it('respects a custom event wall limit', () => {
    const shown = boardWishes(wishes, 10);
    expect(shown).toHaveLength(10);
    expect(shown[0]).toBe(30);
    expect(shown.at(-1)).toBe(39);
  });

  it('shows everything when there are fewer', () => {
    expect(boardWishes([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('keeps them in the order they arrived', () => {
    const shown = boardWishes(wishes);
    expect(shown).toEqual([...shown].sort((a, b) => a - b));
  });

  it('copes with none at all', () => {
    expect(boardWishes([])).toEqual([]);
  });
});

/*
 * The board is not allowed to clip. Every card has to sit inside the space it
 * was measured against — this is the fault the previous vw-based sizing had,
 * where cards ran off the bottom edge and under the header.
 */
describe('everything fits in the space it was given', () => {
  const counts = [1, 2, 3, 5, 8, 11, 15];

  for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
    for (const count of counts) {
      it(`${count} wishes on the ${screen}`, () => {
        const { columns, rows, cardWidth, cardHeight, gap } = layoutFor(screen, count);
        const { width, height } = SCREENS[screen];

        expect(columns * rows).toBeGreaterThanOrEqual(count);
        expect(cardWidth * columns + gap * (columns - 1)).toBeLessThanOrEqual(width + 1);
        expect(cardHeight * rows + gap * (rows - 1)).toBeLessThanOrEqual(height + 1);
        expect(cardWidth).toBeGreaterThan(0);
        expect(cardHeight).toBeGreaterThan(0);
      });
    }
  }

  it('never leaves a wish without a cell', () => {
    for (let count = 1; count <= BOARD_LIMIT; count++) {
      const { columns, rows } = layoutFor('projector', count);
      expect(columns * rows).toBeGreaterThanOrEqual(count);
    }
  });
});

describe('the type scales with how many there are', () => {
  it('is largest when a single wish has the screen to itself', () => {
    const one = layoutFor('projector', 1);
    const fifteen = layoutFor('projector', 15);
    expect(one.messagePx).toBeGreaterThan(fifteen.messagePx);
  });

  /*
   * Not strictly monotonic: the grid reflows, and a count that happens to fill
   * its rows more neatly can afford a pixel more than the one before it. What
   * matters is that the trend is downward and that no arriving wish makes the
   * board jump — a step of a pixel is invisible, a step of ten is not.
   */
  it('trends downward as wishes are added, without ever jumping', () => {
    const sizes = Array.from({ length: BOARD_LIMIT }, (_, i) => layoutFor('projector', i + 1).messagePx);

    expect(sizes.at(-1)!).toBeLessThan(sizes[0]!);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]! - sizes[i - 1]!).toBeLessThanOrEqual(2);
    }
  });

  it('stays readable across a room even at the full fifteen', () => {
    // 20px of 1080 is roughly an inch of text on a 100" screen.
    expect(layoutFor('projector', 15).messagePx).toBeGreaterThanOrEqual(18);
    expect(layoutFor('tv', 15).messagePx).toBeGreaterThanOrEqual(36);
  });

  it('does not blow a single wish up into a billboard', () => {
    expect(layoutFor('tv', 1).messagePx).toBeLessThanOrEqual(60);
  });

  it('keeps the author line smaller than the message but still legible', () => {
    for (const count of [1, 5, 15]) {
      const layout = layoutFor('projector', count);
      expect(layout.metaPx).toBeLessThan(layout.messagePx);
      expect(layout.metaPx).toBeGreaterThanOrEqual(11);
    }
  });

  it('is still usable on a phone-sized screen', () => {
    const layout = layoutFor('phone', 15);
    expect(layout.messagePx).toBeGreaterThanOrEqual(14);
    expect(layout.cardWidth).toBeGreaterThan(0);
  });
});

describe('the shape of a card', () => {
  it('is neither a letterbox nor a ribbon', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (const count of [1, 4, 9, 15]) {
        const { cardWidth, cardHeight } = layoutFor(screen, count);
        const aspect = cardWidth / cardHeight;
        expect(aspect).toBeGreaterThanOrEqual(0.55);
        expect(aspect).toBeLessThanOrEqual(1.2);
      }
    }
  });

  it('puts fifteen wishes into a sensible grid on a widescreen projector', () => {
    const { columns, rows } = layoutFor('projector', 15);
    expect(columns).toBeGreaterThanOrEqual(4);
    expect(columns).toBeLessThanOrEqual(6);
    expect(rows).toBeLessThanOrEqual(4);
  });

  it('uses more rows than columns on a portrait screen', () => {
    const { columns, rows } = layoutFor('tall', 12);
    expect(rows).toBeGreaterThanOrEqual(columns);
  });
});

/*
 * A long wish used to run past the bottom of its card, mid-word, with the
 * author line pushed off entirely. The clamp is now worked out from the card
 * rather than fixed at six lines.
 */
describe('how much of a message a card can hold', () => {
  it('always allows at least one line', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (let count = 1; count <= BOARD_LIMIT; count++) {
        expect(layoutFor(screen, count).lines).toBeGreaterThanOrEqual(1);
        expect(layoutFor(screen, count).linesWithPhoto).toBeGreaterThanOrEqual(1);
      }
    }
  });

  /*
   * A banner across the top of the card costs the message lines. When there is
   * not enough left to read — the previous board showed a photo card with one
   * line of a wish under it — the face moves down beside the author instead,
   * which costs nothing.
   */
  it('gives up lines for a banner, and none for an avatar', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (const count of [1, 3, 6, 10, 15]) {
        const layout = layoutFor(screen, count);
        if (layout.photoStyle === 'banner') {
          expect(layout.linesWithPhoto).toBeLessThan(layout.lines);
        } else {
          expect(layout.linesWithPhoto).toBe(layout.lines);
        }
      }
    }
  });

  it('never shows a banner that leaves too little of the wish to read', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (let count = 1; count <= BOARD_LIMIT; count++) {
        const layout = layoutFor(screen, count);
        if (layout.photoStyle === 'banner') {
          expect(layout.linesWithPhoto).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('keeps an avatar small enough to sit on the author line', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (let count = 1; count <= BOARD_LIMIT; count++) {
        const layout = layoutFor(screen, count);
        if (layout.photoStyle === 'avatar') {
          expect(layout.photoPx).toBeLessThanOrEqual(layout.cardWidth * 0.3);
        }
      }
    }
  });

  it('keeps the clamped text inside the card it was measured for', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (const count of [1, 7, 15]) {
        const l = layoutFor(screen, count);
        const used = l.lines * l.messagePx * 1.45 + l.metaPx * 1.8;
        expect(used).toBeLessThanOrEqual(l.cardHeight);
      }
    }
  });

  it('leaves a photo room without swallowing the card', () => {
    for (const count of [1, 8, 15]) {
      const layout = layoutFor('projector', count);
      expect(layout.photoPx).toBeLessThanOrEqual(layout.cardHeight * 0.45);
      expect(layout.photoPx).toBeGreaterThan(0);
    }
  });

  it('fits the message, the author and any banner inside the card', () => {
    for (const screen of Object.keys(SCREENS) as (keyof typeof SCREENS)[]) {
      for (let count = 1; count <= BOARD_LIMIT; count++) {
        const l = layoutFor(screen, count);
        const banner = l.photoStyle === 'banner' ? l.photoPx : 0;
        const used = banner + l.linesWithPhoto * l.messagePx * 1.45 + l.metaPx * 1.8;
        expect(used).toBeLessThanOrEqual(l.cardHeight);
      }
    }
  });
});

describe('message scaling and clipping', () => {
  it('shrinks longer messages before they crowd the card', () => {
    expect(messageScaleFor('Short wish', 20)).toBeGreaterThan(0.9);
    expect(messageScaleFor('This is a much longer wish message that should scale down on a crowded board', 20)).toBeLessThan(1);
    expect(messageScaleFor('Very long message repeated many times', 20)).toBeLessThan(
      messageScaleFor('Short wish', 20),
    );
  });

  it('adds an ellipsis when the message outgrows the card', () => {
    expect(truncateMessage('This is a very long wish that should be clipped for the live wall board', 70)).toMatch(/…$/);
    expect(truncateMessage('Short wish', 70)).toBe('Short wish');
  });

  it('cuts at a word, never mid-word', () => {
    const cut = truncateMessage('Wishing you both a lifetime of happiness and laughter', 30);
    expect(cut).toBe('Wishing you both a lifetime…');
    expect(cut.length).toBeLessThanOrEqual(30);
  });

  it('does not leave a stray comma or dash before the ellipsis', () => {
    expect(truncateMessage('Congratulations, both of you, truly', 18)).toBe('Congratulations…');
  });

  it('still cuts a single enormous word rather than overflowing', () => {
    const cut = truncateMessage('a'.repeat(200), 40);
    expect(cut.length).toBeLessThanOrEqual(40);
    expect(cut.endsWith('…')).toBe(true);
  });
});

describe('how much text a side-wall card can take', () => {
  const layout = fitBoard({ width: 784, height: 736, count: 6 });

  it('takes less beside a photo', () => {
    expect(messageBudgetFor(layout, true, 19)).toBeLessThanOrEqual(messageBudgetFor(layout, false, 19));
  });

  it('takes more on a wider card', () => {
    const wide = { ...layout, cardWidth: layout.cardWidth * 1.5 };
    expect(messageBudgetFor(wide, false, 19)).toBeGreaterThan(messageBudgetFor(layout, false, 19));
  });

  it('never drops to a sliver', () => {
    expect(messageBudgetFor({ ...layout, cardWidth: 10 }, true, 19)).toBeGreaterThanOrEqual(24);
  });
});

/*
 * The side wall beside the spotlight holds as many cards as it can while every
 * one stays at a readable size — at least 24px of message on a 1080p screen,
 * where the monitor is read from two to five feet.
 */
describe('how many cards the side wall holds', () => {
  const SIDES = {
    '1920×1080': { width: 784, height: 736, floorPx: 24 },
    '2560×1440': { width: 1045, height: 981, floorPx: 32 },
    '1366×768': { width: 557, height: 511, floorPx: 18 },
  };

  for (const [screen, side] of Object.entries(SIDES)) {
    it(`keeps every card readable at ${screen}`, () => {
      const capacity = readableCapacity({ ...side, minCells: 4 });
      expect(capacity).toBeGreaterThanOrEqual(1);
      const layout = fitBoard({ width: side.width, height: side.height, count: Math.max(capacity, 4) });
      expect(layout.messagePx).toBeGreaterThanOrEqual(side.floorPx);
    });
  }

  it('fits a full wall of several cards on the primary 27" 1080p screen', () => {
    expect(readableCapacity({ ...SIDES['1920×1080'], minCells: 4 })).toBeGreaterThanOrEqual(4);
  });

  it('keeps the same composition at 1440p rather than cramming more in', () => {
    const at1080 = readableCapacity({ ...SIDES['1920×1080'], minCells: 4 });
    const at1440 = readableCapacity({ ...SIDES['2560×1440'], minCells: 4 });
    expect(at1440).toBe(at1080);
  });

  it('holds none in a space it has not measured yet', () => {
    expect(readableCapacity({ width: 0, height: 0, floorPx: 24 })).toBe(0);
  });

  it('still holds one on a screen too small for its floor', () => {
    expect(readableCapacity({ width: 120, height: 90, floorPx: 40 })).toBe(1);
  });
});

describe('awkward inputs', () => {
  it('returns something harmless for no wishes', () => {
    const layout = fitBoard({ width: 1805, height: 800, count: 0 });
    expect(layout.rows).toBe(0);
    expect(layout.cardWidth).toBe(0);
  });

  it('does not divide by a screen it has not measured yet', () => {
    expect(() => fitBoard({ width: 0, height: 0, count: 15 })).not.toThrow();
    expect(fitBoard({ width: 0, height: 0, count: 15 }).rows).toBe(0);
  });

  it('copes with a negative size rather than producing one', () => {
    const layout = fitBoard({ width: -100, height: -100, count: 5 });
    expect(layout.cardWidth).toBeGreaterThanOrEqual(0);
    expect(layout.cardHeight).toBeGreaterThanOrEqual(0);
  });
});

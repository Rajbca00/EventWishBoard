import { describe, expect, it } from 'vitest';
import {
  assignSlots,
  dwellFor,
  initRotation,
  nextInRotation,
  rotationReducer,
  selectPool,
  spotlightTier,
  SPOTLIGHT_TIERS,
  type RotationState,
} from '@/lib/live-rotation';
import { LIMITS } from '@/lib/env';
import type { PublicWish } from '@/lib/types';

const wish = (id: string, minute: number, over: Partial<PublicWish> = {}): PublicWish => ({
  id,
  message: `Wish ${id}`,
  name: 'Guest',
  stickers: [],
  gifs: [],
  memes: [],
  selfieUrl: null,
  featured: false,
  createdAt: new Date(Date.UTC(2026, 8, 12, 18, minute)).toISOString(),
  ...over,
});

/** a (oldest) … h (newest) */
const eight = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => wish(id, i));

const advance = (state: RotationState, times = 1) => {
  let next = state;
  for (let i = 0; i < times; i++) next = rotationReducer(next, { type: 'advance' });
  return next;
};

describe('which wishes the screen rotates through', () => {
  it('takes the newest, up to the event limit, oldest first', () => {
    expect(selectPool(eight, 3).map((w) => w.id)).toEqual(['f', 'g', 'h']);
  });

  it('puts them in order even when the source hands them over newest first', () => {
    // The in-memory data source returns newest first; the database does not.
    expect(selectPool([...eight].reverse(), 3).map((w) => w.id)).toEqual(['f', 'g', 'h']);
  });

  it('keeps a wish the organiser featured, however old', () => {
    const withFeature = eight.map((w) => (w.id === 'a' ? { ...w, featured: true } : w));
    const ids = selectPool(withFeature, 3).map((w) => w.id);
    expect(ids).toContain('a');
    expect(ids).toHaveLength(3);
  });

  it('never goes below one', () => {
    expect(selectPool(eight, 0)).toHaveLength(1);
  });
});

describe('the order of the spotlight', () => {
  it('steps back one wish at a time, then wraps to the newest', () => {
    const pool = selectPool(eight, 8);
    expect(nextInRotation(pool, 'h')).toBe('g');
    expect(nextInRotation(pool, 'b')).toBe('a');
    expect(nextInRotation(pool, 'a')).toBe('h');
  });

  it('starts at the newest when it does not recognise the current wish', () => {
    expect(nextInRotation(selectPool(eight, 8), 'zzz')).toBe('h');
    expect(nextInRotation(selectPool(eight, 8), null)).toBe('h');
  });

  it('has nothing to show when there is nothing', () => {
    expect(nextInRotation([], null)).toBeNull();
  });
});

describe('the side wall keeps its cards where they are', () => {
  it('leaves a card in its tile while it stays on the wall', () => {
    expect(assignSlots(['d', 'c', 'b'], ['e', 'c', 'b'], 3)).toEqual(['e', 'c', 'b']);
  });

  it('puts a newcomer into the tile that was freed, not at the front', () => {
    expect(assignSlots(['d', 'c', 'b'], ['d', 'b', 'x'], 3)).toEqual(['d', 'x', 'b']);
  });

  it('grows to capacity when there is room', () => {
    expect(assignSlots(['a'], ['c', 'b', 'a'], 3)).toEqual(['a', 'c', 'b']);
  });

  it('shrinks to capacity, keeping the first tiles', () => {
    expect(assignSlots(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
  });

  it('closes the gap when a wish is taken down and nothing replaces it', () => {
    expect(assignSlots(['a', 'b', 'c'], ['a', 'c'], 3)).toEqual(['a', 'c']);
  });
});

describe('a screen left running', () => {
  it('opens on the newest wish, with the rest on the wall', () => {
    const state = initRotation(eight, 16, 4);
    expect(state.spotlightId).toBe('h');
    expect(state.slots).toEqual(['g', 'f', 'e', 'd']);
  });

  it('never shows the spotlight wish on the wall as well', () => {
    let state = initRotation(eight, 16, 4);
    for (let i = 0; i < 20; i++) {
      expect(state.slots).not.toContain(state.spotlightId);
      state = advance(state);
    }
  });

  /*
   * The property the whole design rests on. Over a full cycle, each move of the
   * spotlight changes at most one tile on the wall — so the screen reads as a
   * slow procession rather than a reshuffle every ten seconds.
   */
  it('changes at most one tile each time the spotlight moves', () => {
    for (const capacity of [2, 4, 6, 7]) {
      let state = initRotation(eight, 16, capacity);
      for (let i = 0; i < 24; i++) {
        const next = advance(state);
        const changed = next.slots.filter((id, index) => state.slots[index] !== id).length;
        expect(changed).toBeLessThanOrEqual(1);
        state = next;
      }
    }
  });

  it('visits every wish in the pool before repeating', () => {
    let state = initRotation(eight, 16, 4);
    const visited = new Set([state.spotlightId]);
    for (let i = 0; i < eight.length - 1; i++) {
      state = advance(state);
      visited.add(state.spotlightId);
    }
    expect(visited.size).toBe(eight.length);
  });

  it('keeps a single wish where it is, but still ticks so its timer restarts', () => {
    const state = initRotation([wish('only', 1)], 16, 4);
    const next = advance(state);
    expect(next.spotlightId).toBe('only');
    expect(next.previousId).toBeNull();
    expect(next.turn).toBe(state.turn + 1);
  });

  it('remembers the wish leaving the spotlight, so it can fade out', () => {
    expect(advance(initRotation(eight, 16, 4)).previousId).toBe('h');
  });
});

describe('a new wish arriving', () => {
  const start = () => initRotation(eight, 16, 4);

  it('goes straight into the spotlight', () => {
    const state = rotationReducer(start(), { type: 'sync', wishes: [...eight, wish('new', 30)], limit: 16 });
    expect(state.spotlightId).toBe('new');
    expect(state.previousId).toBe('h');
    expect(state.fresh).toContain('new');
  });

  it('interrupts wherever the rotation had got to', () => {
    const midway = advance(start(), 3);
    const state = rotationReducer(midway, { type: 'sync', wishes: [...eight, wish('new', 30)], limit: 16 });
    expect(state.spotlightId).toBe('new');
  });

  it('queues several arrivals newest first, and shows them before resuming', () => {
    let state = rotationReducer(start(), {
      type: 'sync',
      wishes: [...eight, wish('n1', 30), wish('n2', 31), wish('n3', 32)],
      limit: 16,
    });
    expect(state.spotlightId).toBe('n3');
    state = advance(state);
    expect(state.spotlightId).toBe('n2');
    state = advance(state);
    expect(state.spotlightId).toBe('n1');
  });

  it('stops being "just arrived" once it has had its turn', () => {
    let state = rotationReducer(start(), { type: 'sync', wishes: [...eight, wish('new', 30)], limit: 16 });
    state = advance(state);
    expect(state.fresh).not.toContain('new');
  });

  it('is the first wish ever, on a screen that opened empty', () => {
    const empty = initRotation([], 16, 4);
    expect(empty.spotlightId).toBeNull();

    const state = rotationReducer(empty, { type: 'sync', wishes: [wish('first', 1)], limit: 16 });
    expect(state.spotlightId).toBe('first');
    expect(state.fresh).toEqual(['first']);
  });

  it('does not count an old wish coming back as an arrival', () => {
    // The organiser un-hides an early wish: it rejoins, but does not barge in.
    const withoutA = eight.filter((w) => w.id !== 'a');
    const state = rotationReducer(initRotation(withoutA, 16, 4), { type: 'sync', wishes: eight, limit: 16 });
    expect(state.spotlightId).toBe('h');
    expect(state.fresh).toEqual([]);
    expect(state.pool.map((w) => w.id)).toContain('a');
  });

  it('moves at most one card on the wall when it arrives', () => {
    // The old spotlight wish returns to the wall, displacing the least recent
    // card there; every other card stays in its tile.
    const state = start();
    const next = rotationReducer(state, { type: 'sync', wishes: [...eight, wish('new', 30)], limit: 16 });
    const changed = next.slots.filter((id, index) => state.slots[index] !== id).length;
    expect(changed).toBeLessThanOrEqual(1);
    expect(next.slots).toContain('h');
  });

  it('changes nothing when the poll brings nothing new', () => {
    const state = start();
    const next = rotationReducer(state, { type: 'sync', wishes: eight, limit: 16 });
    expect(next.spotlightId).toBe(state.spotlightId);
    expect(next.slots).toEqual(state.slots);
    expect(next.turn).toBe(state.turn);
  });
});

describe('a wish being taken down', () => {
  it('leaves the spotlight at once rather than lingering', () => {
    const state = rotationReducer(initRotation(eight, 16, 4), {
      type: 'sync',
      wishes: eight.filter((w) => w.id !== 'h'),
      limit: 16,
    });
    expect(state.spotlightId).not.toBe('h');
    expect(state.spotlightId).not.toBeNull();
  });

  it('leaves the wall too', () => {
    const state = rotationReducer(initRotation(eight, 16, 4), {
      type: 'sync',
      wishes: eight.filter((w) => w.id !== 'f'),
      limit: 16,
    });
    expect(state.slots).not.toContain('f');
  });

  it('leaves an empty screen when it was the last one', () => {
    const state = rotationReducer(initRotation([wish('only', 1)], 16, 4), { type: 'sync', wishes: [], limit: 16 });
    expect(state.spotlightId).toBeNull();
    expect(state.slots).toEqual([]);
  });
});

describe('the screen being resized', () => {
  it('keeps the cards that still fit in their tiles', () => {
    const state = rotationReducer(initRotation(eight, 16, 4), { type: 'capacity', capacity: 2 });
    expect(state.slots).toEqual(['g', 'f']);
  });

  it('adds cards when there is more room', () => {
    const state = rotationReducer(initRotation(eight, 16, 2), { type: 'capacity', capacity: 5 });
    expect(state.slots).toEqual(['g', 'f', 'e', 'd', 'c']);
  });

  it('does nothing when the capacity has not changed', () => {
    const state = initRotation(eight, 16, 4);
    expect(rotationReducer(state, { type: 'capacity', capacity: 4 })).toBe(state);
  });
});

describe('how long a wish stays in the spotlight', () => {
  it('stays between seven and fifteen seconds, plus a little for a new one', () => {
    for (const length of [1, 40, 120, 300]) {
      const dwell = dwellFor({ message: 'x'.repeat(length), selfieUrl: null });
      expect(dwell).toBeGreaterThanOrEqual(7000);
      expect(dwell).toBeLessThanOrEqual(15000);
    }
  });

  it('gives a longer wish longer', () => {
    expect(dwellFor({ message: 'x'.repeat(200), selfieUrl: null })).toBeGreaterThan(
      dwellFor({ message: 'x'.repeat(20), selfieUrl: null }),
    );
  });

  it('gives a photo a moment of its own', () => {
    expect(dwellFor({ message: 'x'.repeat(60), selfieUrl: 'p.jpg' })).toBeGreaterThan(
      dwellFor({ message: 'x'.repeat(60), selfieUrl: null }),
    );
  });

  it('gives a wish that has just arrived three more seconds', () => {
    const wishNow = { message: 'Congratulations!', selfieUrl: null };
    expect(dwellFor(wishNow, true) - dwellFor(wishNow)).toBe(3000);
  });
});

/*
 * The spotlight type sizes are chosen so a wish of each length fits in fewer
 * lines than its clamp allows. This checks that against the spotlight's real
 * proportions at 1920×1080 and 2560×1440, with a conservative estimate of the
 * serif's average character width.
 */
describe('spotlight type', () => {
  const GLYPH = 0.5;
  const REM = 16;

  const linesNeeded = (chars: number, cqi: number, width: number, hasPhoto: boolean) => {
    const font = Math.min(5.2 * REM, Math.max(1.35 * REM, (cqi / 100) * width));
    const inner = width * (1 - 2 * 0.052); // padding 5.2cqi each side
    const column = hasPhoto ? inner - inner * 0.38 - width * 0.04 : Math.min(inner, 23 * font);
    return Math.ceil(chars / (column / (font * GLYPH)));
  };

  it('gets smaller as a wish gets longer, never larger', () => {
    let last = -1;
    for (let length = 1; length <= LIMITS.wishChars; length += 7) {
      const tier = spotlightTier('x'.repeat(length), false);
      expect(tier).toBeGreaterThanOrEqual(last);
      last = tier;
    }
  });

  it('sets a wish smaller when a photo is sharing the frame', () => {
    const message = 'x'.repeat(90);
    expect(spotlightTier(message, true)).toBeGreaterThan(spotlightTier(message, false));
  });

  it('always lands on a real size', () => {
    for (const length of [0, 1, 300, 5000]) {
      for (const photo of [false, true]) {
        const tier = spotlightTier('x'.repeat(length), photo);
        expect(tier).toBeGreaterThanOrEqual(0);
        expect(tier).toBeLessThan(SPOTLIGHT_TIERS.length);
      }
    }
  });

  for (const [screen, width] of [
    ['1920×1080', 979],
    ['2560×1440', 1305],
  ] as const) {
    it(`fits the longest wish of every size inside its clamp at ${screen}`, () => {
      for (const hasPhoto of [false, true]) {
        for (let length = 1; length <= LIMITS.wishChars; length++) {
          const tier = SPOTLIGHT_TIERS[spotlightTier('x'.repeat(length), hasPhoto)]!;
          expect(linesNeeded(length, tier.cqi, width, hasPhoto)).toBeLessThanOrEqual(tier.lines);
        }
      }
    });
  }
});

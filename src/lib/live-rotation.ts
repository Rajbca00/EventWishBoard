import type { PublicWish } from './types';

/**
 * What the venue display is showing, and what it shows next.
 *
 * The reception screen is a spotlight — one wish, large enough to read from a
 * few feet away — beside a wall of recent wishes. The spotlight moves through
 * the event's newest wishes on its own; a wish that has just arrived jumps the
 * queue so the guest who wrote it sees it straight away.
 *
 * The side wall is laid out in stable positions. When the spotlight moves on,
 * exactly one tile changes — the one the new spotlight wish vacated — instead
 * of every card reshuffling, which is what keeps the screen calm over a whole
 * evening.
 *
 * Pure, so every rule here can be tested without a browser or a clock.
 */

export interface RotationState {
  /** The wishes in play, oldest first. */
  pool: PublicWish[];
  spotlightId: string | null;
  /** The wish fading out of the spotlight, if any. */
  previousId: string | null;
  /** Arrivals waiting for the spotlight, next first. */
  queue: string[];
  /** Wishes that arrived while the screen was up and have not yet had their turn. */
  fresh: string[];
  /** Side wall tiles, by position. */
  slots: string[];
  /** How many tiles the side wall can hold at a readable size. */
  capacity: number;
  /** Increments on every spotlight change, so a timer can restart on a repeat. */
  turn: number;
}

export type RotationAction =
  | { type: 'sync'; wishes: PublicWish[]; limit: number }
  | { type: 'advance' }
  | { type: 'capacity'; capacity: number };

const byCreated = (a: PublicWish, b: PublicWish) => a.createdAt.localeCompare(b.createdAt);

/**
 * The wishes the screen rotates through: every featured wish the organiser
 * pinned, then the newest of the rest, up to the event's wall limit.
 *
 * Sorted here rather than trusted from the caller, because the two data sources
 * do not hand back the same order.
 */
export function selectPool(wishes: PublicWish[], limit: number): PublicWish[] {
  const cap = Math.max(1, Math.floor(limit));
  const sorted = [...wishes].sort(byCreated);
  const featured = sorted.filter((wish) => wish.featured).slice(-cap);
  const room = cap - featured.length;
  const rest = room > 0 ? sorted.filter((wish) => !wish.featured).slice(-room) : [];
  return [...featured, ...rest].sort(byCreated);
}

/** The next wish to spotlight when nothing has arrived: one step older, wrapping to the newest. */
export function nextInRotation(pool: PublicWish[], currentId: string | null): string | null {
  if (!pool.length) return null;
  const index = currentId ? pool.findIndex((wish) => wish.id === currentId) : -1;
  if (index <= 0) return pool[pool.length - 1]!.id;
  return pool[index - 1]!.id;
}

/**
 * Fills the side wall while keeping every wish that stays on it where it was.
 *
 * `candidates` is newest first. The first `capacity` of them belong on the
 * wall; any already in a tile keep that tile, and newcomers take the tiles
 * that were freed.
 */
export function assignSlots(previous: string[], candidates: string[], capacity: number): string[] {
  const wanted = candidates.slice(0, Math.max(0, capacity));
  const wantedSet = new Set(wanted);

  const slots: (string | null)[] = previous
    .slice(0, capacity)
    .map((id) => (wantedSet.has(id) ? id : null));
  while (slots.length < wanted.length) slots.push(null);

  const placed = new Set(slots.filter(Boolean));
  const incoming = wanted.filter((id) => !placed.has(id));
  for (let i = 0; i < slots.length && incoming.length; i++) {
    if (slots[i] === null) slots[i] = incoming.shift()!;
  }

  // A hole only survives if a wish was taken down; close it up.
  return slots.filter((id): id is string => id !== null);
}

function withSlots(state: RotationState): RotationState {
  const candidates = [...state.pool]
    .reverse()
    .map((wish) => wish.id)
    .filter((id) => id !== state.spotlightId);
  return { ...state, slots: assignSlots(state.slots, candidates, state.capacity) };
}

export function initRotation(wishes: PublicWish[], limit: number, capacity = 6): RotationState {
  const pool = selectPool(wishes, limit);
  return withSlots({
    pool,
    spotlightId: pool.at(-1)?.id ?? null,
    previousId: null,
    queue: [],
    fresh: [],
    slots: [],
    capacity,
    turn: 0,
  });
}

export function rotationReducer(state: RotationState, action: RotationAction): RotationState {
  switch (action.type) {
    case 'capacity': {
      const capacity = Math.max(0, Math.floor(action.capacity));
      if (capacity === state.capacity) return state;
      return withSlots({ ...state, capacity });
    }

    case 'advance': {
      if (!state.pool.length) return state;
      const inPool = new Set(state.pool.map((wish) => wish.id));

      const queue = state.queue.filter((id) => inPool.has(id) && id !== state.spotlightId);
      const next = queue.shift() ?? nextInRotation(state.pool, state.spotlightId);

      // A single wish stays put; the turn still ticks so its timer restarts.
      if (next === state.spotlightId) return { ...state, queue, turn: state.turn + 1 };

      return withSlots({
        ...state,
        spotlightId: next,
        previousId: state.spotlightId,
        queue,
        // The wish leaving the spotlight has had its moment.
        fresh: state.fresh.filter((id) => id !== state.spotlightId),
        turn: state.turn + 1,
      });
    }

    case 'sync': {
      const pool = selectPool(action.wishes, action.limit);
      const ids = new Set(pool.map((wish) => wish.id));
      const known = new Set(state.pool.map((wish) => wish.id));
      const newestKnown = state.pool.reduce(
        (latest, wish) => (wish.createdAt > latest ? wish.createdAt : latest),
        '',
      );

      /*
       * An arrival is a wish nobody has seen that is newer than anything on
       * screen. An old wish re-entering the pool — un-hidden by the organiser,
       * or pulled in by a bigger wall limit — is not an arrival and does not
       * interrupt the spotlight.
       */
      const arrivals = pool
        .filter((wish) => !known.has(wish.id) && wish.createdAt > newestKnown)
        .reverse()
        .map((wish) => wish.id);
      const arrivalSet = new Set(arrivals);

      let queue = [...arrivals, ...state.queue.filter((id) => ids.has(id) && !arrivalSet.has(id))];
      let spotlightId = state.spotlightId && ids.has(state.spotlightId) ? state.spotlightId : null;
      let previousId = state.previousId && ids.has(state.previousId) ? state.previousId : null;
      let turn = state.turn;

      if (arrivals.length) {
        previousId = spotlightId;
        spotlightId = queue.shift()!;
        turn += 1;
      } else if (!spotlightId && pool.length) {
        // The spotlight wish was taken down: move on rather than show a gap.
        previousId = null;
        spotlightId = queue.shift() ?? nextInRotation(pool, state.spotlightId) ?? pool.at(-1)!.id;
        turn += 1;
      } else if (!pool.length) {
        spotlightId = null;
        previousId = null;
        queue = [];
      }

      return withSlots({
        ...state,
        pool,
        spotlightId,
        previousId,
        queue,
        fresh: [...arrivals, ...state.fresh.filter((id) => ids.has(id) && !arrivalSet.has(id))],
        turn,
      });
    }
  }
}

/* ------------------------------------------------------------------ timing */

/**
 * How long a wish stays in the spotlight, in ms.
 *
 * Long enough to read at a comfortable pace from a few feet away — roughly
 * 200 words a minute, plus a moment to look at the photo — and never so long
 * that the screen feels stuck. A wish that has just arrived gets a little
 * longer, because its author is probably standing in front of it.
 */
export function dwellFor(wish: Pick<PublicWish, 'message' | 'selfieUrl'>, arrived = false): number {
  const reading = 6500 + wish.message.trim().length * 40;
  const withPhoto = reading + (wish.selfieUrl ? 1500 : 0);
  const base = Math.min(15000, Math.max(7000, withPhoto));
  return base + (arrived ? 3000 : 0);
}

/* ------------------------------------------------------------------ type */

/**
 * Spotlight type sizes, largest first, as a share of the spotlight's width.
 *
 * Sized in container units rather than viewport units, so the spotlight reads
 * the same whether it is on a 24" or a 27" panel at 1080p or 1440p. Each size
 * comes with the most lines it may run to; the clamp is only a backstop,
 * because the sizes are chosen so a wish of that length fits in fewer.
 */
export const SPOTLIGHT_TIERS = [
  { upTo: 50, cqi: 6.4, lines: 3 },
  { upTo: 110, cqi: 5.4, lines: 4 },
  { upTo: 180, cqi: 4.7, lines: 6 },
  { upTo: 260, cqi: 4.1, lines: 7 },
  { upTo: 380, cqi: 3.6, lines: 9 },
  { upTo: Infinity, cqi: 3.15, lines: 11 },
] as const;

/**
 * Which size a wish is set at. A photo takes a large share of the width, so the
 * same message wraps to nearly twice as many lines beside one.
 */
export function spotlightTier(message: string, hasPhoto: boolean): number {
  const length = Math.max(1, message.trim().length) * (hasPhoto ? 1.75 : 1);
  const index = SPOTLIGHT_TIERS.findIndex((tier) => length <= tier.upTo);
  return index === -1 ? SPOTLIGHT_TIERS.length - 1 : index;
}

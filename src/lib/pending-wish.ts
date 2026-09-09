'use client';

import type { WishDraft } from './types';

/**
 * Local persistence for a wish that has been sent but not yet accepted.
 *
 * Event venues have famously bad connectivity — basements, marquees, farmhouses
 * with two bars of 4G shared between 200 guests. Without this, a failed request
 * loses the guest's message outright: they see an error, the queue behind them
 * grows, and they walk away. Keeping the draft on the device means the wish
 * survives a dropped connection, a locked phone, even a browser restart.
 */

const KEY_PREFIX = 'lb-pending-wish:';

export interface PendingWish {
  draft: WishDraft;
  /** When the guest first pressed Send. */
  createdAt: number;
  attempts: number;
}

function key(eventId: string) {
  return `${KEY_PREFIX}${eventId}`;
}

/** Anything older than this is stale — the celebration has moved on. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function savePendingWish(eventId: string, draft: WishDraft, attempts = 0): void {
  try {
    const existing = loadPendingWish(eventId);
    const payload: PendingWish = {
      draft,
      createdAt: existing?.createdAt ?? Date.now(),
      attempts,
    };
    localStorage.setItem(key(eventId), JSON.stringify(payload));
  } catch {
    // Private browsing, or the selfie pushed us past the storage quota.
    // Retrying in memory still works; we just lose the cross-reload safety net.
  }
}

export function loadPendingWish(eventId: string): PendingWish | null {
  try {
    const raw = localStorage.getItem(key(eventId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingWish;
    if (!parsed?.draft?.message) return null;

    if (Date.now() - (parsed.createdAt ?? 0) > MAX_AGE_MS) {
      clearPendingWish(eventId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingWish(eventId: string): void {
  try {
    localStorage.removeItem(key(eventId));
  } catch {
    // Nothing to do — a stale entry expires on its own.
  }
}

/**
 * Whether a failed attempt is worth retrying.
 *
 * A rejected wish (too long, event closed, rate limited) will be rejected again
 * no matter how many times we try, and silently retrying it would be dishonest.
 * Only genuine transport failures and server faults get another go.
 */
export function isRetryable(status: number | null): boolean {
  if (status === null) return true; // the request never reached the server
  if (status >= 500) return true; // the server fell over; not the guest's fault
  return status === 408 || status === 425;
}

/**
 * How many times to retry when the SERVER answered and failed.
 *
 * Unlimited here would strand a guest on "Still sending…" through any
 * server-side outage. Transport failures are not capped: patchy venue signal
 * really does come back, and the draft is safe on the device meanwhile.
 */
export const MAX_SERVER_RETRIES = 3;

/** Exponential backoff, capped so a long outage still retries every ~30s. */
export function retryDelay(attempt: number): number {
  return Math.min(2000 * 2 ** attempt, 30_000);
}

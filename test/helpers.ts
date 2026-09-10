import { getEvent } from '@/lib/data/events';
import type { CelebrationEvent } from '@/lib/types';
import type { WishSubmission } from '@/lib/validation';

export type { CelebrationEvent };
/** What `submitGuestWish` takes, named for readability in the suites. */
export type WishSubmissionInput = WishSubmission;

const WEDDING_ID = 'laya-bee-wedding-001';
const BIRTHDAY_ID = 'ananya-birthday-001';

/**
 * Throws away the in-memory demo store so each test starts from the seed.
 *
 * The store memoises itself on `globalThis` to survive the dev server's module
 * reloads, which means it also survives between tests in one file.
 */
export function freshStore(): void {
  delete (globalThis as { __wishWallDemo?: unknown }).__wishWallDemo;
}

export async function wedding(): Promise<CelebrationEvent> {
  const event = await getEvent(WEDDING_ID);
  if (!event) throw new Error('the demo store no longer seeds the wedding event');
  return event;
}

export async function birthday(): Promise<CelebrationEvent> {
  const event = await getEvent(BIRTHDAY_ID);
  if (!event) throw new Error('the demo store no longer seeds the birthday event');
  return event;
}

export const EVENT_IDS = { wedding: WEDDING_ID, birthday: BIRTHDAY_ID };

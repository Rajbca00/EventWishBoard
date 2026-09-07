'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminOrThrow } from '@/lib/admin-auth';
import {
  createEvent,
  deleteEvent,
  updateEvent,
  type CreateEventInput,
  type UpdateEventInput,
} from '@/lib/data/events';
import { createPreloadedWish, deleteWish, removeSelfie, updateWish } from '@/lib/data/wishes';
import { createAsset, deleteAsset, updateAsset } from '@/lib/data/assets';
import {
  assetPatchSchema,
  assetUploadSchema,
  createEventSchema,
  firstIssue,
  preloadedWishSchema,
  updateEventSchema,
  wishPatchSchema,
} from '@/lib/validation';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/**
 * Every action funnels through here so the admin check, the validation error
 * shape and the "unexpected failure" message are identical everywhere.
 */
async function guard<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await requireAdminOrThrow();
    return { ok: true, data: await run() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return { ok: false, error: message };
  }
}

function refreshEvent(eventId: string) {
  revalidatePath('/admin');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/wishes`);
  revalidatePath(`/admin/events/${eventId}/memories`);
  revalidatePath(`/admin/events/${eventId}/assets`);
  revalidatePath(`/event/${eventId}`);
}

/* ------------------------------------------------------------------ events */

export async function createEventAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const parsed = createEventSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    const event = await createEvent(parsed.data as CreateEventInput);
    revalidatePath('/admin');
    revalidatePath('/');
    return { id: event.id };
  });
}

export async function updateEventAction(eventId: string, input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = updateEventSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    await updateEvent(eventId, parsed.data as UpdateEventInput);
    refreshEvent(eventId);
    return undefined;
  });
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  return guard(async () => {
    await deleteEvent(eventId);
    revalidatePath('/admin');
    revalidatePath('/');
    return undefined;
  });
}

/* ------------------------------------------------------------------ wishes */

export async function addPreloadedWishAction(eventId: string, input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = preloadedWishSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    await createPreloadedWish(eventId, parsed.data);
    refreshEvent(eventId);
    return undefined;
  });
}

export async function updateWishAction(
  eventId: string,
  wishId: string,
  input: unknown,
): Promise<ActionResult> {
  return guard(async () => {
    const parsed = wishPatchSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    await updateWish(wishId, parsed.data);
    refreshEvent(eventId);
    return undefined;
  });
}

export async function deleteWishAction(eventId: string, wishId: string): Promise<ActionResult> {
  return guard(async () => {
    await deleteWish(wishId);
    refreshEvent(eventId);
    return undefined;
  });
}

export async function removeSelfieAction(eventId: string, wishId: string): Promise<ActionResult> {
  return guard(async () => {
    await removeSelfie(wishId);
    refreshEvent(eventId);
    return undefined;
  });
}

/* ------------------------------------------------------------------ assets */

export async function createAssetAction(eventId: string, input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = assetUploadSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    await createAsset(eventId, parsed.data);
    refreshEvent(eventId);
    return undefined;
  });
}

export async function updateAssetAction(
  eventId: string,
  assetId: string,
  input: unknown,
): Promise<ActionResult> {
  return guard(async () => {
    const parsed = assetPatchSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    await updateAsset(assetId, parsed.data);
    refreshEvent(eventId);
    return undefined;
  });
}

export async function deleteAssetAction(eventId: string, assetId: string): Promise<ActionResult> {
  return guard(async () => {
    await deleteAsset(assetId);
    refreshEvent(eventId);
    return undefined;
  });
}

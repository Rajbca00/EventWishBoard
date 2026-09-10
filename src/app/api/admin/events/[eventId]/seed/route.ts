import { NextRequest } from 'next/server';
import { requireAdminOrThrow } from '@/lib/admin-auth';
import { getEvent } from '@/lib/data/events';
import { countSeededWishes, removeSeededWishes, seedWishes } from '@/lib/data/seed';
import { seedBatchSchema, firstIssue } from '@/lib/validation';
import { jsonError, jsonOk } from '@/lib/request';

/**
 * Test data for one event.
 *
 * GET tells the dashboard how many test wishes are already there, POST adds a
 * batch, DELETE removes all of them. Admin-only in every case: this writes to a
 * real event and uploads real files.
 */

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/** A batch of ten compressed photos, plus slack for the JSON around them. */
const MAX_BODY_BYTES = 16 * 1024 * 1024;

async function gate() {
  try {
    await requireAdminOrThrow();
    return null;
  } catch {
    return jsonError('Sign in to continue', 401);
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const denied = await gate();
  if (denied) return denied;

  const { eventId } = await params;
  if (!(await getEvent(eventId))) return jsonError('Event not found', 404);

  return jsonOk({ seeded: await countSeededWishes(eventId) });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const denied = await gate();
  if (denied) return denied;

  const { eventId } = await params;
  if (!(await getEvent(eventId))) return jsonError('Event not found', 404);

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return jsonError('That batch is too large. Send fewer wishes at a time.', 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('That batch could not be read');
  }

  const parsed = seedBatchSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  try {
    const { created, failed } = await seedWishes(eventId, parsed.data.wishes);
    return jsonOk({ created: created.length, failed }, 201);
  } catch (error) {
    console.error('[seed]', error);
    return jsonError(error instanceof Error ? error.message : 'Could not add the test wishes', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const denied = await gate();
  if (denied) return denied;

  const { eventId } = await params;
  if (!(await getEvent(eventId))) return jsonError('Event not found', 404);

  try {
    return jsonOk(await removeSeededWishes(eventId));
  } catch (error) {
    console.error('[seed cleanup]', error);
    return jsonError(error instanceof Error ? error.message : 'Could not remove the test wishes', 500);
  }
}

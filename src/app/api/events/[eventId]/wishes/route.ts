import { NextRequest } from 'next/server';
import { getEvent } from '@/lib/data/events';
import { getWallWishes, submitGuestWish, SubmissionError } from '@/lib/data/wishes';
import { wishSubmissionSchema, firstIssue } from '@/lib/validation';
import { ipHashFrom, jsonError, jsonOk } from '@/lib/request';
import { ImageError } from '@/lib/images';

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/** The public Wish Wall for this event. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return jsonError('Event not found', 404);
  if (!event.settings.wallEnabled) return jsonOk({ wall: [] });

  return jsonOk({ wall: await getWallWishes(event) });
}

/**
 * Guest submission. Everything here runs server-side with the service-role key
 * so that sanitising, spam checks, rate limits and expiry cannot be bypassed by
 * a guest editing the request.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { eventId } = await params;

  const event = await getEvent(eventId);
  if (!event) return jsonError('Event not found', 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('That submission could not be read');
  }

  const parsed = wishSubmissionSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  try {
    const { wish, pending } = await submitGuestWish(event, parsed.data, ipHashFrom(request.headers));
    const wall = event.settings.wallEnabled ? await getWallWishes(event) : [];
    return jsonOk({ wish, pending, wall }, 201);
  } catch (error) {
    if (error instanceof SubmissionError) return jsonError(error.message, error.status);
    if (error instanceof ImageError) return jsonError(error.message, error.status);
    console.error('[wish submission]', error);
    return jsonError('Your wish could not be sent right now. Please try again.', 500);
  }
}

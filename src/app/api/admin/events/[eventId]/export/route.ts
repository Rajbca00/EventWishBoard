import { NextRequest } from 'next/server';
import { requireAdminOrThrow } from '@/lib/admin-auth';
import { getEvent } from '@/lib/data/events';
import { exportWishesCsv } from '@/lib/data/wishes';
import { jsonError } from '@/lib/request';

/** Downloads every wish for an event as CSV. Organiser only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    await requireAdminOrThrow();
  } catch {
    return jsonError('Sign in to continue', 401);
  }

  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return jsonError('Event not found', 404);

  const csv = await exportWishesCsv(event.id);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wishes-${event.id}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

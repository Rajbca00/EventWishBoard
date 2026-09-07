import { NextRequest } from 'next/server';
import { getEvent, recordScan } from '@/lib/data/events';
import { ipHashFrom, jsonError, jsonOk } from '@/lib/request';

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/** Records one QR scan so the dashboard can show a submission rate. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { eventId } = await params;

  const event = await getEvent(eventId);
  if (!event) return jsonError('Event not found', 404);

  try {
    await recordScan(eventId, ipHashFrom(request.headers));
  } catch (error) {
    // Analytics must never break the guest experience.
    console.error('[scan]', error);
  }

  return jsonOk({ ok: true });
}

import { NextRequest } from 'next/server';
import { requireAdminOrThrow } from '@/lib/admin-auth';
import { buildArchive } from '@/lib/data/archive';
import { jsonError, jsonOk } from '@/lib/request';

/**
 * Returns the archive manifest: the standalone HTML, the data files, and a
 * signed URL per photo. The browser fetches the images and writes the zip,
 * because a real event's archive runs well past the few megabytes a
 * serverless function may return in a single response.
 */
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
  const manifest = await buildArchive(eventId);
  if (!manifest) return jsonError('Event not found', 404);

  return jsonOk(manifest);
}

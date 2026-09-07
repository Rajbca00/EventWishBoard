'use client';

import { useEffect } from 'react';

/**
 * Counts one QR scan per browser session, so a guest refreshing the page or
 * coming back for a second look does not distort the submission rate.
 */
export default function ScanBeacon({ eventId }: { eventId: string }) {
  useEffect(() => {
    const key = `lb-scan:${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private browsing can block storage; counting twice beats not counting.
    }

    const controller = new AbortController();
    fetch(`/api/events/${eventId}/scan`, {
      method: 'POST',
      signal: controller.signal,
      keepalive: true,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [eventId]);

  return null;
}

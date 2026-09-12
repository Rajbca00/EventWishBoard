import type { Metadata } from 'next';
import { Noto_Color_Emoji } from 'next/font/google';
import { notFound } from 'next/navigation';
import LiveWall from '@/components/wall/LiveWall';
import { getEvent } from '@/lib/data/events';
import { getWallWishes } from '@/lib/data/wishes';
import { resolveTheme, themeStyle } from '@/lib/themes';
import { siteUrl } from '@/lib/env';

/*
 * A colour emoji font for the venue screen only. Guests' phones have current
 * emoji; the laptop or mini-PC driving a reception monitor often does not, and
 * Windows 10 draws anything newer than 2020 (🫶, 🥹) as an empty box. Google
 * serves it split by unicode range, so the screen downloads only the slices
 * holding emoji it actually shows — hence no preload, which would fetch them all.
 */
const emoji = Noto_Color_Emoji({
  weight: '400',
  subsets: ['emoji'],
  display: 'swap',
  preload: false,
  variable: '--font-noto-emoji',
});

interface PageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ refresh?: string; motion?: string; qr?: string; debug?: string }>;
}

// A venue screen must always show the current wall, never a cached one.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId).catch(() => null);
  return {
    title: event ? `Live wall · ${event.hosts || event.name}` : 'Live wall',
    robots: { index: false, follow: false },
  };
}

export default async function LiveWallPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const { refresh, motion, qr, debug } = await searchParams;

  const event = await getEvent(eventId);
  if (!event) notFound();

  const wishes = await getWallWishes(event, 60);
  const theme = resolveTheme(event.themeId);

  // ?refresh=15 tunes polling; ?motion=off stills the board.
  const seconds = Math.min(Math.max(Number(refresh) || 30, 10), 300);

  // The QR code follows the event setting, which the organiser can change from
  // the dashboard while the screen runs. ?qr=large|small|off pins it for this
  // one screen instead. ?debug=1 shows counts, timings and layout during setup.
  const pinnedQr =
    qr === 'off' || qr === 'hidden'
      ? 'hidden'
      : qr === 'small'
        ? 'compact'
        : qr === 'large' || qr === 'on'
          ? 'full'
          : null;
  const qrMode = pinnedQr ?? event.settings.liveQr;

  return (
    <div className={emoji.variable} style={themeStyle(theme)}>
      <LiveWall
        theme={theme}
        eventId={event.id}
        hosts={event.hosts || event.name}
        guestUrl={`${siteUrl()}/event/${event.id}`}
        initialWishes={wishes}
        displayLimit={event.settings.wallLimit}
        refreshSeconds={seconds}
        forceMotion={motion !== 'off'}
        qrMode={qrMode}
        qrPinned={pinnedQr !== null}
        debug={debug === '1' || debug === 'true'}
      />
    </div>
  );
}

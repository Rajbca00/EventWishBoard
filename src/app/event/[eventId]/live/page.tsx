import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LiveWall from '@/components/wall/LiveWall';
import { getEvent } from '@/lib/data/events';
import { getWallWishes } from '@/lib/data/wishes';
import { resolveTheme, themeStyle } from '@/lib/themes';
import { siteUrl } from '@/lib/env';

interface PageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ refresh?: string; motion?: string }>;
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
  const { refresh, motion } = await searchParams;

  const event = await getEvent(eventId);
  if (!event) notFound();

  const wishes = await getWallWishes(event, 60);
  const theme = resolveTheme(event.themeId);

  // ?refresh=15 tunes polling; ?motion=off stills the board.
  const seconds = Math.min(Math.max(Number(refresh) || 30, 10), 300);

  return (
    <div style={themeStyle(theme)}>
      <LiveWall
        theme={theme}
        eventId={event.id}
        hosts={event.hosts || event.name}
        guestUrl={`${siteUrl()}/event/${event.id}`}
        initialWishes={wishes}
        refreshSeconds={seconds}
        forceMotion={motion !== 'off'}
      />
    </div>
  );
}

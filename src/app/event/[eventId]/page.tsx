import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuestExperience from '@/components/guest/GuestExperience';
import ScanBeacon from '@/components/guest/ScanBeacon';
import { getEvent, getEventStatus } from '@/lib/data/events';
import { getGuestAssets } from '@/lib/data/assets';
import { getWallWishes } from '@/lib/data/wishes';
import type { GuestPayload } from '@/lib/types';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

// Wishes arrive continuously during an event, so never serve a cached wall.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId).catch(() => null);
  if (!event) return { title: 'Wish Wall' };

  const who = event.hosts || event.name;
  return {
    title: `Wishes for ${who}`,
    description: event.welcomeMessage || `Add your wishes for ${who} — a Laya & Bee experience.`,
    openGraph: {
      title: `Add your wishes for ${who}`,
      description: 'Your message will become part of their digital Wish Wall.',
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [assets, wall, status] = await Promise.all([
    getGuestAssets(event),
    event.settings.wallEnabled ? getWallWishes(event) : Promise.resolve([]),
    getEventStatus(event),
  ]);

  const payload: GuestPayload = {
    event: {
      id: event.id,
      name: event.name,
      hosts: event.hosts,
      eventDate: event.eventDate,
      description: event.description,
      welcomeMessage: event.welcomeMessage,
      logoUrl: event.logoUrl,
      background: event.background,
      themeId: event.themeId,
      settings: {
        selfieEnabled: event.settings.selfieEnabled,
        wallEnabled: event.settings.wallEnabled,
        charLimit: event.settings.charLimit,
        showInstagram: event.settings.showInstagram,
        showReview: event.settings.showReview,
        publicSelfies: event.settings.publicSelfies,
      },
      status,
    },
    assets,
    wall,
  };

  return (
    <>
      <ScanBeacon eventId={event.id} />
      <GuestExperience payload={payload} />
    </>
  );
}

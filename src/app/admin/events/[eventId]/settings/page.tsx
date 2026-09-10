import { notFound } from 'next/navigation';
import EventForm from '@/components/admin/EventForm';
import DangerZone from '@/components/admin/DangerZone';
import SeedPanel from '@/components/admin/SeedPanel';
import { PageHeader, Panel } from '@/components/admin/ui';
import { getEvent } from '@/lib/data/events';
import { getGuestAssets } from '@/lib/data/assets';
import { countSeededWishes } from '@/lib/data/seed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [assets, seeded] = await Promise.all([
    getGuestAssets(event),
    countSeededWishes(event.id).catch(() => 0),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle={event.hosts || event.name} />
      <EventForm event={event} />
      <div className="mt-8">
        <Panel
          title="Fill the wall with test wishes"
          description="See how it looks full, then take them straight back out"
        >
          <SeedPanel event={event} assets={assets} initialSeeded={seeded} />
        </Panel>
      </div>
      <div className="mt-8">
        <DangerZone event={event} />
      </div>
    </div>
  );
}

import { notFound } from 'next/navigation';
import EventForm from '@/components/admin/EventForm';
import DangerZone from '@/components/admin/DangerZone';
import { PageHeader } from '@/components/admin/ui';
import { getEvent } from '@/lib/data/events';

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

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle={event.hosts || event.name} />
      <EventForm event={event} />
      <div className="mt-8">
        <DangerZone event={event} />
      </div>
    </div>
  );
}

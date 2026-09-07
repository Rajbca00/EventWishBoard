import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/data/events';
import { listWishes } from '@/lib/data/wishes';
import { PageHeader, Panel } from '@/components/admin/ui';
import WishTable from '@/components/admin/WishTable';
import PreloadedWishForm from '@/components/admin/PreloadedWishForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wishes' };

export default async function WishesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const wishes = await listWishes(event.id, { limit: 500 });

  return (
    <>
      <PageHeader
        title="Wishes"
        subtitle={`${wishes.length} collected for ${event.hosts || event.name}`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel>
          <WishTable eventId={event.id} wishes={wishes} />
        </Panel>

        <Panel
          title="Add a preloaded wish"
          description="So the wall is never empty for your first guest"
        >
          <PreloadedWishForm eventId={event.id} />
        </Panel>
      </div>
    </>
  );
}

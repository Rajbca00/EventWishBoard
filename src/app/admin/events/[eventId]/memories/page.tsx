import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/data/events';
import { listMemories } from '@/lib/data/wishes';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import MemoryGallery from '@/components/admin/MemoryGallery';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Memories' };

export default async function MemoriesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const memories = await listMemories(event.id);

  return (
    <>
      <PageHeader
        title="Memories"
        subtitle={`${memories.length} guest ${memories.length === 1 ? 'photo' : 'photos'} · private to you`}
      />

      <Panel>
        {memories.length === 0 ? (
          <EmptyState
            emoji="📸"
            title="No selfies yet"
            detail={
              event.settings.selfieEnabled
                ? 'Guest photos will appear here as they arrive. Only you can see them.'
                : 'Selfie collection is turned off for this event. Enable it in Settings.'
            }
          />
        ) : (
          <MemoryGallery eventId={event.id} memories={memories} />
        )}
      </Panel>
    </>
  );
}

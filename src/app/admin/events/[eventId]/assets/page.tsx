import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/data/events';
import { listAssets } from '@/lib/data/assets';
import { PageHeader, Panel } from '@/components/admin/ui';
import AssetManager from '@/components/admin/AssetManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assets' };

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const assets = await listAssets(event.id);

  return (
    <>
      <PageHeader
        title="Stickers, GIFs & Memes"
        subtitle="What guests can add to their wish"
      />
      <Panel>
        <AssetManager eventId={event.id} assets={assets} />
      </Panel>
    </>
  );
}

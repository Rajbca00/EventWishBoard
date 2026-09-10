import { notFound } from 'next/navigation';
import { getEvent } from '@/lib/data/events';
import { getBookForEvent, getBookToken } from '@/lib/data/book';
import { siteUrl } from '@/lib/env';
import { PageHeader, Panel } from '@/components/admin/ui';
import BookSharePanel from '@/components/admin/BookSharePanel';
import ArchiveButton from '@/components/admin/ArchiveButton';
import MemoryBookView from '@/components/book/MemoryBookView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Memory book' };

export default async function BookPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [book, token] = await Promise.all([
    getBookForEvent(event.id),
    getBookToken(event.id),
  ]);

  return (
    <>
      <PageHeader
        title="Memory book"
        subtitle={`A keepsake of every wish for ${event.hosts || event.name}`}
      />

      <div className="space-y-5">
        <Panel
          title="Share with the couple"
          description="A private link they can open, print, and forward to family"
        >
          <BookSharePanel
            eventId={event.id}
            origin={siteUrl()}
            initialToken={token}
            photoCount={book?.counts.photos ?? 0}
          />
        </Panel>

        <Panel
          title="Download the archive"
          description="Everything in one zip, to keep or hand over"
        >
          <ArchiveButton eventId={event.id} />
        </Panel>

        <Panel title="Preview" description="Exactly what the couple will see">
          {book && book.wishes.length > 0 ? (
            <div className="overflow-hidden rounded-b-2xl">
              <MemoryBookView book={book} />
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-[0.88rem] text-[var(--ink-soft)]">
              The book fills up as approved wishes arrive.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

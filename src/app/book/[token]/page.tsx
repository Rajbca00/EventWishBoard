import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MemoryBookView from '@/components/book/MemoryBookView';
import { getBookByToken } from '@/lib/data/book';

interface PageProps {
  params: Promise<{ token: string }>;
}

// The book reflects moderation changes, so it is never cached.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const book = await getBookByToken(token).catch(() => null);
  if (!book) return { title: 'Memory book', robots: { index: false, follow: false } };

  return {
    title: `A book of wishes for ${book.event.hosts || book.event.name}`,
    description: `${book.counts.wishes} wishes collected at their celebration.`,
    // Unlisted, not public: keep it out of search results entirely.
    robots: { index: false, follow: false },
  };
}

export default async function MemoryBookPage({ params }: PageProps) {
  const { token } = await params;
  const book = await getBookByToken(token);
  if (!book) notFound();

  return <MemoryBookView book={book} />;
}

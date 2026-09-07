'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Check, EyeOff, Star, Trash2, Clock } from 'lucide-react';
import { Badge } from './ui';
import { deleteWishAction, updateWishAction } from '@/app/admin/actions';
import { formatDateTime, cn } from '@/lib/utils';
import type { AdminWish, WishStatus } from '@/lib/types';

interface Props {
  eventId: string;
  wishes: AdminWish[];
}

const FILTERS: { id: WishStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'hidden', label: 'Hidden' },
];

export default function WishTable({ eventId, wishes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<WishStatus | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = filter === 'all' ? wishes : wishes.filter((wish) => wish.status === filter);

  const run = (wishId: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyId(wishId);
    setError(null);
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (!result.ok) setError(result.error ?? 'That change did not save');
      else router.refresh();
    });
  };

  const setStatus = (wish: AdminWish, status: WishStatus) =>
    run(wish.id, () => updateWishAction(eventId, wish.id, { status }));

  const toggleFeatured = (wish: AdminWish) =>
    run(wish.id, () => updateWishAction(eventId, wish.id, { featured: !wish.featured }));

  const remove = (wish: AdminWish) => {
    if (!window.confirm('Delete this wish permanently? Any selfie attached is deleted too.')) return;
    run(wish.id, () => deleteWishAction(eventId, wish.id));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--card-line)] px-5 py-3">
        {FILTERS.map((entry) => {
          const count =
            entry.id === 'all'
              ? wishes.length
              : wishes.filter((wish) => wish.status === entry.id).length;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors',
                filter === entry.id
                  ? 'bg-[var(--accent-2)] text-white'
                  : 'text-[var(--ink-soft)] hover:bg-cocoa-50 hover:text-[var(--ink)]',
              )}
            >
              {entry.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}

        <a
          href={`/api/admin/events/${eventId}/export`}
          className="ml-auto rounded-full border border-[var(--card-line)] px-3.5 py-1.5 text-[0.8rem] font-medium text-[var(--ink)] transition-colors hover:bg-cocoa-50"
        >
          Download CSV
        </a>
      </div>

      {error && (
        <p className="bg-red-50 px-5 py-2.5 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="px-5 py-12 text-center text-[0.88rem] text-[var(--ink-soft)]">
          No {filter === 'all' ? '' : filter} wishes yet.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--card-line)]">
          {visible.map((wish) => {
            const media = wish.gif ?? wish.meme;
            const isBusy = pending && busyId === wish.id;

            return (
              <li
                key={wish.id}
                className={cn(
                  'flex flex-wrap items-start gap-3 px-5 py-4 transition-opacity',
                  isBusy && 'opacity-50',
                )}
              >
                {wish.selfieUrl ? (
                  // Signed Supabase URL — a plain img avoids re-signing through the optimiser.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wish.selfieUrl}
                    alt=""
                    className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-[var(--card-line)]"
                  />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cocoa-50 text-lg">
                    {wish.sticker && !wish.sticker.startsWith('/') ? wish.sticker : '💌'}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-[0.92rem] leading-snug text-[var(--ink)]">{wish.message}</p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.76rem] text-[var(--ink-soft)]">
                    <span className="font-medium text-[var(--ink)]">
                      {wish.isAnonymous ? 'Anonymous' : (wish.guestName ?? 'Anonymous')}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{formatDateTime(wish.createdAt)}</span>
                    {wish.preloaded && (
                      <>
                        <span aria-hidden>·</span>
                        <span>preloaded</span>
                      </>
                    )}
                    {media && (
                      <span className="relative ml-1 inline-block size-6 align-middle">
                        <Image src={media} alt="" fill sizes="24px" className="object-contain" unoptimized />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone={wish.status}>{wish.status}</Badge>

                  <IconButton
                    label={wish.featured ? 'Unfeature' : 'Feature on the wall'}
                    active={wish.featured}
                    onClick={() => toggleFeatured(wish)}
                    disabled={isBusy}
                  >
                    <Star className={cn('size-4', wish.featured && 'fill-current')} />
                  </IconButton>

                  {wish.status !== 'approved' && (
                    <IconButton label="Approve" onClick={() => setStatus(wish, 'approved')} disabled={isBusy}>
                      <Check className="size-4" />
                    </IconButton>
                  )}

                  {wish.status !== 'pending' && (
                    <IconButton
                      label="Hold for review"
                      onClick={() => setStatus(wish, 'pending')}
                      disabled={isBusy}
                    >
                      <Clock className="size-4" />
                    </IconButton>
                  )}

                  {wish.status !== 'hidden' && (
                    <IconButton
                      label="Hide from the wall"
                      onClick={() => setStatus(wish, 'hidden')}
                      disabled={isBusy}
                    >
                      <EyeOff className="size-4" />
                    </IconButton>
                  )}

                  <IconButton label="Delete" danger onClick={() => remove(wish)} disabled={isBusy}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex size-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
        active
          ? 'bg-amber-50 text-amber-600'
          : danger
            ? 'text-[var(--ink-soft)] hover:bg-red-50 hover:text-red-600'
            : 'text-[var(--ink-soft)] hover:bg-cocoa-50 hover:text-[var(--ink)]',
      )}
    >
      {children}
    </button>
  );
}

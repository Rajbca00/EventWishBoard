'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Check, EyeOff, Star, Trash2, Clock, Square, SquareCheckBig, SquareMinus } from 'lucide-react';
import { Badge } from './ui';
import {
  bulkDeleteWishesAction,
  bulkUpdateWishesAction,
  deleteWishAction,
  updateWishAction,
} from '@/app/admin/actions';
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
  const [selected, setSelected] = useState<string[]>([]);
  /** The row last ticked, so shift-click can select everything between. */
  const [anchor, setAnchor] = useState<number | null>(null);

  const visible = filter === 'all' ? wishes : wishes.filter((wish) => wish.status === filter);
  const visibleIds = useMemo(() => visible.map((wish) => wish.id), [visible]);

  /*
   * Bulk actions only ever touch what is on screen. A selection made under one
   * filter must not be deleted by someone looking at another, where those
   * wishes are no longer visible to check.
   */
  const chosen = useMemo(() => visibleIds.filter((id) => selected.includes(id)), [visibleIds, selected]);
  const allChosen = visibleIds.length > 0 && chosen.length === visibleIds.length;
  const bulkBusy = pending && busyId === '__bulk__';

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

  const clearSelection = () => {
    setSelected([]);
    setAnchor(null);
  };

  const changeFilter = (next: WishStatus | 'all') => {
    setFilter(next);
    clearSelection();
  };

  /** Ticks one row; with shift held, everything between it and the last one ticked. */
  const toggleRow = (index: number, range: boolean) => {
    const id = visibleIds[index];
    if (!id) return;
    setSelected((current) => {
      if (range && anchor !== null && anchor !== index) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        const adding = !current.includes(id);
        const next = new Set(current);
        visibleIds.slice(from, to + 1).forEach((spanId) => (adding ? next.add(spanId) : next.delete(spanId)));
        return [...next];
      }
      return current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    });
    setAnchor(index);
  };

  const toggleAll = () => {
    setSelected(allChosen ? [] : visibleIds);
    setAnchor(null);
  };

  /*
   * Approve, hold and hide are one click each — they are all reversible, and
   * moderating forty wishes should not mean forty confirmation dialogs. Only
   * delete asks first, because it cannot be undone.
   */
  const applyBulk = (action: 'approve' | 'pending' | 'hide' | 'delete') => {
    const ids = chosen;
    if (!ids.length) return;

    if (action === 'delete') {
      const noun = `wish${ids.length === 1 ? '' : 'es'}`;
      if (!window.confirm(`Delete ${ids.length} ${noun} permanently? Any photos attached are deleted too. This cannot be undone.`)) {
        return;
      }
    }

    setError(null);
    setBusyId('__bulk__');
    startTransition(async () => {
      const result =
        action === 'delete'
          ? await bulkDeleteWishesAction(eventId, ids)
          : await bulkUpdateWishesAction(eventId, ids, {
              status: action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'pending',
            });

      setBusyId(null);
      if (!result.ok) {
        setError(result.error ?? 'That change did not save');
        return;
      }
      clearSelection();
      router.refresh();
    });
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
              onClick={() => changeFilter(entry.id)}
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

      {/* The selection bar is always there, so the multi-select is found
          without having to guess that ticking a row reveals it. */}
      <div
        className={cn(
          'sticky top-0 z-10 flex min-h-12 flex-wrap items-center gap-2 border-b border-[var(--card-line)] px-5 py-2 transition-colors',
          chosen.length ? 'bg-[var(--accent-soft)]' : 'bg-cocoa-50/70',
        )}
      >
        <button
          type="button"
          onClick={toggleAll}
          disabled={!visibleIds.length || bulkBusy}
          aria-label={allChosen ? 'Clear selection' : `Select all ${visibleIds.length} wishes`}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.82rem] font-medium text-[var(--ink)] hover:bg-white/70 disabled:opacity-40"
        >
          {allChosen ? (
            <SquareCheckBig className="size-[1.1rem] text-[var(--accent-2)]" />
          ) : chosen.length ? (
            <SquareMinus className="size-[1.1rem] text-[var(--accent-2)]" />
          ) : (
            <Square className="size-[1.1rem]" />
          )}
          {chosen.length ? `${chosen.length} selected` : `Select all ${visibleIds.length}`}
        </button>

        {chosen.length > 0 ? (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--card-line)]" aria-hidden />
            <BulkButton label={`Approve ${chosen.length} selected wish${chosen.length === 1 ? '' : 'es'}`} onClick={() => applyBulk('approve')} disabled={bulkBusy} icon={<Check className="size-4" />}>
              Approve
            </BulkButton>
            <BulkButton label={`Hold ${chosen.length} selected wish${chosen.length === 1 ? '' : 'es'}`} onClick={() => applyBulk('pending')} disabled={bulkBusy} icon={<Clock className="size-4" />}>
              Hold for review
            </BulkButton>
            <BulkButton label={`Hide ${chosen.length} selected wish${chosen.length === 1 ? '' : 'es'}`} onClick={() => applyBulk('hide')} disabled={bulkBusy} icon={<EyeOff className="size-4" />}>
              Hide
            </BulkButton>
            <BulkButton label={`Delete ${chosen.length} selected wish${chosen.length === 1 ? '' : 'es'}`} onClick={() => applyBulk('delete')} disabled={bulkBusy} danger icon={<Trash2 className="size-4" />}>
              Delete
            </BulkButton>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkBusy}
              className="ml-auto text-[0.78rem] text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--ink)]"
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-[0.76rem] text-[var(--ink-soft)]">
            Tick wishes to approve, hold, hide or delete several at once · shift-click selects a range
          </span>
        )}
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
          {visible.map((wish, index) => {
            const media = [...wish.gifs, ...wish.memes];
            const emoji = wish.stickers.find((value) => !value.startsWith('/'));
            const isChosen = chosen.includes(wish.id);
            const isBusy = (pending && busyId === wish.id) || (bulkBusy && isChosen);

            return (
              <li
                key={wish.id}
                className={cn(
                  'flex flex-wrap items-start gap-3 px-5 py-4 transition-[opacity,background-color]',
                  isChosen && 'bg-[var(--accent-soft)]/45',
                  isBusy && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChosen}
                  aria-label={isChosen ? 'Unselect wish' : 'Select wish'}
                  onClick={(event) => toggleRow(index, event.shiftKey)}
                  className="-ml-1 mt-1.5 shrink-0 rounded-md p-1 text-[var(--ink-soft)] hover:bg-cocoa-50 hover:text-[var(--ink)]"
                >
                  {isChosen ? (
                    <SquareCheckBig className="size-5 text-[var(--accent-2)]" />
                  ) : (
                    <Square className="size-5" />
                  )}
                </button>

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
                    {emoji ?? '💌'}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1rem] leading-snug text-[var(--ink)]">{wish.message}</p>

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
                    {media.map((src) => (
                      <span key={src} className="relative ml-1 inline-block size-6 align-middle">
                        <Image src={src} alt="" fill sizes="24px" className="object-contain" unoptimized />
                      </span>
                    ))}
                    {wish.stickers.length > 1 && <span>{wish.stickers.length} stickers</span>}
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

function BulkButton({
  children,
  icon,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** The full name, e.g. "Delete 3 selected wishes" — the rows have their own Delete. */
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-medium transition-colors disabled:opacity-50',
        danger
          ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
          : 'border-[var(--card-line)] bg-white text-[var(--ink)] hover:bg-cocoa-50',
      )}
    >
      {icon}
      {children}
    </button>
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

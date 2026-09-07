'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteEventAction, updateEventAction } from '@/app/admin/actions';
import type { CelebrationEvent } from '@/lib/types';

export default function DangerZone({ event }: { event: CelebrationEvent }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleArchive = () => {
    startTransition(async () => {
      const result = await updateEventAction(event.id, { archived: !event.archived });
      if (!result.ok) setError(result.error ?? 'Could not update the event');
      else router.refresh();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteEventAction(event.id);
      if (!result.ok) setError(result.error ?? 'Could not delete the event');
      else router.push('/admin');
    });
  };

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
      <h2 className="font-medium text-[var(--ink)]">Danger zone</h2>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-red-200/70 pt-4">
        <div>
          <p className="text-[0.88rem] text-[var(--ink)]">
            {event.archived ? 'Reopen this event' : 'Close this event early'}
          </p>
          <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">
            {event.archived
              ? 'Guests will be able to send wishes again.'
              : 'Guests see the closing screen. Your wishes and photos stay here.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleArchive}
          disabled={pending}
          className="h-10 rounded-full border border-[var(--card-line)] bg-white px-5 text-[0.85rem] font-medium text-[var(--ink)] transition-colors hover:bg-cocoa-50 disabled:opacity-60"
        >
          {event.archived ? 'Reopen' : 'Close now'}
        </button>
      </div>

      <div className="mt-4 border-t border-red-200/70 pt-4">
        <p className="text-[0.88rem] text-[var(--ink)]">Delete this event permanently</p>
        <p className="mt-0.5 text-[0.78rem] text-[var(--ink-soft)]">
          Removes every wish, selfie and uploaded asset for {event.hosts || event.name}. This cannot
          be undone — download anything you want to keep first.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type ${event.id} to confirm`}
            className="h-10 min-w-64 flex-1 rounded-xl border border-[var(--card-line)] bg-white px-3.5 text-[0.85rem] outline-none focus:border-red-400"
          />
          <button
            type="button"
            onClick={remove}
            disabled={pending || confirmText !== event.id}
            className="h-10 rounded-full bg-red-600 px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
          >
            {pending ? 'Deleting…' : 'Delete event'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

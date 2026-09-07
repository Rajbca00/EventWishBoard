'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Download, Trash2, X } from 'lucide-react';
import { removeSelfieAction } from '@/app/admin/actions';
import { formatDateTime } from '@/lib/utils';
import type { Memory } from '@/lib/types';

interface Props {
  eventId: string;
  memories: Memory[];
}

/**
 * The organiser's private collection. Images arrive as short-lived signed URLs,
 * so nothing here is reachable without a dashboard session.
 */
export default function MemoryGallery({ eventId, memories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<Memory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = (memory: Memory) => {
    if (!window.confirm('Delete this photo? The wish itself stays on the wall.')) return;
    setError(null);
    startTransition(async () => {
      const result = await removeSelfieAction(eventId, memory.wishId);
      if (!result.ok) setError(result.error ?? 'Could not delete that photo');
      else {
        setOpen(null);
        router.refresh();
      }
    });
  };

  const download = async (memory: Memory) => {
    try {
      const response = await fetch(memory.selfieUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memory-${memory.wishId}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('That photo could not be downloaded');
    }
  };

  return (
    <div className="p-5">
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {memories.map((memory) => (
          <li key={memory.wishId}>
            <button
              type="button"
              onClick={() => setOpen(memory)}
              className="group relative block w-full overflow-hidden rounded-xl ring-1 ring-[var(--card-line)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={memory.selfieUrl}
                alt={`Photo from ${memory.name}`}
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2.5 pb-2 pt-6 text-left text-[0.74rem] text-white">
                {memory.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-full w-full max-w-md overflow-auto rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.selfieUrl} alt={`Photo from ${open.name}`} className="w-full object-contain" />

            <div className="p-4">
              <p className="text-[0.92rem] text-[var(--ink)]">{open.message}</p>
              <p className="mt-1 text-[0.78rem] text-[var(--ink-soft)]">
                {open.name} · {formatDateTime(open.createdAt)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => download(open)}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)]"
                >
                  <Download className="size-4" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => remove(open)}
                  disabled={pending}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--card-line)] px-5 text-[0.85rem] font-medium text-[var(--ink)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="ml-auto inline-flex size-10 items-center justify-center rounded-full text-[var(--ink-soft)] transition-colors hover:bg-cocoa-50"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

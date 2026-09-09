'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPreloadedWishAction } from '@/app/admin/actions';
import { LIMITS } from '@/lib/env';

const SUGGESTIONS = [
  'Wishing you a lifetime of happiness ❤️',
  "Here's to forever! 🥂",
  'May your journey together always be filled with laughter ✨',
  'May every chapter be better than the last.',
];

const STICKERS = ['❤️', '💕', '🎉', '🥂', '💍', '✨', '🎂', '🌟'];

/**
 * Preloaded wishes exist so the very first guest never meets an empty wall.
 * They default to anonymous so they read as wishes that were already there.
 */
export default function PreloadedWishForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [sticker, setSticker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addPreloadedWishAction(eventId, {
        message,
        isAnonymous: true,
        sticker,
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not add that wish');
        return;
      }
      setMessage('');
      setSticker(null);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="p-5">
      <textarea
        value={message}
        maxLength={LIMITS.wishChars}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Wishing you a lifetime of happiness ❤️"
        className="font-display w-full resize-none rounded-xl border border-[var(--card-line)] bg-white px-3.5 py-3 text-[1.02rem] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--accent)]"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {STICKERS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => setSticker(sticker === emoji ? null : emoji)}
            aria-pressed={sticker === emoji}
            className={`flex size-9 items-center justify-center rounded-lg text-lg transition-colors ${
              sticker === emoji ? 'bg-[var(--accent-soft)]' : 'hover:bg-cocoa-50'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {message.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setMessage(suggestion)}
              className="rounded-full border border-[var(--card-line)] px-3 py-1.5 text-[0.76rem] text-[var(--ink-soft)] transition-colors hover:bg-cocoa-50 hover:text-[var(--ink)]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !message.trim()}
        className="mt-4 h-10 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add to the wall'}
      </button>
    </form>
  );
}

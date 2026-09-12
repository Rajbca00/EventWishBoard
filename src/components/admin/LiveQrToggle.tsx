'use client';

import { useState, useTransition } from 'react';
import { setLiveQrAction } from '@/app/admin/actions';
import { cn } from '@/lib/utils';
import type { LiveQrMode } from '@/lib/types';

const OPTIONS: { value: LiveQrMode; label: string }[] = [
  { value: 'full', label: 'Large' },
  { value: 'compact', label: 'Small' },
  { value: 'hidden', label: 'Hidden' },
];

/**
 * Shows, shrinks or hides the QR code on the venue screen from the dashboard.
 *
 * The screen reads the setting on its next poll, so an organiser can change it
 * from their phone mid-evening without walking over to the display.
 */
export default function LiveQrToggle({ eventId, initial }: { eventId: string; initial: LiveQrMode }) {
  const [mode, setMode] = useState<LiveQrMode>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (next: LiveQrMode) => {
    if (next === mode) return;
    const previous = mode;
    setMode(next);
    setError(null);
    startTransition(async () => {
      const result = await setLiveQrAction(eventId, next);
      if (!result.ok) {
        setMode(previous);
        setError(result.error ?? 'That did not save');
      }
    });
  };

  return (
    <div>
      <p id="live-qr-label" className="mb-2 text-[0.8rem] font-medium text-[var(--ink)]">
        QR code on the live wall
      </p>
      <div
        role="radiogroup"
        aria-labelledby="live-qr-label"
        className="inline-flex rounded-full border border-[var(--card-line)] bg-cocoa-50 p-1"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            disabled={pending}
            onClick={() => choose(option.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors disabled:opacity-60',
              mode === option.value
                ? 'bg-[var(--accent-2)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className={cn('mt-2 text-[0.76rem]', error ? 'text-red-700' : 'text-[var(--ink-soft)]')} role={error ? 'alert' : undefined}>
        {error ?? 'The screen picks this up within 30 seconds — no need to touch it.'}
      </p>
    </div>
  );
}

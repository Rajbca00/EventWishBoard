'use client';

import BrandMark from '@/components/ui/BrandMark';
import SceneBackground from '@/components/wall/SceneBackground';
import { cn } from '@/lib/utils';
import type { Theme } from '@/lib/themes';

interface Props {
  theme: Theme;
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  children: React.ReactNode;
  /** Sticky CTA area pinned above the safe-area inset. */
  footer?: React.ReactNode;
  seed?: string;
}

/**
 * Shared frame for the wish-creation steps: quiet background, a progress hint,
 * and a footer that stays reachable with a mobile keyboard open.
 */
export default function StepShell({
  theme,
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  children,
  footer,
  seed,
}: Props) {
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <SceneBackground theme={theme} intensity="ambient" seed={seed ?? `step-${step}`} />

      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex size-11 items-center justify-center rounded-full text-[var(--ink-soft)] transition-colors hover:bg-white/50 hover:text-[var(--ink)]"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="size-11" />
        )}

        <BrandMark />

        {/* Progress dots — a light sense of "nearly there", no numbers to read */}
        <div className="flex size-11 items-center justify-end gap-1" aria-label={`Step ${step} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={cn(
                'block rounded-full transition-all duration-500',
                index < step ? 'h-1.5 w-1.5' : 'h-1 w-1',
              )}
              style={{
                background: index < step ? 'var(--accent)' : 'var(--card-line)',
                opacity: index < step ? 1 : 0.7,
              }}
            />
          ))}
        </div>
      </header>

      <main className="reveal relative z-10 flex flex-1 flex-col px-5 pt-8">
        <h1 className="font-display text-[1.85rem] leading-[1.15] tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]">{subtitle}</p>
        )}

        <div className="mt-7 flex-1">{children}</div>
      </main>

      {footer && (
        <footer className="sticky bottom-0 z-20 mt-6 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 -top-8"
            style={{ background: 'linear-gradient(to top, var(--bg-1) 42%, transparent)' }}
            aria-hidden
          />
          <div className="relative">{footer}</div>
        </footer>
      )}
    </div>
  );
}

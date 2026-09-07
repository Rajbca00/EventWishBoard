'use client';

import { useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import StepShell from './StepShell';
import { cn } from '@/lib/utils';
import { LIMITS } from '@/lib/env';
import type { Theme } from '@/lib/themes';

interface Props {
  theme: Theme;
  name: string;
  isAnonymous: boolean;
  onNameChange: (value: string) => void;
  onAnonymousChange: (value: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * No account, no phone number, no email — just how the guest wants to sign.
 */
export default function IdentityStep({
  theme,
  name,
  isAnonymous,
  onNameChange,
  onAnonymousChange,
  onContinue,
  onBack,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus only on comfortable-width screens: on phones this would throw up
    // the keyboard before the guest has read the question.
    if (window.innerWidth >= 640) inputRef.current?.focus();
  }, []);

  return (
    <StepShell
      theme={theme}
      step={1}
      totalSteps={4}
      onBack={onBack}
      title="How should we sign your wish?"
      subtitle="Only your name — nothing else is collected."
      seed="identity"
      footer={
        <Button size="lg" fullWidth onClick={onContinue}>
          Continue
        </Button>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="sr-only">Your name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            maxLength={LIMITS.nameChars}
            disabled={isAnonymous}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onContinue();
            }}
            placeholder="Your name (optional)"
            autoComplete="name"
            enterKeyHint="next"
            className={cn(
              'glass h-14 w-full rounded-2xl px-5 text-[1.05rem] text-[var(--ink)]',
              'placeholder:text-[var(--ink-soft)]/60',
              'transition-opacity duration-300 focus:outline-none focus-visible:ring-2',
              isAnonymous && 'pointer-events-none opacity-40',
            )}
            style={{ ['--tw-ring-color' as string]: 'var(--accent)' }}
          />
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={isAnonymous}
          onClick={() => onAnonymousChange(!isAnonymous)}
          className={cn(
            'glass flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left',
            'transition-colors duration-200',
            isAnonymous && 'bg-white/85',
          )}
        >
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
              isAnonymous ? 'border-transparent' : 'border-[var(--card-line)] bg-white/60',
            )}
            style={isAnonymous ? { background: 'var(--accent)' } : undefined}
          >
            {isAnonymous && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="m5 12.5 4.5 4.5L19 7"
                  stroke="white"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span>
            <span className="block text-[0.95rem] font-medium text-[var(--ink)]">Keep me anonymous</span>
            <span className="mt-0.5 block text-[0.8rem] text-[var(--ink-soft)]">
              Your wish appears signed &ldquo;Anonymous&rdquo;
            </span>
          </span>
        </button>
      </div>
    </StepShell>
  );
}

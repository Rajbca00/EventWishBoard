'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import Button from '@/components/ui/Button';
import StepShell from './StepShell';
import { compressImage } from '@/lib/image-client';
import type { Theme } from '@/lib/themes';

interface Props {
  theme: Theme;
  selfie: string | null;
  /** The organiser allows photos on the public wall for this event. */
  sharingOffered?: boolean;
  selfiePublic?: boolean;
  onSelfiePublicChange?: (value: boolean) => void;
  onSelfieChange: (value: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface ChoiceProps {
  selected: boolean;
  icon: string;
  title: string;
  detail: string;
  onSelect: () => void;
}

function VisibilityChoice({ selected, icon, title, detail, onSelect }: ChoiceProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`glass flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 ${
        selected ? 'ring-2' : 'opacity-80'
      }`}
      style={selected ? ({ ['--tw-ring-color' as string]: 'var(--accent)' } as React.CSSProperties) : undefined}
    >
      <span className="mt-0.5 text-lg" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[0.92rem] font-medium text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
          {detail}
        </span>
      </span>
      <span
        className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? 'border-transparent' : 'border-[var(--card-line)]'
        }`}
        style={selected ? { background: 'var(--accent)' } : undefined}
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m5 12.5 4.5 4.5L19 7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}

/**
 * Entirely optional. Two clearly-labelled inputs rather than a permissions
 * prompt: `capture` opens the front camera on a phone, the other is the gallery.
 */
export default function SelfieStep({
  theme,
  selfie,
  sharingOffered = false,
  selfiePublic = false,
  onSelfiePublicChange,
  onSelfieChange,
  onContinue,
  onBack,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      onSelfieChange(await compressImage(file));
    } catch {
      setError('That photo could not be used. Try another one.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepShell
      theme={theme}
      step={3}
      totalSteps={4}
      onBack={onBack}
      title="Add yourself to their memories 📸"
      subtitle={
        sharingOffered
          ? 'Completely optional — and you choose who gets to see it.'
          : 'Completely optional — your photo goes straight to the hosts, never onto the public wall.'
      }
      seed="selfie"
      footer={
        <div className="space-y-2">
          <Button size="lg" fullWidth onClick={onContinue}>
            {selfie ? 'Continue' : 'Skip this step'}
          </Button>
          {selfie && (
            <button
              type="button"
              onClick={() => onSelfieChange(null)}
              className="w-full py-2 text-[0.82rem] text-[var(--ink-soft)] underline underline-offset-2"
            >
              Remove photo
            </button>
          )}
        </div>
      }
    >
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {selfie ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          {/* A smaller preview when the visibility choice follows, so the guest
              can see the photo and the decision about it without scrolling. */}
          <div
            className={`relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-2xl ring-2 ring-white/70 shadow-[0_18px_36px_-24px_rgb(94_58_46/0.55)] ${
              sharingOffered ? 'max-w-[8.5rem]' : 'max-w-[12rem]'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfie} alt="Your selfie" className="size-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="mx-auto block text-[0.85rem] text-[var(--ink-soft)] underline underline-offset-2"
          >
            Retake
          </button>

          {/* The photo is the guest's, so the guest decides where it goes.
              Private is preselected — sharing has to be a deliberate choice. */}
          {sharingOffered && onSelfiePublicChange && (
            <fieldset className="space-y-2 pt-1" role="radiogroup">
              <legend className="mb-2 text-[0.82rem] font-medium text-[var(--ink)]">
                Who can see your photo?
              </legend>
              <VisibilityChoice
                selected={!selfiePublic}
                icon="🔒"
                title="Just the hosts"
                detail="Kept in their private album. No other guest sees it."
                onSelect={() => onSelfiePublicChange(false)}
              />
              <VisibilityChoice
                selected={selfiePublic}
                icon="💫"
                title="Show it on the Wish Wall"
                detail="Anyone who scans the QR code will see your photo."
                onSelect={() => onSelfiePublicChange(true)}
              />
            </fieldset>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {/* Two compact tiles side by side. The old single 4:3 block ran to
              roughly 500px on a phone, pushing the visibility choice — the
              decision that actually matters — below the fold. */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="glass flex h-28 flex-col items-center justify-center gap-2 rounded-2xl transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <span
                className="flex size-11 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-soft)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .84-.46l.72-1.1A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .84.44l.72 1.1a1 1 0 0 0 .84.46h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
                    stroke="var(--accent-2)"
                    strokeWidth="1.6"
                  />
                  <circle cx="12" cy="12.5" r="3.4" stroke="var(--accent-2)" strokeWidth="1.6" />
                </svg>
              </span>
              <span className="text-[0.9rem] font-medium text-[var(--ink)]">
                {busy ? 'Processing…' : 'Take a photo'}
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="glass flex h-28 flex-col items-center justify-center gap-2 rounded-2xl transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <span
                className="flex size-11 items-center justify-center rounded-full"
                style={{ background: 'var(--accent-soft)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="var(--accent-2)" strokeWidth="1.6" />
                  <circle cx="8.5" cy="10" r="1.5" fill="var(--accent-2)" />
                  <path
                    d="m4 17 4.8-4.6a1.6 1.6 0 0 1 2.2 0L15 16"
                    stroke="var(--accent-2)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="text-[0.9rem] font-medium text-[var(--ink)]">Upload</span>
            </button>
          </div>

          {sharingOffered && (
            <p className="pt-1 text-center text-[0.8rem] text-[var(--ink-soft)]">
              You&rsquo;ll choose who can see it next.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 text-center text-[0.85rem]" style={{ color: 'var(--accent-2)' }} role="alert">
          {error}
        </p>
      )}
    </StepShell>
  );
}

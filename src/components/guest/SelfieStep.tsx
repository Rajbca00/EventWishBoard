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
  onSelfieChange: (value: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Entirely optional. Two clearly-labelled inputs rather than a permissions
 * prompt: `capture` opens the front camera on a phone, the other is the gallery.
 */
export default function SelfieStep({ theme, selfie, onSelfieChange, onContinue, onBack }: Props) {
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
      subtitle="Completely optional — your photo goes straight to the hosts, never onto the public wall."
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
          className="space-y-4"
        >
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[17rem] overflow-hidden rounded-[1.6rem] ring-2 ring-white/70 shadow-[0_26px_50px_-28px_rgb(74_44_51/0.6)]">
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
        </motion.div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="glass flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[1.6rem] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <span
              className="flex size-16 items-center justify-center rounded-full"
              style={{ background: 'var(--accent-soft)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a1 1 0 0 0 .84-.46l.72-1.1A1 1 0 0 1 10.1 4h3.8a1 1 0 0 1 .84.44l.72 1.1a1 1 0 0 0 .84.46h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
                  stroke="var(--accent-2)"
                  strokeWidth="1.6"
                />
                <circle cx="12" cy="12.5" r="3.4" stroke="var(--accent-2)" strokeWidth="1.6" />
              </svg>
            </span>
            <span className="font-display text-[1.1rem] text-[var(--ink)]">
              {busy ? 'Processing…' : 'Take Selfie'}
            </span>
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1" style={{ background: 'var(--card-line)' }} />
            <span className="text-[0.75rem] uppercase tracking-[0.2em] text-[var(--ink-soft)]/70">or</span>
            <span className="h-px flex-1" style={{ background: 'var(--card-line)' }} />
          </div>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            loading={busy}
            onClick={() => galleryRef.current?.click()}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="8.5" cy="10" r="1.6" fill="currentColor" />
              <path d="m4 17 4.8-4.6a1.6 1.6 0 0 1 2.2 0L15 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Upload Photo
          </Button>
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

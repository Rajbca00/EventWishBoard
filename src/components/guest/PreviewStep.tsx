'use client';

import { motion } from 'motion/react';
import Button from '@/components/ui/Button';
import StepShell from './StepShell';
import WishCard from '@/components/wall/WishCard';
import type { Theme } from '@/lib/themes';
import type { WishDraft } from '@/lib/types';

interface Props {
  theme: Theme;
  draft: WishDraft;
  sending: boolean;
  /** A send failed on the network and is being retried in the background. */
  retrying?: boolean;
  error: string | null;
  onSend: () => void;
  onBack: () => void;
}

/**
 * The last beat before the payoff: show the guest exactly what the couple
 * will see, so sending feels like a decision rather than a form submit.
 */
export default function PreviewStep({
  theme,
  draft,
  sending,
  retrying = false,
  error,
  onSend,
  onBack,
}: Props) {
  const busy = sending || retrying;
  const name = draft.isAnonymous ? null : draft.guestName.trim() || null;

  return (
    <StepShell
      theme={theme}
      step={4}
      totalSteps={4}
      onBack={onBack}
      title="Preview your wish"
      subtitle="This is how it will appear on their Wish Wall."
      seed="preview"
      footer={
        <div className="space-y-2">
          <Button size="lg" fullWidth loading={busy} onClick={onSend} disabled={busy}>
            {retrying ? 'Still sending…' : '💌 Send My Wish'}
          </Button>
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="w-full py-2 text-[0.85rem] text-[var(--ink-soft)] transition-opacity disabled:opacity-50"
          >
            ← Edit
          </button>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 18, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="scene-3d flex justify-center"
      >
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <WishCard
            wish={{
              message: draft.message,
              name,
              sticker: draft.sticker,
              gif: draft.gif,
              meme: draft.meme,
              selfieUrl: draft.selfie,
            }}
            variant="preview"
            className="shadow-[0_36px_66px_-32px_rgb(74_44_51/0.6)]"
          />
        </motion.div>
      </motion.div>

      {draft.selfie && (
        <p className="mt-5 text-center text-[0.78rem] text-[var(--ink-soft)]">
          {draft.selfiePublic
            ? '💫 Your photo will appear on the Wish Wall'
            : '🔒 Your photo is shared privately with the hosts'}
        </p>
      )}

      {retrying && (
        <div
          className="glass mt-6 flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-left"
          role="status"
        >
          <span className="mt-0.5 text-base" aria-hidden>
            ✉️
          </span>
          <p className="text-[0.84rem] leading-relaxed text-[var(--ink-soft)]">
            <span className="font-medium text-[var(--ink)]">Your wish is saved on this phone.</span>{' '}
            The signal here is patchy, so we&rsquo;ll keep sending it — you can stay on this screen.
          </p>
        </div>
      )}

      {error && (
        <p
          className="mt-5 text-center text-[0.88rem]"
          style={{ color: 'var(--accent-2)' }}
          role="alert"
        >
          {error}
        </p>
      )}
    </StepShell>
  );
}

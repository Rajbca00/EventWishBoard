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
  error: string | null;
  onSend: () => void;
  onBack: () => void;
}

/**
 * The last beat before the payoff: show the guest exactly what the couple
 * will see, so sending feels like a decision rather than a form submit.
 */
export default function PreviewStep({ theme, draft, sending, error, onSend, onBack }: Props) {
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
          <Button size="lg" fullWidth loading={sending} onClick={onSend}>
            💌 Send My Wish
          </Button>
          <button
            type="button"
            onClick={onBack}
            disabled={sending}
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
          🔒 Your photo is shared privately with the hosts
        </p>
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

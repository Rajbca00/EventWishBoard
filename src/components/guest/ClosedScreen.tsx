'use client';

import { motion } from 'motion/react';
import SceneBackground from '@/components/wall/SceneBackground';
import BrandMark from '@/components/ui/BrandMark';
import { BRAND } from '@/lib/env';
import type { Theme } from '@/lib/themes';
import type { GuestPayload } from '@/lib/types';

interface Props {
  theme: Theme;
  event: GuestPayload['event'];
  reason: 'closed' | 'full';
}

/**
 * Shown once the event expires or fills up. The closed state keeps the screen
 * as a calm thank-you and avoids showing the collected wishes again.
 */
export default function ClosedScreen({ theme, event, reason }: Props) {

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <SceneBackground theme={theme} intensity="ambient" seed={`closed:${event.id}`} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <p className="text-[0.7rem] uppercase tracking-[0.3em] text-[var(--ink-soft)]">
            {event.hosts || event.name}
          </p>

          <h1 className="font-display type-title mt-4 text-balance text-[var(--ink)]">
            {reason === 'full'
              ? 'This Wish Wall is full of love 💕'
              : 'This Wish Wall has closed 💕'}
          </h1>

          <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">
            {reason === 'full'
              ? 'Every space on the wall has been filled. Thank you to everyone who wrote in.'
              : 'Thank you to everyone who left a little love. The messages are safely with the hosts.'}
          </p>

        </motion.div>
      </div>

      <footer className="relative z-10 flex flex-col items-center gap-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <a
          href={BRAND.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="glass rounded-full px-5 py-2.5 text-[0.85rem] text-[var(--ink)]"
        >
          Plan your celebration with Laya &amp; Bee
        </a>
        <BrandMark tone="quiet" />
      </footer>
    </div>
  );
}

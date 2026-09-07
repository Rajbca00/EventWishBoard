'use client';

import Image from 'next/image';
import Button from '@/components/ui/Button';
import Reveal from '@/components/ui/Reveal';
import { PoweredBy } from '@/components/ui/BrandMark';
import SceneBackground from '@/components/wall/SceneBackground';
import { formatDate } from '@/lib/utils';
import type { Theme } from '@/lib/themes';
import type { GuestPayload } from '@/lib/types';

interface Props {
  theme: Theme;
  event: GuestPayload['event'];
  wishCount: number;
  onStart: () => void;
}

/**
 * The first thing a guest sees after scanning the QR code on the dessert table.
 * The couple is the hero here — Laya & Bee stays a quiet line at the bottom.
 */
export default function WelcomeScreen({ theme, event, wishCount, onStart }: Props) {
  const headline = event.hosts || event.name;

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <SceneBackground theme={theme} intensity="full" seed={`welcome:${event.id}`} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        {event.logoUrl && (
          <Reveal className="relative mb-7 size-24 overflow-hidden rounded-full ring-2 ring-white/70 shadow-[0_18px_36px_-20px_rgb(74_44_51/0.6)]">
            <Image src={event.logoUrl} alt="" fill sizes="96px" className="object-cover" unoptimized />
          </Reveal>
        )}

        <Reveal
          as="p"
          delay={0.05}
          className="mb-4 text-[0.7rem] uppercase tracking-[0.32em] text-[var(--ink-soft)]"
        >
          {theme.emoji} Leave a little love
        </Reveal>

        <Reveal
          as="h1"
          delay={0.15}
          className="font-display text-[2.35rem] leading-[1.1] tracking-tight text-balance text-[var(--ink)] sm:text-6xl"
        >
          Add your wishes for
          <span className="mt-2 block shimmer-text">{headline}</span>
        </Reveal>

        {event.eventDate && (
          <Reveal
            as="p"
            delay={0.24}
            className="mt-4 text-sm uppercase tracking-[0.18em] text-[var(--ink-soft)]"
          >
            {formatDate(event.eventDate)}
          </Reveal>
        )}

        <Reveal
          as="p"
          delay={0.32}
          className="text-balance-pretty mt-6 max-w-sm text-[0.98rem] leading-relaxed text-[var(--ink-soft)]"
        >
          {event.welcomeMessage || 'Your message will become part of their digital Wish Wall.'}
        </Reveal>

        <Reveal delay={0.44} className="mt-10 w-full max-w-xs">
          <div className="relative">
            {/* Soft pulse behind the CTA, so the eye lands here first */}
            <span
              className="absolute inset-0 -z-10 rounded-full opacity-45"
              style={{ background: 'var(--accent-soft)', animation: 'pulse-ring 2.8s ease-out infinite' }}
              aria-hidden
            />
            <Button size="lg" fullWidth onClick={onStart}>
              ✨ Add Your Wish
            </Button>
          </div>

          {wishCount > 0 && (
            <p className="mt-4 text-[0.8rem] text-[var(--ink-soft)]">
              {wishCount === 1 ? '1 wish is' : `${wishCount} wishes are`} already on the wall
            </p>
          )}
          <p className="mt-1 text-[0.75rem] text-[var(--ink-soft)]/80">Takes about 30 seconds</p>
        </Reveal>
      </div>

      <Reveal as="footer" delay={0.6} className="relative z-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <PoweredBy />
      </Reveal>
    </div>
  );
}

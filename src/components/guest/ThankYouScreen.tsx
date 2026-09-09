'use client';

import Reveal from '@/components/ui/Reveal';
import SceneBackground from '@/components/wall/SceneBackground';
import BrandMark, { BrandGlyph } from '@/components/ui/BrandMark';
import { BRAND } from '@/lib/env';
import type { Theme } from '@/lib/themes';
import type { GuestPayload } from '@/lib/types';

interface Props {
  theme: Theme;
  event: GuestPayload['event'];
  pending: boolean;
  onViewWall: () => void;
}

interface LinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  tone?: 'accent' | 'plain';
}

function PromoLink({ href, icon, label, tone = 'plain' }: LinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        'flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-full px-4 py-3',
        'text-[0.86rem] font-medium transition-transform duration-200 active:scale-[0.97]',
        tone === 'accent'
          ? 'text-white shadow-[0_16px_32px_-18px_var(--accent-2)]'
          : 'glass text-[var(--ink)]',
      ].join(' ')}
      style={
        tone === 'accent'
          ? { background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }
          : undefined
      }
    >
      {icon}
      {label}
    </a>
  );
}

/**
 * The one moment Laya & Bee steps forward — after the guest has finished,
 * never before. Framed as a thank-you, not an advert.
 */
export default function ThankYouScreen({ theme, event, pending, onViewWall }: Props) {
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <SceneBackground theme={theme} intensity="full" seed={`thanks:${event.id}`} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <Reveal
          className="mb-6 flex size-20 items-center justify-center rounded-full"
          style={{ background: 'var(--accent-soft)' }}
        >
          <span className="text-4xl" aria-hidden>
            💌
          </span>
        </Reveal>

        <Reveal
          as="h1"
          delay={0.08}
          className="font-display type-hero text-[var(--ink)]"
        >
          Thank You!
        </Reveal>

        <Reveal
          as="p"
          delay={0.16}
          className="type-body mt-3 max-w-xs text-balance-pretty text-[var(--ink-soft)]"
        >
          {pending
            ? 'Your wish has been sent to the hosts and will appear on the wall shortly.'
            : `For being a part of ${event.hosts || event.name}'s special celebration.`}
        </Reveal>

        {event.settings.wallEnabled && (
          <Reveal
            as="button"
            delay={0.24}
            type="button"
            onClick={onViewWall}
            className="mt-5 text-[0.88rem] font-medium text-[var(--accent-2)] underline underline-offset-4"
          >
            See the Wish Wall again
          </Reveal>
        )}

        {/* --------------------------------------------------- brand moment */}
        <Reveal
          as="section"
          delay={0.36}
          className="glass mt-12 w-full max-w-sm rounded-[1.75rem] p-6"
        >
          <BrandGlyph size={30} className="mx-auto text-[var(--accent)]" />
          <p className="mt-3 font-display text-[1.28rem] leading-snug text-[var(--ink)]">
            Loved this experience? 💕
          </p>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
            {BRAND.tagline}
          </p>

          <div className="mt-6 space-y-2.5">
            {event.settings.showInstagram && (
              <PromoLink
                href={BRAND.instagram}
                tone="accent"
                label="Follow Laya & Bee on Instagram"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
                  </svg>
                }
              />
            )}

            {event.settings.showReview && (
              <PromoLink
                href={BRAND.review}
                label="Leave a Google Review"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="m12 2.6 2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.6 6.1 20.8l1.3-6.6L2.5 9.6l6.6-.8L12 2.6Z"
                      fill="var(--gold)"
                    />
                  </svg>
                }
              />
            )}

            <PromoLink
              href={BRAND.enquiry}
              label="Plan your celebration with us"
              icon={
                <span className="text-base" aria-hidden>
                  🎂
                </span>
              }
            />
          </div>
        </Reveal>
      </div>

      <Reveal
        as="footer"
        delay={0.5}
        className="relative z-10 flex flex-col items-center gap-1.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]"
      >
        <p className="text-[0.72rem] tracking-[0.2em] uppercase text-[var(--ink-soft)]/70">
          Made for celebrations by
        </p>
        <BrandMark tone="full" size="md" />
      </Reveal>
    </div>
  );
}

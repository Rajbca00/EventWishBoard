import Link from 'next/link';
import type { Metadata } from 'next';
import SceneBackground from '@/components/wall/SceneBackground';
import { BrandGlyph, BrandWordmark } from '@/components/ui/BrandMark';
import { resolveTheme, themeStyle } from '@/lib/themes';
import DemoBanner from '@/components/DemoBanner';
import { listEvents } from '@/lib/data/events';

export const metadata: Metadata = {
  title: 'Laya & Bee Wish Wall',
  description: 'Same celebrations. More sweet memories.',
};

export const dynamic = 'force-dynamic';

const FEATURES = [
  ['💌', 'Collect Wishes', 'Guests scan a QR code and leave a message in about 30 seconds.'],
  ['✨', 'Stickers, GIFs & Memes', 'A playful, organiser-managed library for every celebration.'],
  ['📸', 'Optional Selfies', 'Private guest photos, collected straight into your Memories gallery.'],
  ['🎉', 'Animated Wish Wall', 'Every wish flies in and settles onto a dreamy 3D celebration wall.'],
];

export default async function HomePage() {
  const theme = resolveTheme('wedding');
  const events = await listEvents().catch(() => []);
  const live = events.filter((event) => event.status === 'open').slice(0, 4);

  return (
    <div style={themeStyle(theme)} className="relative isolate min-h-[100dvh] overflow-hidden">
      <SceneBackground theme={theme} intensity="full" seed="landing" />

      {/* The chocolate drip from the packaging, along the top edge */}
      <div className="choc-drip pointer-events-none absolute inset-x-0 top-0 z-20 h-[4.5rem] sm:h-24" aria-hidden />

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
        <BrandWordmark size="lg" />

        <h1 className="mt-8 font-display text-[2.8rem] leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl">
          Wish Wall
          <span className="mt-2 block shimmer-text text-[2rem] sm:text-4xl">
            Sweet memories for every celebration
          </span>
        </h1>

        <p className="mt-6 max-w-lg text-balance-pretty text-[1rem] leading-relaxed text-[var(--ink-soft)]">
          A beautiful, interactive wish collection experience for weddings, birthdays and special
          events. Delight your guests, collect their wishes, and create lasting memories.
        </p>
        <p className="mt-3 text-[0.72rem] uppercase tracking-[0.3em] text-[var(--ink-soft)]/70">
          Good treats · Brighter people
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex h-13 min-h-[3.25rem] items-center rounded-full px-8 text-[0.95rem] font-medium text-white shadow-[0_16px_32px_-18px_var(--accent-2)] transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}
          >
            Organiser Dashboard
          </Link>
          {live[0] && (
            <Link
              href={`/event/${live[0].id}`}
              className="glass inline-flex h-13 min-h-[3.25rem] items-center rounded-full px-8 text-[0.95rem] font-medium text-[var(--ink)]"
            >
              See a live Wish Wall
            </Link>
          )}
        </div>

        <section className="mt-16 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([emoji, title, detail]) => (
            <div key={title} className="glass rounded-[1.4rem] p-5 text-left">
              <span className="text-2xl" aria-hidden>
                {emoji}
              </span>
              <h2 className="mt-3 font-display text-[1.05rem] text-[var(--ink)]">{title}</h2>
              <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[var(--ink-soft)]">{detail}</p>
            </div>
          ))}
        </section>

        {live.length > 0 && (
          <section className="mt-14 w-full">
            <h2 className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-soft)]">
              Live celebrations
            </h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              {live.map((event) => (
                <Link
                  key={event.id}
                  href={`/event/${event.id}`}
                  className="glass rounded-full px-5 py-2.5 text-[0.88rem] text-[var(--ink)] transition-transform active:scale-[0.97]"
                >
                  {event.hosts || event.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-5 pb-10">
        <DemoBanner className="mx-6" />
        <p className="flex items-center justify-center gap-2 text-[0.72rem] uppercase tracking-[0.2em] text-[var(--ink-soft)]/70">
          <BrandGlyph size={13} className="opacity-60" />
          More than desserts. Memories for life.
        </p>
      </footer>
    </div>
  );
}

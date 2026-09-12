import Image from 'next/image';
import BrandMark, { BrandGlyph } from '@/components/ui/BrandMark';
import PrintButton from './PrintButton';
import { resolveTheme, themeStyle } from '@/lib/themes';
import { formatDate } from '@/lib/utils';
import { BRAND } from '@/lib/env';
import type { MemoryBook } from '@/lib/data/book';

function isEmoji(value: string | null): value is string {
  return Boolean(value && !value.startsWith('/') && !value.startsWith('http'));
}

/**
 * The keepsake.
 *
 * Deliberately calm and typographic rather than a second Wish Wall: this is
 * something the couple reads slowly, weeks later, and prints. It is a server
 * component with no animation, so it renders identically on a phone, a laptop
 * and a sheet of A4.
 */
export default function MemoryBookView({ book }: { book: MemoryBook }) {
  const { event, wishes, counts } = book;
  const theme = resolveTheme(event.themeId);
  const hosts = event.hosts || event.name;

  return (
    <div style={themeStyle(theme)} className="book min-h-dvh bg-[var(--bg-1)]">
      {/* ------------------------------------------------------------ cover */}
      <header className="relative overflow-hidden px-6 pb-14 pt-16 text-center sm:pt-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(120% 80% at 20% 0%, var(--wall-1) 0%, transparent 55%),
                         radial-gradient(110% 70% at 85% 5%, var(--wall-2) 0%, transparent 50%)`,
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-2xl">
          <p className="text-[0.7rem] uppercase tracking-[0.34em] text-[var(--ink-soft)]">
            {theme.emoji} A book of wishes for
          </p>

          <h1 className="mt-5 font-display text-[2.6rem] leading-[1.06] tracking-tight text-balance text-[var(--ink)] sm:text-6xl">
            {hosts}
          </h1>

          {event.eventDate && (
            <p className="mt-5 text-[0.82rem] uppercase tracking-[0.22em] text-[var(--ink-soft)]">
              {formatDate(event.eventDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          <div
            className="mx-auto mt-8 h-px w-24 opacity-70"
            style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }}
            aria-hidden
          />

          <dl className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <Stat value={counts.wishes} label={counts.wishes === 1 ? 'wish' : 'wishes'} />
            {counts.named > 0 && <Stat value={counts.named} label="well-wishers" />}
            {counts.photos > 0 && (
              <Stat value={counts.photos} label={counts.photos === 1 ? 'photo' : 'photos'} />
            )}
          </dl>

          <div className="mt-10 print:hidden">
            <PrintButton />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ wishes */}
      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        {wishes.length === 0 ? (
          <p className="py-20 text-center text-[0.95rem] text-[var(--ink-soft)]">
            No wishes have been collected yet.
          </p>
        ) : (
          <ol className="space-y-5">
            {wishes.map((wish, index) => (
              <li
                key={wish.id}
                className="book-entry rounded-[1.5rem] border border-[var(--card-line)] bg-[var(--card)] p-6 shadow-[0_16px_40px_-32px_rgb(74_44_51/0.55)] sm:p-8"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  {wish.selfieUrl && (
                    <div className="relative mx-auto h-40 w-32 shrink-0 overflow-hidden rounded-2xl ring-1 ring-[var(--card-line)] sm:mx-0">
                      {/* Signed storage URL — a plain img keeps it out of the optimiser. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={wish.selfieUrl}
                        alt={wish.name ? `Photo from ${wish.name}` : 'Guest photo'}
                        className="size-full object-cover"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[1.2rem] leading-relaxed text-balance-pretty text-[var(--ink)] sm:text-[1.35rem]">
                      {wish.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <p className="font-display text-[0.95rem] italic text-[var(--ink-soft)]">
                        — {wish.name ?? 'Anonymous'}
                      </p>

                      {wish.stickers.filter(isEmoji).map((value) => (
                        <span key={value} className="text-lg" aria-hidden>
                          {value}
                        </span>
                      ))}

                      {wish.media.map((src) => (
                        <span key={src} className="relative inline-block size-8">
                          <Image src={src} alt="" fill sizes="32px" className="object-contain" unoptimized />
                        </span>
                      ))}

                      {wish.featured && (
                        <span
                          className="rounded-full px-2.5 py-1 text-[0.68rem] uppercase tracking-wider"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}
                        >
                          A favourite
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className="hidden shrink-0 font-display text-[0.8rem] text-[var(--ink-soft)]/50 sm:block"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>

      {/* ------------------------------------------------------------ colophon */}
      <footer className="border-t border-[var(--card-line)] px-6 py-12 text-center">
        <BrandGlyph size={26} className="mx-auto text-[var(--accent)]" />
        <p className="mt-3 font-display text-[1.15rem] text-[var(--ink)]">
          Every wish, kept in one place.
        </p>
        <p className="mt-1.5 text-[0.85rem] text-[var(--ink-soft)]">{BRAND.tagline}</p>

        <div className="mt-6 flex flex-col items-center gap-2">
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.85rem] font-medium text-[var(--accent-2)] underline underline-offset-4 print:hidden"
          >
            Plan your celebration with Laya &amp; Bee
          </a>
          <BrandMark tone="quiet" />
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  // Column-reverse shows the number above its label while keeping the term
  // before its description in the DOM, so it is announced once, in order.
  return (
    <div className="flex flex-col-reverse">
      <dt className="mt-1.5 text-[0.72rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
        {label}
      </dt>
      <dd className="font-display text-[1.9rem] leading-none text-[var(--ink)]">{value}</dd>
    </div>
  );
}

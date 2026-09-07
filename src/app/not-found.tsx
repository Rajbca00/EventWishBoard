import Link from 'next/link';
import SceneBackground from '@/components/wall/SceneBackground';
import BrandMark from '@/components/ui/BrandMark';
import { resolveTheme, themeStyle } from '@/lib/themes';

export default function NotFound() {
  const theme = resolveTheme('wedding');

  return (
    <div
      style={themeStyle(theme)}
      className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <SceneBackground theme={theme} intensity="ambient" seed="not-found" />

      <div className="relative z-10">
        <p className="text-5xl" aria-hidden>
          💌
        </p>
        <h1 className="mt-6 font-display text-[2rem] leading-tight text-[var(--ink)]">
          We couldn&apos;t find that Wish Wall
        </h1>
        <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">
          The link may have changed, or the celebration may have ended. Try scanning the QR code on
          the dessert table again.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center rounded-full px-7 text-[0.92rem] font-medium text-white"
          style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}
        >
          Back to the start
        </Link>
      </div>

      <footer className="relative z-10 mt-16">
        <BrandMark />
      </footer>
    </div>
  );
}

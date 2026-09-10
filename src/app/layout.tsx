import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/*
 * Both faces load as variable fonts — omitting `weight` is what tells
 * next/font to fetch the variable file rather than a set of static instances.
 *
 * It is one smaller download instead of four or five, and weights interpolate
 * along the real `wght` axis, so a semibold heading is the typeface's own
 * semibold rather than the nearest static cut. That is most visible at the
 * large sizes the venue wall and hero headings use.
 */
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true,
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: 'Laya & Bee Wish Wall',
    template: '%s · Laya & Bee',
  },
  description:
    'A beautiful, interactive wish collection experience for weddings, birthdays and special events. Powered by Laya & Bee.',
  applicationName: 'Laya & Bee Wish Wall',
  openGraph: {
    title: 'Laya & Bee Wish Wall',
    description: 'Leave a little love — your message becomes part of their celebration.',
    type: 'website',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The guest page is a full-bleed 3D scene; zooming stays available but the
  // page should fill the notch area on phones.
  viewportFit: 'cover',
  themeColor: '#fff7f3',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables live on <html> so Tailwind's :root theme layer, which
    // references them via --font-display / --font-body, can resolve them.
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      {/* No `antialiased` class here on purpose: it forces grayscale smoothing on
          every display. globals.css applies that only on high-DPI screens, where
          it actually helps. */}
      <body>{children}</body>
    </html>
  );
}

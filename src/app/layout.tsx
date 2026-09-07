import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
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
      <body className="antialiased">{children}</body>
    </html>
  );
}

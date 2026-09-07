import type { NextConfig } from 'next';

/** Supabase Storage is the only remote image host we serve from. */
function supabaseHost(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

const host = supabaseHost();

const nextConfig: NextConfig = {
  experimental: {
    // Organisers upload stickers, GIFs and memes as base64 through Server
    // Actions; the 1MB default rejects anything but the smallest sticker.
    serverActions: { bodySizeLimit: '6mb' },
  },
  images: {
    remotePatterns: host
      ? [{ protocol: 'https', hostname: host, pathname: '/storage/v1/object/**' }]
      : [],
    // Guest assets are already small and often animated, so we serve them as-is.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;

/**
 * Environment access with friendly failure.
 *
 * A brand-new clone has no Supabase credentials yet, and we would rather show a
 * "finish your setup" screen than crash the whole app, so reads are lenient and
 * `isSupabaseConfigured()` gates the data layer.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/**
 * Browser-safe key. Row Level Security governs everything it can reach.
 *
 * Supabase replaced `anon` (a long `eyJ…` JWT) with `sb_publishable_…`; the
 * legacy name is still accepted here because existing projects still issue it,
 * but Supabase retires it at the end of 2026. Both names are spelled out in
 * full so Next.js can inline them at build time.
 */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/**
 * Server-only. Bypasses Row Level Security entirely — never import this into a
 * client component. Formerly `service_role`, now `sb_secret_…`.
 */
export const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Salts the IP hashes used for rate limiting so they are not reversible. */
export const IP_SALT = process.env.IP_HASH_SALT ?? 'laya-bee-wish-wall';

/**
 * Copying .env.example without editing it is an easy step to miss, and the
 * resulting failure is opaque: the placeholder hostname does not resolve, so
 * every page dies with "fetch failed". Treat untouched placeholders as "not
 * configured" so the app stays in demo mode and says so.
 */
function isPlaceholder(value: string): boolean {
  if (!value.trim()) return true;
  return /YOUR[-_]PROJECT|xxxxxxxx|your-anon-key|your-service-role-key|change-me/i.test(value);
}

export function isSupabaseConfigured(): boolean {
  return !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_PUBLISHABLE_KEY);
}

/**
 * With no Supabase credentials the app runs against an in-memory demo store so
 * a fresh clone is explorable immediately. Data resets on every restart.
 */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export function assertSecretKey(): string {
  if (isPlaceholder(SUPABASE_SECRET_KEY)) {
    throw new Error(
      'SUPABASE_SECRET_KEY is missing. Copy the secret key from ' +
        'Supabase → Settings → API Keys into .env.local.',
    );
  }
  return SUPABASE_SECRET_KEY;
}

/** Absolute origin, used when building QR codes and share links. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const BRAND = {
  name: 'Laya & Bee',
  tagline: 'Beautiful desserts and experiences made for celebrations.',
  instagram: 'https://www.instagram.com/layanbee_cakes/',
  review: 'https://www.google.com/search?q=laya+and+bee',
  enquiry: 'https://www.instagram.com/layanbee_cakes/',
} as const;

export const LIMITS = {
  wishChars: 300,
  nameChars: 40,
  /** Decoded bytes. The browser compresses selfies well below this. */
  selfieBytes: 3 * 1024 * 1024,
  assetBytes: 5 * 1024 * 1024,
  wishWindowMs: 60_000,
  wishPerWindow: 3,
  wishPerEventPerIp: 8,
} as const;

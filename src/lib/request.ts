import 'server-only';
import { createHash } from 'node:crypto';
import { IP_SALT } from './env';

/** Best-effort client IP behind Vercel's proxy. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Salted, truncated hash. Enough to rate limit a phone at a wedding,
 * useless as a way to identify anyone afterwards.
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 32);
}

export function ipHashFrom(headers: Headers): string {
  return hashIp(getClientIp(headers));
}

/** Consistent JSON error shape for every API route. */
export function jsonError(message: string, status = 400, details?: unknown) {
  return Response.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function jsonOk<T>(payload: T, status = 200) {
  return Response.json(payload as object, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

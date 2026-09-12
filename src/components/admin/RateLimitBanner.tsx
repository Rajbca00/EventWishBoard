import { isRateLimitDisabled } from '@/lib/env';

/**
 * Shown on every dashboard page while DISABLE_WISH_RATE_LIMIT is on, because
 * the one way this flag does harm is being forgotten before a real event.
 */
export default function RateLimitBanner() {
  if (!isRateLimitDisabled()) return null;

  return (
    <div
      role="status"
      className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-[0.84rem] leading-relaxed text-amber-900"
    >
      <strong className="font-semibold">Wish rate limiting is off.</strong> Guests can send unlimited
      wishes from one phone or network while <code className="font-mono">DISABLE_WISH_RATE_LIMIT</code>{' '}
      is set. That is for testing only — remove it and redeploy before the event.
    </div>
  );
}

import { isDemoMode } from '@/lib/env';

/**
 * Only ever visible before Supabase is connected. Deliberately quiet, and never
 * shown on the guest pages so a walkthrough still looks like the real thing.
 */
export default function DemoBanner({ className }: { className?: string }) {
  if (!isDemoMode()) return null;

  return (
    <div
      className={`glass mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full px-5 py-2.5 text-center text-[0.78rem] text-[var(--ink-soft)] ${className ?? ''}`}
    >
      <span className="font-medium text-[var(--ink)]">Demo mode</span>
      <span aria-hidden>·</span>
      <span>Sample data, resets when the server restarts</span>
      <span aria-hidden>·</span>
      <span>
        Paste your real Supabase values into{' '}
        <code className="rounded bg-white/70 px-1 py-0.5">.env.local</code> and restart to go live
      </span>
    </div>
  );
}

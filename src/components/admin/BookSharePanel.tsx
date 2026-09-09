'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Link2, RotateCcw, ExternalLink } from 'lucide-react';
import { createBookLinkAction, revokeBookLinkAction } from '@/app/admin/actions';

interface Props {
  eventId: string;
  origin: string;
  initialToken: string | null;
  photoCount: number;
}

/**
 * The couple's share link.
 *
 * Deliberately explicit about what the link exposes: it contains every photo,
 * including the ones guests marked private to the hosts, so the organiser
 * should know what they are forwarding before they forward it.
 */
export default function BookSharePanel({ eventId, origin, initialToken, photoCount }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = token ? `${origin}/book/${token}` : null;

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createBookLinkAction(eventId);
      if (!result.ok) setError(result.error ?? 'Could not create the link');
      else {
        setToken((result.data as { token: string }).token);
        router.refresh();
      }
    });
  };

  const revoke = () => {
    if (
      !window.confirm(
        'Revoke this link? Anyone the couple already shared it with will lose access. You can create a new one afterwards.',
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await revokeBookLinkAction(eventId);
      if (!result.ok) setError(result.error ?? 'Could not revoke the link');
      else {
        setToken(null);
        router.refresh();
      }
    });
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — select the link and copy it manually.');
    }
  };

  return (
    <div className="p-5">
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      {!token ? (
        <>
          <p className="text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
            Create a private link the couple can open and forward to family. It is unlisted and
            kept out of search engines, and you can revoke it at any time.
          </p>
          <button
            type="button"
            onClick={create}
            disabled={pending}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
          >
            <Link2 className="size-4" />
            {pending ? 'Creating…' : 'Create share link'}
          </button>
        </>
      ) : (
        <>
          <p className="mb-2 text-[0.8rem] font-medium text-[var(--ink)]">Share link</p>
          <p className="break-all rounded-xl border border-[var(--card-line)] bg-cocoa-50 px-3.5 py-3 font-mono text-[0.78rem] text-[var(--ink)]">
            {url}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)]"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--card-line)] px-5 text-[0.85rem] font-medium text-[var(--ink)] transition-colors hover:bg-cocoa-50"
            >
              <ExternalLink className="size-4" />
              Open
            </a>
            <button
              type="button"
              onClick={revoke}
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--card-line)] px-5 text-[0.85rem] font-medium text-[var(--ink-soft)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            >
              <RotateCcw className="size-4" />
              Revoke
            </button>
          </div>

          {photoCount > 0 && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.82rem] leading-relaxed text-amber-900">
              This book includes all {photoCount} guest {photoCount === 1 ? 'photo' : 'photos'} —
              including those guests asked to keep to the hosts. It is the couple&apos;s private
              copy, so share the link with them rather than posting it publicly.
            </p>
          )}
        </>
      )}
    </div>
  );
}

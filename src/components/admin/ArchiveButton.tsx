'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { Download } from 'lucide-react';

interface ArchiveEntry {
  filename: string;
  url: string;
}

interface Manifest {
  folder: string;
  html: string;
  csv: string;
  json: string;
  readme: string;
  images: ArchiveEntry[];
  counts: { wishes: number; photos: number; named: number };
}

type Phase = 'idle' | 'preparing' | 'downloading' | 'zipping' | 'done';

/**
 * Builds the archive in the browser.
 *
 * The zip is assembled client-side rather than on the server because a real
 * event's photos run to a hundred megabytes or more — far past what a
 * serverless response may carry. The server sends a manifest with a signed URL
 * per photo; this fetches them, writes the zip, and hands it over.
 */
export default function ArchiveButton({ eventId }: { eventId: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(0);

  const busy = phase !== 'idle' && phase !== 'done';

  const run = async () => {
    setError(null);
    setSkipped(0);
    setDone(0);
    setPhase('preparing');

    try {
      const response = await fetch(`/api/admin/events/${eventId}/archive`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not prepare the archive');
      const manifest = (await response.json()) as Manifest;

      const zip = new JSZip();
      const root = zip.folder(manifest.folder)!;
      root.file('index.html', manifest.html);
      root.file('wishes.csv', manifest.csv);
      root.file('wishes.json', manifest.json);
      root.file('README.txt', manifest.readme);

      setTotal(manifest.images.length);
      setPhase(manifest.images.length ? 'downloading' : 'zipping');

      // Sequential rather than parallel: a hundred simultaneous image requests
      // is how you get rate-limited mid-export.
      let missed = 0;
      for (const image of manifest.images) {
        try {
          const res = await fetch(image.url);
          if (!res.ok) throw new Error(String(res.status));
          root.file(image.filename, await res.blob());
        } catch {
          // One unreadable photo should not cost the organiser the whole export.
          missed += 1;
        }
        setDone((n) => n + 1);
      }
      setSkipped(missed);

      setPhase('zipping');
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${manifest.folder}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setPhase('done');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The archive could not be built');
      setPhase('idle');
    }
  };

  const label =
    phase === 'preparing'
      ? 'Preparing…'
      : phase === 'downloading'
        ? `Collecting photos ${done}/${total}`
        : phase === 'zipping'
          ? 'Building the zip…'
          : phase === 'done'
            ? 'Download again'
            : 'Download everything (.zip)';

  return (
    <div className="p-5">
      <p className="mb-4 text-[0.88rem] leading-relaxed text-[var(--ink-soft)]">
        One zip containing a readable <code>index.html</code> that works offline, every guest photo
        at full resolution, and the wishes as CSV and JSON.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
      >
        <Download className="size-4" />
        {label}
      </button>

      {phase === 'downloading' && total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cocoa-100">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      )}

      {phase === 'done' && (
        <p className="mt-3 text-[0.84rem] text-emerald-700">
          Archive downloaded.
          {skipped > 0 && ` ${skipped} photo${skipped === 1 ? '' : 's'} could not be read and were skipped.`}
        </p>
      )}

      {error && (
        <p className="mt-3 text-[0.84rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <p className="mt-4 text-[0.78rem] leading-relaxed text-[var(--ink-soft)]">
        The zip includes photos guests asked to keep private to the hosts, so it is the couple&apos;s
        own copy rather than something to post publicly.
      </p>
    </div>
  );
}

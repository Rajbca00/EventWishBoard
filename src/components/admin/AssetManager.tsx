'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { createAssetAction, deleteAssetAction, updateAssetAction } from '@/app/admin/actions';
import { compressImage } from '@/lib/image-client';
import { cn } from '@/lib/utils';
import type { AdminAsset, AssetType } from '@/lib/types';

interface Props {
  eventId: string;
  assets: AdminAsset[];
}

const TABS: { id: AssetType; label: string; hint: string }[] = [
  { id: 'sticker', label: 'Stickers', hint: 'Emoji or small images guests can add to a wish' },
  { id: 'gif', label: 'GIFs', hint: 'Animated GIFs — upload the real thing here' },
  { id: 'meme', label: 'Memes', hint: 'Inside jokes and event-specific images' },
];

const EMOJI_CHOICES = [
  '❤️', '💕', '🎉', '🥂', '💍', '✨', '🥰', '🎂', '💐', '🌟', '🧁', '🎀',
  '🕊️', '🌸', '🍾', '💫', '🤍', '🥳',
];

export default function AssetManager({ eventId, assets }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<AssetType>('sticker');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = assets.filter((asset) => asset.type === tab);
  const activeTab = TABS.find((entry) => entry.id === tab)!;

  const run = (id: string | null, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const result = await action();
      setBusyId(null);
      if (!result.ok) setError(result.error ?? 'That change did not save');
      else router.refresh();
    });
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    try {
      // Animated GIFs must be sent untouched — re-encoding through a canvas
      // would flatten them to a single frame.
      const dataUrl =
        file.type === 'image/gif'
          ? await readAsDataUrl(file)
          : await compressImage(file, { maxEdge: 512, quality: 0.88, mimeType: 'image/webp' });

      run(null, () =>
        createAssetAction(eventId, { type: tab, file: dataUrl, name: file.name.slice(0, 60) }),
      );
    } catch {
      setError('That file could not be read');
    }
  };

  const addEmoji = (emoji: string) =>
    run(null, () => createAssetAction(eventId, { type: 'sticker', emoji, name: emoji }));

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--card-line)] px-5 py-3">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[0.8rem] font-medium transition-colors',
              tab === entry.id
                ? 'bg-[var(--accent-2)] text-white'
                : 'text-[var(--ink-soft)] hover:bg-cocoa-50 hover:text-[var(--ink)]',
            )}
          >
            {entry.label}
            <span className="ml-1.5 opacity-70">
              {assets.filter((asset) => asset.type === entry.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="p-5">
        <p className="mb-4 text-[0.84rem] text-[var(--ink-soft)]">{activeTab.hint}</p>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[0.84rem] text-red-700" role="alert">
            {error}
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={tab === 'gif' ? 'image/gif,image/*' : 'image/*'}
          className="hidden"
          onChange={upload}
        />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent-2)] px-5 text-[0.85rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
          >
            <Upload className="size-4" />
            Upload {activeTab.label.toLowerCase().replace(/s$/, '')}
          </button>
        </div>

        {tab === 'sticker' && (
          <div className="mb-6 rounded-xl border border-[var(--card-line)] p-4">
            <p className="mb-2.5 text-[0.8rem] font-medium text-[var(--ink)]">Or add an emoji</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={pending}
                  onClick={() => addEmoji(emoji)}
                  className="flex size-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-cocoa-50 disabled:opacity-50"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {active.length === 0 ? (
          <p className="py-10 text-center text-[0.88rem] text-[var(--ink-soft)]">
            Nothing here yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {active.map((asset) => (
              <li
                key={asset.id}
                className={cn(
                  'relative rounded-xl border border-[var(--card-line)] p-3 transition-opacity',
                  !asset.enabled && 'opacity-45',
                  busyId === asset.id && pending && 'opacity-40',
                )}
              >
                <div className="mb-2.5 flex h-20 items-center justify-center">
                  {asset.emoji ? (
                    <span className="text-4xl">{asset.emoji}</span>
                  ) : (
                    asset.url && (
                      <span className="relative size-full">
                        <Image
                          src={asset.url}
                          alt={asset.name}
                          fill
                          sizes="120px"
                          className="object-contain"
                          unoptimized
                        />
                      </span>
                    )
                  )}
                </div>

                <p className="truncate text-[0.76rem] text-[var(--ink-soft)]" title={asset.name}>
                  {asset.name || 'Untitled'}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[0.74rem] text-[var(--ink-soft)]">
                    <input
                      type="checkbox"
                      checked={asset.enabled}
                      disabled={pending}
                      onChange={() =>
                        run(asset.id, () =>
                          updateAssetAction(eventId, asset.id, { enabled: !asset.enabled }),
                        )
                      }
                      className="size-3.5 accent-[var(--accent)]"
                    />
                    {asset.enabled ? 'Shown' : 'Hidden'}
                  </label>

                  {asset.global ? (
                    <span className="text-[0.68rem] uppercase tracking-wide text-[var(--ink-soft)]/70">
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete ${asset.name || 'asset'}`}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm('Delete this asset?')) return;
                        run(asset.id, () => deleteAssetAction(eventId, asset.id));
                      }}
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--ink-soft)] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-5 text-[0.76rem] text-[var(--ink-soft)]">
          Items marked <strong>Default</strong> come from the shared Laya &amp; Bee library. They can
          be hidden for this event but not deleted.
        </p>
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

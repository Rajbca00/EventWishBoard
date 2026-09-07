'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import Button from '@/components/ui/Button';
import StepShell from './StepShell';
import { sparkleAt } from '@/lib/confetti';
import { cn } from '@/lib/utils';
import type { Theme } from '@/lib/themes';
import type { AssetLibrary, GuestAsset } from '@/lib/types';

interface Props {
  theme: Theme;
  assets: AssetLibrary;
  message: string;
  charLimit: number;
  sticker: string | null;
  gif: string | null;
  meme: string | null;
  onMessageChange: (value: string) => void;
  onStickerChange: (value: string | null) => void;
  onGifChange: (value: string | null) => void;
  onMemeChange: (value: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

type Tab = 'stickers' | 'gifs' | 'memes';

const PROMPTS = [
  'Wishing you a lifetime of happiness',
  'So happy for you both',
  "Here's to forever",
  'May every chapter be better than the last',
];

export default function ComposeStep({
  theme,
  assets,
  message,
  charLimit,
  sticker,
  gif,
  meme,
  onMessageChange,
  onStickerChange,
  onGifChange,
  onMemeChange,
  onContinue,
  onBack,
}: Props) {
  const tabs = useMemo(
    () =>
      (
        [
          { id: 'stickers' as const, label: 'Stickers', items: assets.stickers },
          { id: 'gifs' as const, label: 'GIFs', items: assets.gifs },
          { id: 'memes' as const, label: 'Memes', items: assets.memes },
        ] satisfies { id: Tab; label: string; items: GuestAsset[] }[]
      ).filter((tab) => tab.items.length > 0),
    [assets],
  );

  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? 'stickers');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = charLimit - message.length;
  const canContinue = message.trim().length > 0;
  const activeItems = tabs.find((entry) => entry.id === tab)?.items ?? [];

  const selectedFor = (type: Tab) => (type === 'stickers' ? sticker : type === 'gifs' ? gif : meme);

  const choose = (type: Tab, asset: GuestAsset, event: React.MouseEvent) => {
    const value = asset.emoji ?? asset.url;
    if (!value) return;
    const next = selectedFor(type) === value ? null : value;

    if (type === 'stickers') onStickerChange(next);
    if (type === 'gifs') onGifChange(next);
    if (type === 'memes') onMemeChange(next);

    if (next) sparkleAt(event.clientX, event.clientY, theme.confetti);
  };

  return (
    <StepShell
      theme={theme}
      step={2}
      totalSteps={4}
      onBack={onBack}
      title="Write something they'll remember 💕"
      seed="compose"
      footer={
        <Button size="lg" fullWidth onClick={onContinue} disabled={!canContinue}>
          Continue
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="glass relative rounded-[1.4rem] p-1">
          <textarea
            ref={textareaRef}
            value={message}
            maxLength={charLimit}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="Write your message here..."
            rows={5}
            enterKeyHint="done"
            className={cn(
              'w-full resize-none rounded-[1.2rem] bg-transparent px-4 py-4',
              'font-display text-[1.12rem] leading-relaxed text-[var(--ink)]',
              'placeholder:font-body placeholder:text-[0.98rem] placeholder:text-[var(--ink-soft)]/55',
              'focus:outline-none',
            )}
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-[0.72rem] text-[var(--ink-soft)]/70">
              {message.length}/{charLimit}
            </span>
            {remaining <= 40 && (
              <span
                className="text-[0.72rem] font-medium"
                style={{ color: remaining <= 0 ? 'var(--accent-2)' : 'var(--ink-soft)' }}
              >
                {remaining <= 0 ? 'Character limit reached' : `${remaining} left`}
              </span>
            )}
          </div>
        </div>

        {/* Gentle prompts for guests staring at a blank box */}
        {message.length === 0 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  onMessageChange(prompt);
                  textareaRef.current?.focus();
                }}
                className="glass shrink-0 rounded-full px-4 py-2 text-[0.8rem] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {tabs.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[0.82rem] font-medium tracking-wide text-[var(--ink-soft)]">
                Add some fun <span className="opacity-70">(optional)</span>
              </h2>
              {(sticker || gif || meme) && (
                <button
                  type="button"
                  onClick={() => {
                    onStickerChange(null);
                    onGifChange(null);
                    onMemeChange(null);
                  }}
                  className="text-[0.75rem] text-[var(--ink-soft)] underline underline-offset-2"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mb-3 flex gap-2" role="tablist">
              {tabs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === entry.id}
                  onClick={() => setTab(entry.id)}
                  className={cn(
                    'relative rounded-full px-4 py-2 text-[0.82rem] font-medium transition-colors duration-200',
                    tab === entry.id ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]',
                  )}
                >
                  {tab === entry.id && (
                    <motion.span
                      layoutId="asset-tab"
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {entry.label}
                  {selectedFor(entry.id) && (
                    <span
                      className="ml-1.5 inline-block size-1.5 rounded-full align-middle"
                      style={{ background: tab === entry.id ? 'white' : 'var(--accent)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div
              key={tab}
              className={cn(
                'reveal',
                  'no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2',
                  tab === 'stickers' && 'flex-wrap overflow-x-visible',
              )}
              style={{ animationDuration: '0.28s' }}
            >
                {activeItems.map((asset) => {
                  const value = asset.emoji ?? asset.url;
                  const selected = value !== null && selectedFor(tab) === value;

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={(event) => choose(tab, asset, event)}
                      aria-pressed={selected}
                      title={asset.name || undefined}
                      className={cn(
                        'glass relative flex shrink-0 items-center justify-center overflow-hidden',
                        'transition-all duration-200 active:scale-95',
                        tab === 'stickers' ? 'size-16 rounded-2xl text-3xl' : 'h-24 w-24 rounded-2xl',
                        selected && 'ring-2 ring-offset-2 ring-offset-transparent',
                      )}
                      style={
                        selected
                          ? ({ ['--tw-ring-color' as string]: 'var(--accent)' } as React.CSSProperties)
                          : undefined
                      }
                    >
                      {asset.emoji ? (
                        <span aria-hidden>{asset.emoji}</span>
                      ) : (
                        asset.url && (
                          <Image
                            src={asset.url}
                            alt={asset.name || ''}
                            fill
                            sizes="96px"
                            className="object-contain p-2"
                            unoptimized
                          />
                        )
                      )}
                      {selected && (
                        <span
                          className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full"
                          style={{ background: 'var(--accent)' }}
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="m5 12.5 4.5 4.5L19 7"
                              stroke="white"
                              strokeWidth="3.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </section>
        )}
      </div>
    </StepShell>
  );
}

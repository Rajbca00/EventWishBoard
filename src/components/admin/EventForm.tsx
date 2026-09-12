'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { THEME_LIST } from '@/lib/themes';
import { LIMITS } from '@/lib/env';
import { cn } from '@/lib/utils';
import { createEventAction, updateEventAction } from '@/app/admin/actions';
import type { CelebrationEvent, ThemeId } from '@/lib/types';

interface Props {
  /** Omit to create a new event. */
  event?: CelebrationEvent;
}

const inputClass =
  'h-11 w-full rounded-xl border border-[var(--card-line)] bg-white px-3.5 text-[0.92rem] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

export default function EventForm({ event }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: event?.name ?? '',
    hosts: event?.hosts ?? '',
    eventDate: event?.eventDate ?? '',
    expiryDate: event?.expiryDate ? event.expiryDate.slice(0, 10) : '',
    description: event?.description ?? '',
    welcomeMessage: event?.welcomeMessage ?? '',
    theme: (event?.themeId ?? 'wedding') as ThemeId,
  });

  const [settings, setSettings] = useState({
    selfieEnabled: event?.settings.selfieEnabled ?? true,
    wallEnabled: event?.settings.wallEnabled ?? true,
    publicSelfies: event?.settings.publicSelfies ?? false,
    useDefaultAssets: event?.settings.useDefaultAssets ?? true,
    showInstagram: event?.settings.showInstagram ?? true,
    showReview: event?.settings.showReview ?? true,
    moderation: event?.settings.moderation ?? ('auto' as 'auto' | 'manual'),
    charLimit: event?.settings.charLimit ?? 300,
    maxWishes: event?.settings.maxWishes ?? 0,
    wallLimit: event?.settings.wallLimit ?? 16,
    liveQr: event?.settings.liveQr ?? ('full' as 'full' | 'compact' | 'hidden'),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const setSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const submit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    setError(null);
    setSaved(false);

    const payload = {
      ...form,
      eventDate: form.eventDate || null,
      expiryDate: form.expiryDate || null,
      settings,
    };

    startTransition(async () => {
      const result = event
        ? await updateEventAction(event.id, payload)
        : await createEventAction(payload);

      if (!result.ok) {
        setError(result.error ?? 'Could not save the event');
        return;
      }

      if (event) {
        setSaved(true);
        router.refresh();
      } else {
        const id = (result.data as { id: string } | undefined)?.id;
        router.push(id ? `/admin/events/${id}` : '/admin');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-2xl border border-[var(--card-line)] bg-white p-5">
        <h2 className="mb-4 font-medium text-[var(--ink)]">The celebration</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name" hint="Used internally and as a fallback headline">
            <input
              className={inputClass}
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Arjun & Priya Wedding"
            />
          </Field>

          <Field label="Hosts" hint="Shown to guests: “Add your wishes for…”">
            <input
              className={inputClass}
              maxLength={120}
              value={form.hosts}
              onChange={(e) => set('hosts', e.target.value)}
              placeholder="Arjun & Priya"
            />
          </Field>

          <Field label="Event date">
            <input
              type="date"
              className={inputClass}
              value={form.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
            />
          </Field>

          <Field label="Wishes close on" hint="The wall stops accepting wishes after this day">
            <input
              type="date"
              className={inputClass}
              value={form.expiryDate}
              onChange={(e) => set('expiryDate', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Welcome message" hint="One warm line under the headline">
            <input
              className={inputClass}
              maxLength={300}
              value={form.welcomeMessage}
              onChange={(e) => set('welcomeMessage', e.target.value)}
              placeholder="Your message will become part of their digital Wish Wall."
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--card-line)] bg-white p-5">
        <h2 className="mb-1 font-medium text-[var(--ink)]">Theme</h2>
        <p className="mb-4 text-[0.82rem] text-[var(--ink-soft)]">
          Sets the colours, decorations and confetti on the guest page.
        </p>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {THEME_LIST.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => set('theme', theme.id)}
              className={cn(
                'rounded-xl border-2 p-3 text-left transition-colors',
                form.theme === theme.id
                  ? 'border-[var(--accent)]'
                  : 'border-[var(--card-line)] hover:border-cocoa-300',
              )}
            >
              <span
                className="mb-2 block h-10 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${theme.tokens['--wall-1']}, ${theme.tokens['--wall-2']}, ${theme.tokens['--wall-3']})`,
                }}
              />
              <span className="block text-[0.82rem] font-medium text-[var(--ink)]">
                {theme.emoji} {theme.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--card-line)] bg-white p-5">
        <h2 className="mb-4 font-medium text-[var(--ink)]">Guest experience</h2>

        <div className="space-y-1">
          <Toggle
            label="Collect selfies"
            hint="Adds the optional photo step to the guest flow"
            checked={settings.selfieEnabled}
            onChange={(v) => setSetting('selfieEnabled', v)}
          />
          <Toggle
            label="Show the Wish Wall"
            hint="The animated wall guests see after sending"
            checked={settings.wallEnabled}
            onChange={(v) => setSetting('wallEnabled', v)}
          />
          <Toggle
            label="Let guests share their photo on the wall"
            hint="Off by default. When on, each guest still chooses privately or publicly — and private is preselected for them."
            checked={settings.publicSelfies}
            onChange={(v) => setSetting('publicSelfies', v)}
          />
          <Toggle
            label="Use the default sticker library"
            hint="Laya & Bee stickers, GIFs and memes, alongside your own uploads"
            checked={settings.useDefaultAssets}
            onChange={(v) => setSetting('useDefaultAssets', v)}
          />
          <Toggle
            label="Show the Instagram button"
            checked={settings.showInstagram}
            onChange={(v) => setSetting('showInstagram', v)}
          />
          <Toggle
            label="Show the Google Review button"
            checked={settings.showReview}
            onChange={(v) => setSetting('showReview', v)}
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Moderation">
            <select
              className={inputClass}
              value={settings.moderation}
              onChange={(e) => setSetting('moderation', e.target.value as 'auto' | 'manual')}
            >
              <option value="auto">Auto-approve</option>
              <option value="manual">Hold for review</option>
            </select>
          </Field>

          <Field label="Character limit">
            <input
              type="number"
              min={50}
              max={LIMITS.wishChars}
              className={inputClass}
              value={settings.charLimit}
              onChange={(e) => setSetting('charLimit', Number(e.target.value))}
            />
          </Field>

          <Field
            label="Latest on wall"
            hint="How many of the newest wishes the live wall rotates through."
          >
            <input
              type="number"
              min={1}
              max={100}
              className={inputClass}
              value={settings.wallLimit}
              onChange={(e) => setSetting('wallLimit', Number(e.target.value))}
            />
          </Field>

          <Field
            label="QR code on live wall"
            hint="Hide it if the table already has a printed code."
          >
            <select
              className={inputClass}
              value={settings.liveQr}
              onChange={(e) => setSetting('liveQr', e.target.value as 'full' | 'compact' | 'hidden')}
            >
              <option value="full">Large</option>
              <option value="compact">Small</option>
              <option value="hidden">Hidden</option>
            </select>
          </Field>

          <Field
            label="Maximum wishes"
            hint={
              settings.maxWishes > 0
                ? `The wall closes to guests after ${settings.maxWishes}. Use 0 for unlimited.`
                : 'Unlimited. Set a number only if you want the wall to close early.'
            }
          >
            <input
              type="number"
              min={0}
              className={inputClass}
              value={settings.maxWishes}
              onChange={(e) => setSetting('maxWishes', Number(e.target.value))}
            />
          </Field>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-[0.86rem] text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-[var(--accent-2)] px-7 text-[0.9rem] font-medium text-white transition-colors hover:bg-[var(--accent)] disabled:opacity-60"
        >
          {pending ? 'Saving…' : event ? 'Save changes' : 'Create event'}
        </button>
        {saved && <span className="text-[0.86rem] text-emerald-700">Saved</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8rem] font-medium text-[var(--ink)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.75rem] text-[var(--ink-soft)]">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-cocoa-50"
    >
      <span>
        <span className="block text-[0.88rem] text-[var(--ink)]">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.76rem] text-[var(--ink-soft)]">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--accent)]' : 'bg-cocoa-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[1.375rem]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}

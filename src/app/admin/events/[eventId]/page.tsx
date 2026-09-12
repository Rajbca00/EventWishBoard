import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEvent, getEventStats, statusFor } from '@/lib/data/events';
import { listWishes } from '@/lib/data/wishes';
import { siteUrl } from '@/lib/env';
import { formatDate, daysUntil, relativeTime } from '@/lib/utils';
import { THEMES } from '@/lib/themes';
import { Badge, EmptyState, LinkButton, PageHeader, Panel, StatCard } from '@/components/admin/ui';
import QrPanel from '@/components/admin/QrPanel';
import LiveQrToggle from '@/components/admin/LiveQrToggle';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId).catch(() => null);
  return { title: event ? (event.hosts || event.name) : 'Event' };
}

export default async function EventOverviewPage({ params }: PageProps) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const [stats, recent] = await Promise.all([
    getEventStats(event.id),
    listWishes(event.id, { limit: 6 }),
  ]);

  const status = statusFor(event, stats);
  const remaining = daysUntil(event.expiryDate);
  const theme = THEMES[event.themeId];
  const url = `${siteUrl()}/event/${event.id}`;

  return (
    <>
      <PageHeader
        title={event.hosts || event.name}
        subtitle={`${theme.emoji} ${theme.label}${event.eventDate ? ` · ${formatDate(event.eventDate)}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={status}>
              {status === 'open' ? 'Live' : status === 'full' ? 'Full' : 'Closed'}
            </Badge>
            <LinkButton href={`/event/${event.id}/live`} variant="ghost" external>
              Live wall
            </LinkButton>
            <LinkButton href={`/event/${event.id}`} variant="ghost" external>
              Preview guest page
            </LinkButton>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total wishes" value={stats.totalWishes} />
        <StatCard label="Today" value={stats.today} tone="accent" />
        <StatCard label="Selfies" value={stats.selfies} />
        <StatCard label="QR scans" value={stats.scans} />
        <StatCard
          label="Submission rate"
          value={`${stats.submissionRate}%`}
          hint="Scans that became a wish"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {status === 'full' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[0.88rem] text-amber-800">
              This wall has reached its limit of {event.settings.maxWishes}{' '}
              {event.settings.maxWishes === 1 ? 'wish' : 'wishes'}, so guests now see the closing
              screen instead of the composer.{' '}
              <Link href={`/admin/events/${event.id}/settings`} className="underline">
                Raise the limit
              </Link>{' '}
              — or set it to 0 for unlimited.
            </div>
          )}

          {stats.pending > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[0.88rem] text-amber-800">
              {stats.pending} {stats.pending === 1 ? 'wish is' : 'wishes are'} waiting for review.{' '}
              <Link href={`/admin/events/${event.id}/wishes?status=pending`} className="underline">
                Review now
              </Link>
            </div>
          )}

          <Panel
            title="Recent wishes"
            action={
              <LinkButton href={`/admin/events/${event.id}/wishes`} variant="ghost">
                Review &amp; moderate all
              </LinkButton>
            }
          >
            {recent.length === 0 ? (
              <EmptyState
                emoji="✨"
                title="No wishes yet"
                detail="Add a few preloaded wishes so the wall is never empty for your first guest."
                action={
                  <LinkButton href={`/admin/events/${event.id}/wishes`}>
                    Add preloaded wishes
                  </LinkButton>
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--card-line)]">
                {recent.map((wish) => (
                  <li key={wish.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 text-lg" aria-hidden>
                      {wish.stickers.find((value) => !value.startsWith('/')) ?? '💌'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display line-clamp-2 block text-[0.98rem] leading-snug text-[var(--ink)]">
                        {wish.message}
                      </span>
                      <span className="mt-0.5 block text-[0.76rem] text-[var(--ink-soft)]">
                        {wish.isAnonymous ? 'Anonymous' : (wish.guestName ?? 'Anonymous')} ·{' '}
                        {relativeTime(wish.createdAt)}
                        {wish.preloaded ? ' · preloaded' : ''}
                      </span>
                    </span>
                    <Badge tone={wish.status}>{wish.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            title="Live wall"
            description="Open this on a TV or projector at the venue"
          >
            <div className="p-5">
              <p className="mb-3 break-all rounded-xl border border-[var(--card-line)] bg-cocoa-50 px-3.5 py-2.5 font-mono text-[0.76rem] text-[var(--ink)]">
                {`${url}/live`}
              </p>
              <p className="text-[0.8rem] leading-relaxed text-[var(--ink-soft)]">
                One wish at a time in a spotlight beside the latest ones, checking for new
                wishes every 30 seconds. Press F on the screen for fullscreen.
              </p>
              <div className="mt-4 border-t border-[var(--card-line)] pt-4">
                <LiveQrToggle eventId={event.id} initial={event.settings.liveQr} />
              </div>
            </div>
          </Panel>

          <Panel title="QR code" description="Print this for the dessert table">
            <QrPanel eventId={event.id} url={url} hosts={event.hosts || event.name} />
          </Panel>

          <Panel title="Event details">
            <dl className="divide-y divide-[var(--card-line)] text-[0.85rem]">
              <Row label="Wishes close">
                {event.expiryDate
                  ? `${formatDate(event.expiryDate)}${
                      remaining !== null && remaining >= 0 ? ` · in ${remaining}d` : ' · passed'
                    }`
                  : 'No expiry set'}
              </Row>
              <Row label="Moderation">
                {event.settings.moderation === 'manual' ? 'Hold for review' : 'Auto-approve'}
              </Row>
              <Row label="Selfies">
                {event.settings.selfieEnabled ? 'Collecting' : 'Off'}
                {event.settings.publicSelfies ? ' · shown publicly' : ' · private'}
              </Row>
              <Row label="Wish limit">
                {event.settings.maxWishes > 0 ? event.settings.maxWishes : 'Unlimited'}
              </Row>
            </dl>
            <div className="border-t border-[var(--card-line)] p-4">
              <LinkButton href={`/admin/events/${event.id}/settings`} variant="ghost">
                Edit settings
              </LinkButton>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3">
      <dt className="text-[var(--ink-soft)]">{label}</dt>
      <dd className="text-right text-[var(--ink)]">{children}</dd>
    </div>
  );
}

import Link from 'next/link';
import { listEvents } from '@/lib/data/events';
import { formatDate, daysUntil } from '@/lib/utils';
import { Badge, EmptyState, LinkButton, PageHeader, Panel, StatCard } from '@/components/admin/ui';
import { THEMES } from '@/lib/themes';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const events = await listEvents();

  const totals = events.reduce(
    (acc, event) => ({
      wishes: acc.wishes + event.stats.totalWishes,
      today: acc.today + event.stats.today,
      selfies: acc.selfies + event.stats.selfies,
      scans: acc.scans + event.stats.scans,
      guestWishes: acc.guestWishes + event.stats.guestWishes,
      pending: acc.pending + event.stats.pending,
    }),
    { wishes: 0, today: 0, selfies: 0, scans: 0, guestWishes: 0, pending: 0 },
  );

  const active = events.filter((event) => event.status === 'open');
  const submissionRate = totals.scans
    ? Math.min(100, Math.round((totals.guestWishes / totals.scans) * 100))
    : 0;

  return (
    <>
      <PageHeader
        title="Event Overview"
        subtitle={
          events.length
            ? `${active.length} live ${active.length === 1 ? 'celebration' : 'celebrations'} of ${events.length} total`
            : 'Create your first celebration to get started'
        }
        action={<LinkButton href="/admin/events/new">+ Create event</LinkButton>}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total wishes" value={totals.wishes} />
        <StatCard label="Today" value={totals.today} tone="accent" />
        <StatCard label="Selfies" value={totals.selfies} />
        <StatCard label="QR scans" value={totals.scans} />
        <StatCard
          label="Submission rate"
          value={`${submissionRate}%`}
          hint="Scans that became a wish"
        />
      </div>

      {totals.pending > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-[0.88rem] text-amber-800">
          {totals.pending} {totals.pending === 1 ? 'wish is' : 'wishes are'} waiting for moderation.
        </div>
      )}

      <Panel title="Events">
        {events.length === 0 ? (
          <EmptyState
            emoji="💌"
            title="No events yet"
            detail="Create an event to generate its QR code and start collecting wishes."
            action={<LinkButton href="/admin/events/new">Create your first event</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-[var(--card-line)]">
            {events.map((event) => {
              const remaining = daysUntil(event.expiryDate);
              const theme = THEMES[event.themeId];

              return (
                <li key={event.id}>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-cocoa-50"
                  >
                    <span className="text-xl" aria-hidden>
                      {theme.emoji}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-[var(--ink)]">
                          {event.hosts || event.name}
                        </span>
                        <Badge tone={event.status}>
                          {event.status === 'open' ? 'Live' : event.status === 'full' ? 'Full' : 'Closed'}
                        </Badge>
                        {event.stats.pending > 0 && (
                          <Badge tone="pending">{event.stats.pending} pending</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.8rem] text-[var(--ink-soft)]">
                        /event/{event.id}
                        {event.eventDate ? ` · ${formatDate(event.eventDate)}` : ''}
                        {remaining !== null && remaining >= 0
                          ? ` · closes in ${remaining}d`
                          : remaining !== null
                            ? ' · expired'
                            : ''}
                      </span>
                    </span>

                    <span className="flex shrink-0 gap-5 text-right">
                      <Stat label="Wishes" value={event.stats.totalWishes} />
                      <Stat label="Selfies" value={event.stats.selfies} />
                      <Stat label="Scans" value={event.stats.scans} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="block">
      <span className="block font-display text-lg leading-none text-[var(--ink)]">{value}</span>
      <span className="mt-1 block text-[0.68rem] uppercase tracking-wider text-[var(--ink-soft)]">
        {label}
      </span>
    </span>
  );
}

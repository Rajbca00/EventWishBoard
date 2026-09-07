import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Sidebar from '@/components/admin/Sidebar';
import DemoBanner from '@/components/DemoBanner';
import { currentAdmin } from '@/lib/admin-auth';
import { getEvent } from '@/lib/data/events';

export const metadata: Metadata = {
  title: { default: 'Organiser Dashboard', template: '%s · Wish Wall Admin' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Pulls the event id straight out of the path so the sidebar can show its sub-nav. */
function eventIdFromPath(pathname: string): string | undefined {
  return /^\/admin\/events\/([^/]+)/.exec(pathname)?.[1];
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // The login page renders its own shell.
  if (pathname.startsWith('/admin/login')) return <>{children}</>;

  const admin = await currentAdmin();
  // A Supabase Auth account is not enough to enter the dashboard: it must
  // also be present in the admin_users allow-list. Preserve that distinction
  // so a successful sign-in does not look like a redirect loop.
  if (!admin) redirect('/admin/login?error=not-authorized');

  const rawId = eventIdFromPath(pathname);
  const eventId = rawId && rawId !== 'new' ? rawId : undefined;
  const event = eventId ? await getEvent(eventId).catch(() => null) : null;

  return (
    <div className="admin-shell flex min-h-dvh flex-col bg-cocoa-50 lg:flex-row">
      <Sidebar
        eventId={event?.id}
        eventName={event?.hosts || event?.name}
        adminEmail={admin.email}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="px-5 pt-5 lg:px-8">
          <DemoBanner />
        </div>
        <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

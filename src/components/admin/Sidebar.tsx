'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandGlyph } from '@/components/ui/BrandMark';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarHeart,
  MessageCircleHeart,
  Images,
  Sticker,
  BookHeart,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface Props {
  /** When a specific event is open, its sub-pages join the nav. */
  eventId?: string;
  eventName?: string;
  adminEmail: string;
}

const ICONS = {
  dashboard: LayoutDashboard,
  events: CalendarHeart,
  wishes: MessageCircleHeart,
  memories: Images,
  assets: Sticker,
  book: BookHeart,
  settings: Settings,
} as const;

export default function Sidebar({ eventId, eventName, adminEmail }: Props) {
  const pathname = usePathname();

  const globalLinks = [
    { href: '/admin', label: 'Dashboard', icon: ICONS.dashboard, exact: true },
    { href: '/admin/events/new', label: 'New event', icon: ICONS.events, exact: true },
  ];

  const eventLinks = eventId
    ? [
        { href: `/admin/events/${eventId}`, label: 'Overview', icon: ICONS.dashboard, exact: true },
        { href: `/admin/events/${eventId}/wishes`, label: 'Wishes', icon: ICONS.wishes, exact: false },
        { href: `/admin/events/${eventId}/memories`, label: 'Memories', icon: ICONS.memories, exact: false },
        { href: `/admin/events/${eventId}/assets`, label: 'Assets', icon: ICONS.assets, exact: false },
        { href: `/admin/events/${eventId}/book`, label: 'Memory book', icon: ICONS.book, exact: false },
        { href: `/admin/events/${eventId}/settings`, label: 'Settings', icon: ICONS.settings, exact: false },
      ]
    : [];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 bg-cocoa-900 p-5 text-cocoa-100 lg:h-dvh lg:w-64 lg:sticky lg:top-0">
      <Link href="/admin" className="flex items-center gap-2.5">
        <BrandGlyph size={26} className="text-blush-300" />
        <span className="font-display text-lg tracking-wide text-white">Laya &amp; Bee</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {globalLinks.map((link) => (
          <NavLink key={link.href} {...link} active={isActive(link.href, link.exact)} />
        ))}
      </nav>

      {eventId && (
        <div className="flex flex-col gap-1">
          <p className="truncate px-3 pb-1 text-[0.68rem] uppercase tracking-[0.2em] text-cocoa-300">
            {eventName ?? 'Event'}
          </p>
          {eventLinks.map((link) => (
            <NavLink key={link.href} {...link} active={isActive(link.href, link.exact)} />
          ))}
          <a
            href={`/event/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.88rem] text-cocoa-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="size-4 shrink-0" />
            Open guest page
          </a>
        </div>
      )}

      <div className="mt-auto hidden border-t border-white/10 pt-4 lg:block">
        <p className="truncate text-[0.78rem] text-cocoa-300">{adminEmail}</p>
        <Link href="/" className="mt-1 inline-block text-[0.78rem] text-blush-300 hover:text-blush-200">
          View public site
        </Link>
      </div>
    </aside>
  );
}

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}

function NavLink({ href, label, icon: Icon, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.88rem] transition-colors',
        active ? 'bg-white/10 text-white' : 'text-cocoa-300 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

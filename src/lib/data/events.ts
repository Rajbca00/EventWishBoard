import 'server-only';
import { supabaseAdmin, ASSET_BUCKET, MEMORY_BUCKET } from '../supabase/admin';
import { deleteStoredFolder } from '../images';
import { isSupabaseConfigured } from '../env';
import { demoData, demoStats } from '../demo/store';
import { normalizeExpiry, slugify } from '../utils';
import { parseSettings, shapeEvent, shapeStats, EMPTY_STATS } from './shape';
import type {
  CelebrationEvent,
  EventRow,
  EventStats,
  EventStatsRow,
  EventStatus,
  EventSettings,
} from '../types';

export interface EventWithStats extends CelebrationEvent {
  stats: EventStats;
  status: EventStatus;
}

/** True while the app runs on the in-memory demo store. */
const demo = () => !isSupabaseConfigured();

/* ------------------------------------------------------------------ reads */

export async function getEvent(id: string): Promise<CelebrationEvent | null> {
  if (demo()) {
    const row = demoData().events.find((event) => event.id === id);
    return row ? shapeEvent(row) : null;
  }

  const { data, error } = await supabaseAdmin()
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle<EventRow>();

  if (error) throw new Error(error.message);
  return data ? shapeEvent(data) : null;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  if (demo()) return shapeStats(demoStats(eventId));

  const { data } = await supabaseAdmin()
    .from('event_stats')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle<EventStatsRow>();
  return shapeStats(data);
}

export async function listEvents(): Promise<EventWithStats[]> {
  if (demo()) {
    return demoData()
      .events.map((row) => {
        const event = shapeEvent(row);
        const stats = shapeStats(demoStats(row.id));
        return { ...event, stats, status: statusFor(event, stats) };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const [{ data: events, error }, { data: stats }] = await Promise.all([
    supabaseAdmin().from('events').select('*').order('created_at', { ascending: false }),
    supabaseAdmin().from('event_stats').select('*'),
  ]);

  if (error) throw new Error(error.message);

  const statsById = new Map<string, EventStatsRow>(
    ((stats ?? []) as EventStatsRow[]).map((row) => [row.event_id, row]),
  );

  return ((events ?? []) as EventRow[]).map((row) => {
    const event = shapeEvent(row);
    const eventStats = shapeStats(statsById.get(row.id));
    return { ...event, stats: eventStats, status: statusFor(event, eventStats) };
  });
}

/** open | full (wish cap reached) | closed (expired or archived) */
export function statusFor(event: CelebrationEvent, stats: EventStats = EMPTY_STATS): EventStatus {
  if (event.archived || event.expired) return 'closed';
  if (event.settings.maxWishes > 0 && stats.guestWishes >= event.settings.maxWishes) return 'full';
  return 'open';
}

export async function getEventStatus(event: CelebrationEvent): Promise<EventStatus> {
  if (event.archived || event.expired) return 'closed';
  if (event.settings.maxWishes <= 0) return 'open';
  return statusFor(event, await getEventStats(event.id));
}

/* ------------------------------------------------------------------ writes */

async function uniqueSlug(desired: string): Promise<string> {
  const base = slugify(desired);

  const taken = demo()
    ? new Set(demoData().events.map((event) => event.id))
    : await supabaseAdmin()
        .from('events')
        .select('id')
        .like('id', `${base}%`)
        .then(({ data }) => new Set(((data ?? []) as { id: string }[]).map((row) => row.id)));

  if (!taken.has(base)) return base;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${String(n).padStart(3, '0')}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export interface CreateEventInput {
  name: string;
  hosts?: string;
  slug?: string;
  eventDate?: string | null;
  expiryDate?: string | null;
  description?: string;
  theme?: string;
  welcomeMessage?: string;
  logoUrl?: string | null;
  background?: string | null;
  settings?: Partial<EventSettings>;
}

export async function createEvent(input: CreateEventInput): Promise<CelebrationEvent> {
  const id = await uniqueSlug(input.slug || input.name || input.hosts || 'celebration');

  if (demo()) {
    const now = new Date().toISOString();
    const row: EventRow = {
      id,
      name: input.name.trim(),
      hosts: (input.hosts ?? '').trim(),
      event_date: input.eventDate || null,
      expiry_date: normalizeExpiry(input.expiryDate),
      description: (input.description ?? '').trim(),
      theme: input.theme ?? 'wedding',
      background: input.background ?? null,
      welcome_message: (input.welcomeMessage ?? '').trim(),
      logo_url: input.logoUrl ?? null,
      settings: parseSettings(input.settings ?? {}),
      archived: false,
      created_at: now,
      updated_at: now,
    };
    demoData().events.push(row);
    return shapeEvent(row);
  }

  const { data, error } = await supabaseAdmin()
    .from('events')
    .insert({
      id,
      name: input.name.trim(),
      hosts: (input.hosts ?? '').trim(),
      event_date: input.eventDate || null,
      expiry_date: normalizeExpiry(input.expiryDate),
      description: (input.description ?? '').trim(),
      theme: input.theme ?? 'wedding',
      welcome_message: (input.welcomeMessage ?? '').trim(),
      logo_url: input.logoUrl ?? null,
      background: input.background ?? null,
      settings: parseSettings(input.settings ?? {}),
    })
    .select('*')
    .single<EventRow>();

  if (error) throw new Error(error.message);
  return shapeEvent(data);
}

export type UpdateEventInput = Partial<CreateEventInput> & { archived?: boolean };

export async function updateEvent(
  id: string,
  patch: UpdateEventInput,
): Promise<CelebrationEvent | null> {
  const current = await getEvent(id);
  if (!current) return null;

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.hosts !== undefined) update.hosts = patch.hosts.trim();
  if (patch.eventDate !== undefined) update.event_date = patch.eventDate || null;
  if (patch.expiryDate !== undefined) update.expiry_date = normalizeExpiry(patch.expiryDate);
  if (patch.description !== undefined) update.description = patch.description.trim();
  if (patch.theme !== undefined) update.theme = patch.theme;
  if (patch.welcomeMessage !== undefined) update.welcome_message = patch.welcomeMessage.trim();
  if (patch.logoUrl !== undefined) update.logo_url = patch.logoUrl;
  if (patch.background !== undefined) update.background = patch.background;
  if (patch.archived !== undefined) update.archived = patch.archived;
  if (patch.settings !== undefined) {
    update.settings = parseSettings({ ...current.settings, ...patch.settings });
  }

  if (!Object.keys(update).length) return current;

  if (demo()) {
    const row = demoData().events.find((event) => event.id === id);
    if (!row) return null;
    Object.assign(row, update, { updated_at: new Date().toISOString() });
    return shapeEvent(row);
  }

  const { data, error } = await supabaseAdmin()
    .from('events')
    .update(update)
    .eq('id', id)
    .select('*')
    .single<EventRow>();

  if (error) throw new Error(error.message);
  return shapeEvent(data);
}

/** Cascades to wishes, assets and scans; also clears the stored files. */
export async function deleteEvent(id: string): Promise<void> {
  if (demo()) {
    const store = demoData();
    store.events = store.events.filter((event) => event.id !== id);
    store.wishes = store.wishes.filter((wish) => wish.event_id !== id);
    store.assets = store.assets.filter((asset) => asset.event_id !== id);
    store.scans = store.scans.filter((scan) => scan.event_id !== id);
    return;
  }

  const admin = supabaseAdmin();

  // Sweep both buckets by prefix rather than by the paths recorded in the
  // database: that also catches anything orphaned by an earlier failure, and
  // guarantees no guest photo outlives the event it was taken at.
  await Promise.all([
    deleteStoredFolder(MEMORY_BUCKET, id),
    deleteStoredFolder(ASSET_BUCKET, id),
  ]);

  const { error } = await admin.from('events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ scans */

/** One row per QR page open, used for the submission-rate metric. */
export async function recordScan(eventId: string, ipHash: string | null): Promise<void> {
  if (demo()) {
    demoData().scans.push({ event_id: eventId, created_at: new Date().toISOString() });
    return;
  }
  await supabaseAdmin().from('scans').insert({ event_id: eventId, ip_hash: ipHash });
}

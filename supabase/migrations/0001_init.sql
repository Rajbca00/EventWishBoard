-- =============================================================================
-- Laya & Bee Wish Wall — initial schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- =============================================================================

-- ---------------------------------------------------------------- enum types
do $$ begin
  create type wish_status as enum ('pending', 'approved', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_type as enum ('sticker', 'gif', 'meme');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- events
create table if not exists public.events (
  id              text primary key,
  name            text        not null,
  hosts           text        not null default '',
  event_date      date,
  expiry_date     timestamptz,
  description     text        not null default '',
  theme           text        not null default 'wedding',
  background      text,
  welcome_message text        not null default '',
  logo_url        text,
  settings        jsonb       not null default '{}'::jsonb,
  archived        boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table  public.events is 'One row per celebration. Drives the guest page, QR link and Wish Wall.';
comment on column public.events.id is 'URL slug, e.g. laya-bee-wedding-001 → /event/laya-bee-wedding-001';
comment on column public.events.settings is 'Feature flags: selfieEnabled, wallEnabled, publicSelfies, moderation, charLimit, maxWishes, useDefaultAssets, showInstagram, showReview.';

-- ---------------------------------------------------------------- wishes
create table if not exists public.wishes (
  id           uuid        primary key default gen_random_uuid(),
  event_id     text        not null references public.events(id) on delete cascade,
  message      text        not null,
  guest_name   text,
  is_anonymous boolean     not null default false,
  sticker      text,
  gif          text,
  meme         text,
  selfie_path  text,
  status       wish_status not null default 'approved',
  is_featured  boolean     not null default false,
  is_preloaded boolean     not null default false,
  ip_hash      text,
  created_at   timestamptz not null default now()
);

comment on column public.wishes.selfie_path is 'Object path inside the PRIVATE "memories" bucket. Never a public URL.';
comment on column public.wishes.is_preloaded is 'Organiser-seeded wish so the Wish Wall is never empty for the first guest.';
comment on column public.wishes.ip_hash is 'Salted hash of the submitter IP, used only for rate limiting.';

create index if not exists wishes_event_created_idx on public.wishes (event_id, created_at desc);
create index if not exists wishes_event_status_idx  on public.wishes (event_id, status);
create index if not exists wishes_event_iphash_idx  on public.wishes (event_id, ip_hash);
create index if not exists wishes_selfie_idx        on public.wishes (event_id) where selfie_path is not null;

-- ---------------------------------------------------------------- assets
create table if not exists public.assets (
  id         uuid        primary key default gen_random_uuid(),
  event_id   text        references public.events(id) on delete cascade,
  type       asset_type  not null,
  url        text,
  emoji      text,
  name       text        not null default '',
  enabled    boolean     not null default true,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now(),
  constraint assets_need_content check (url is not null or emoji is not null)
);

comment on column public.assets.event_id is 'NULL means it belongs to the shared Laya & Bee default library, offered to every event.';

create index if not exists assets_event_type_idx on public.assets (event_id, type, enabled);

-- ---------------------------------------------------------------- admin users
create table if not exists public.admin_users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  role       text        not null default 'admin',
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'Allow-list of Supabase Auth users permitted to open the organiser dashboard.';

-- ---------------------------------------------------------------- scans
create table if not exists public.scans (
  id         bigserial   primary key,
  event_id   text        not null references public.events(id) on delete cascade,
  ip_hash    text,
  created_at timestamptz not null default now()
);

create index if not exists scans_event_idx on public.scans (event_id, created_at);

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- stats view
-- Scalar subqueries keep the counts independent (a join would multiply rows).
create or replace view public.event_stats
with (security_invoker = true) as
select
  e.id as event_id,
  (select count(*) from public.wishes w where w.event_id = e.id)                                             as total_wishes,
  (select count(*) from public.wishes w where w.event_id = e.id
     and not w.is_preloaded and w.status <> 'hidden')                                                        as guest_wishes,
  (select count(*) from public.wishes w where w.event_id = e.id
     and w.created_at >= date_trunc('day', now()))                                                           as wishes_today,
  (select count(*) from public.wishes w where w.event_id = e.id and w.selfie_path is not null)               as selfies,
  (select count(*) from public.wishes w where w.event_id = e.id and w.status = 'pending')                    as pending,
  (select count(*) from public.wishes w where w.event_id = e.id and w.status = 'hidden')                     as hidden,
  (select count(*) from public.wishes w where w.event_id = e.id and w.is_featured)                           as featured,
  (select count(*) from public.scans  s where s.event_id = e.id)                                             as scans
from public.events e;

-- =============================================================================
-- Row Level Security
--
-- Every guest write goes through the Next.js server (service-role key) so that
-- sanitising, rate limiting and expiry checks cannot be bypassed. Anonymous
-- clients therefore get READ-ONLY access, and only to what is safe to show.
-- =============================================================================

alter table public.events      enable row level security;
alter table public.wishes      enable row level security;
alter table public.assets      enable row level security;
alter table public.admin_users enable row level security;
alter table public.scans       enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.id = auth.uid());
$$;

-- events: anyone may read a live event page; only admins may change one.
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select using (not archived);

drop policy if exists events_admin_all on public.events;
create policy events_admin_all on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- wishes: the public Wish Wall may read approved wishes (enables live updates).
-- selfie_path is safe to expose because the "memories" bucket is private.
drop policy if exists wishes_public_read on public.wishes;
create policy wishes_public_read on public.wishes
  for select using (status = 'approved');

drop policy if exists wishes_admin_all on public.wishes;
create policy wishes_admin_all on public.wishes
  for all using (public.is_admin()) with check (public.is_admin());

-- assets: guests may read the enabled sticker / GIF / meme library.
drop policy if exists assets_public_read on public.assets;
create policy assets_public_read on public.assets
  for select using (enabled);

drop policy if exists assets_admin_all on public.assets;
create policy assets_admin_all on public.assets
  for all using (public.is_admin()) with check (public.is_admin());

-- admin_users / scans: dashboard only. No anonymous access at all.
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists scans_admin_read on public.scans;
create policy scans_admin_read on public.scans
  for select using (public.is_admin());

-- =============================================================================
-- Storage buckets
--   assets   → public  : stickers, GIFs, memes, event logos and backgrounds
--   memories → PRIVATE : guest selfies, reachable only via signed URLs
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', true, 5242880,
        array['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', false, 5242880,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read for the shared asset bucket. Writes stay service-role only.
drop policy if exists "assets public read" on storage.objects;
create policy "assets public read" on storage.objects
  for select using (bucket_id = 'assets');

-- Selfies: signed URLs only, plus direct access for signed-in admins.
drop policy if exists "memories admin read" on storage.objects;
create policy "memories admin read" on storage.objects
  for select using (bucket_id = 'memories' and public.is_admin());

-- =============================================================================
-- Default sticker library (shared by every event; event_id is NULL)
-- =============================================================================

insert into public.assets (event_id, type, emoji, name, sort_order)
select null, 'sticker'::asset_type, v.emoji, v.name, v.ord
from (values
  ('❤️', 'Love', 10),
  ('💕', 'Two hearts', 20),
  ('🎉', 'Celebrate', 30),
  ('🥂', 'Cheers', 40),
  ('💍', 'Forever', 50),
  ('✨', 'Sparkle', 60),
  ('🥰', 'Adore', 70),
  ('🎂', 'Cake', 80),
  ('💐', 'Bouquet', 90),
  ('🌟', 'Star', 100),
  ('🧁', 'Sweetness', 110),
  ('🎀', 'Ribbon', 120)
) as v(emoji, name, ord)
where not exists (
  select 1 from public.assets a
  where a.event_id is null and a.type = 'sticker' and a.emoji = v.emoji
);

-- =============================================================================
-- Default motion + meme library.
-- These point at files bundled with the app (public/library/...), so a brand new
-- install can demo the full picker before the organiser uploads anything.
-- =============================================================================

insert into public.assets (event_id, type, url, name, sort_order)
select null, v.type::asset_type, v.url, v.name, v.ord
from (values
  ('gif',  '/library/gifs/hearts.svg',      'Floating hearts',   10),
  ('gif',  '/library/gifs/confetti.svg',    'Confetti burst',    20),
  ('gif',  '/library/gifs/cheers.svg',      'Cheers!',           30),
  ('gif',  '/library/gifs/sparkle.svg',     'Sparkle',           40),
  ('gif',  '/library/gifs/cake.svg',        'Happy cake',        50),
  ('meme', '/library/memes/best-couple.svg','Best couple award', 10),
  ('meme', '/library/memes/finally.svg',    'Finally!',          20),
  ('meme', '/library/memes/dessert.svg',    'Here for dessert',  30),
  ('meme', '/library/memes/dance.svg',      'See you on the floor', 40)
) as v(type, url, name, ord)
where not exists (
  select 1 from public.assets a where a.event_id is null and a.url = v.url
);

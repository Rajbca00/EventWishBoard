-- =============================================================================
-- Laya & Bee Wish Wall — post-event memory book
--
-- After the celebration the couple gets a keepsake: every wish, laid out to be
-- read and printed. It lives on an unguessable link the organiser generates and
-- can revoke, so it can be forwarded to family without opening the dashboard,
-- and without being discoverable from the event's public URL.
--
-- Run this in the Supabase SQL editor after 0002_selfie_visibility.sql.
-- =============================================================================

alter table public.events
  add column if not exists book_token text unique,
  add column if not exists book_created_at timestamptz;

comment on column public.events.book_token is
  'Unguessable share token for the memory book at /book/<token>. NULL means no book has been shared yet; clearing it revokes every link already handed out.';

create index if not exists events_book_token_idx
  on public.events (book_token)
  where book_token is not null;

-- The book is served by the Next.js server using the secret key, which bypasses
-- RLS. No anonymous policy is added here on purpose: without one, a leaked token
-- is still useless to anyone talking to the database directly.

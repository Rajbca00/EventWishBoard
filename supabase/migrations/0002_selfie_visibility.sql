-- =============================================================================
-- Laya & Bee Wish Wall — per-guest selfie visibility
--
-- Until now a selfie's visibility was decided entirely by the organiser's
-- `publicSelfies` event setting: either every guest photo appeared on the wall,
-- or none did. That is the wrong person making the decision. A photo belongs to
-- the guest in it, so the guest chooses.
--
-- The two settings now layer:
--   event.settings.publicSelfies  = may guests share photos at all? (ceiling)
--   wishes.selfie_public          = did THIS guest choose to share? (consent)
--
-- A selfie reaches the public wall only when both are true. Existing rows
-- default to false, so nothing that was private becomes public on upgrade.
--
-- Run this in the Supabase SQL editor after 0001_init.sql.
-- =============================================================================

alter table public.wishes
  add column if not exists selfie_public boolean not null default false;

comment on column public.wishes.selfie_public is
  'The guest opted to show their photo on the public Wish Wall. Requires the event''s publicSelfies setting to also be on.';

-- Lets the wall query find shareable photos without scanning every wish.
create index if not exists wishes_public_selfie_idx
  on public.wishes (event_id)
  where selfie_public and selfie_path is not null;

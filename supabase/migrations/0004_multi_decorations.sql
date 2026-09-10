-- =============================================================================
-- 0004 — more than one sticker, GIF and meme per wish, and a bigger library.
--
-- Guests kept picking a sticker, then a second one, and losing the first. A
-- wish now carries a list of each.
--
-- The original singular columns are deliberately kept and kept in sync with the
-- first element of each list. Two reasons: a deploy that reaches production
-- before this migration runs still reads and writes something sensible, and
-- rolling back does not lose a guest's choices.
-- =============================================================================

alter table public.wishes
  add column if not exists stickers text[] not null default '{}',
  add column if not exists gifs     text[] not null default '{}',
  add column if not exists memes    text[] not null default '{}';

comment on column public.wishes.stickers is
  'Emoji or image URLs, in the order the guest picked them. wishes.sticker mirrors the first.';
comment on column public.wishes.gifs is
  'Animated library URLs. wishes.gif mirrors the first.';
comment on column public.wishes.memes is
  'Meme library URLs. wishes.meme mirrors the first.';

-- Carry every existing single choice into its list.
update public.wishes
   set stickers = array[sticker]
 where sticker is not null and cardinality(stickers) = 0;

update public.wishes
   set gifs = array[gif]
 where gif is not null and cardinality(gifs) = 0;

update public.wishes
   set memes = array[meme]
 where meme is not null and cardinality(memes) = 0;

-- =============================================================================
-- More stickers. Existing rows are left alone; only genuinely new emoji are
-- added, so re-running this is harmless.
-- =============================================================================

insert into public.assets (event_id, type, emoji, name, sort_order)
select null, 'sticker'::asset_type, v.emoji, v.name, v.ord
from (values
  ('🎊', 'Party popper',   130),
  ('🌸', 'Blossom',        140),
  ('🕊️', 'Peace',          150),
  ('💖', 'Beating heart',  160),
  ('🍰', 'A slice',        170),
  ('🥳', 'Party face',     180),
  ('👏', 'Applause',       190),
  ('🫶', 'Heart hands',    200),
  ('🌙', 'Moonlight',      210),
  ('🦋', 'Butterfly',      220),
  ('🍾', 'Pop the cork',   230),
  ('💫', 'Dizzy',          240)
) as v(emoji, name, ord)
where not exists (
  select 1 from public.assets a
  where a.event_id is null and a.type = 'sticker' and a.emoji = v.emoji
);

-- =============================================================================
-- More animated pieces and more memes.
-- =============================================================================

insert into public.assets (event_id, type, url, name, sort_order)
select null, v.type::asset_type, v.url, v.name, v.ord
from (values
  ('gif',  '/library/gifs/balloons.svg',      'Balloons rising',    60),
  ('gif',  '/library/gifs/rings.svg',         'Rings',              70),
  ('gif',  '/library/gifs/fireworks.svg',     'Fireworks',          80),
  ('gif',  '/library/gifs/cupcake.svg',       'Cupcake wink',       90),
  ('gif',  '/library/gifs/dancing.svg',       'Dance floor',       100),
  ('gif',  '/library/gifs/love-letter.svg',   'Love letter',       110),
  ('meme', '/library/memes/cake-boss.svg',    'Cake boss',          50),
  ('meme', '/library/memes/plus-one.svg',     'Here for the cake',  60),
  ('meme', '/library/memes/crying.svg',       'Not crying',         70),
  ('meme', '/library/memes/photobomb.svg',    'Photobomb',          80)
) as v(type, url, name, ord)
where not exists (
  select 1 from public.assets a where a.event_id is null and a.url = v.url
);

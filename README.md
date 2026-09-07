# Laya & Bee Wish Wall

A mobile-first wish collection experience for weddings, birthdays and celebrations.
Guests scan a QR code on the dessert table, leave a message in about 30 seconds, and
watch it fly onto a dreamy 3D Wish Wall.

> Scan QR → leave a little piece of love → watch it become part of their celebration.

Built as a reusable multi-event platform: one deployment runs every celebration, each
with its own URL, QR code, theme and sticker library.

---

## Contents

- [Quick start](#quick-start)
- [Connecting Supabase](#connecting-supabase)
- [Creating your first admin](#creating-your-first-admin)
- [Deploying to Vercel](#deploying-to-vercel)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Security and privacy](#security-and-privacy)
- [Customising](#customising)
- [Scripts](#scripts)

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With no database configured the app runs in **demo mode**:
an in-memory store seeded with two sample events, so you can walk the entire guest
journey and click through the dashboard before setting anything up.

| Where | What |
| --- | --- |
| `/` | Public landing page |
| `/event/laya-bee-wedding-001` | The guest experience (sample wedding) |
| `/event/ananya-birthday-001` | The guest experience (sample birthday) |
| `/admin` | Organiser dashboard |

Demo data resets whenever the server restarts, and demo mode disappears the moment
Supabase credentials are present.

---

## Connecting Supabase

### 1. Create the project

Sign up at [supabase.com](https://supabase.com) and create a new project. The free tier
is comfortably enough for several events.

### 2. Run the migration

Open **SQL Editor → New query**, paste the entire contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.

That single script creates:

- the `events`, `wishes`, `assets`, `admin_users` and `scans` tables
- the `event_stats` view that powers the dashboard counters
- Row Level Security policies (guests get read-only access; all writes go through the server)
- the `assets` (public) and `memories` (**private**) storage buckets
- the default sticker, GIF and meme library

### 3. Copy your keys

In the dashboard, open your project and go to **Settings** (the gear at the bottom of
the left sidebar) **→ API Keys**. You need three values:

| Supabase field | Env var | Looks like |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| Publishable key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| Secret key | `SUPABASE_SECRET_KEY` | `sb_secret_…` |

The secret key is hidden by default — click **Reveal**, or **Create new secret key** if
the list is empty. The Project URL also appears in the **Connect** button at the top of
the dashboard, alongside the publishable key.

<details>
<summary>If your project shows <code>anon</code> and <code>service_role</code> keys instead</summary>

Older projects were issued JWT keys — long strings starting with `eyJ` — listed under
**Settings → API Keys → Legacy API keys**. They still work; just use the legacy variable
names, which this app also accepts:

```ini
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Supabase is retiring the legacy keys at the end of 2026, so prefer the publishable/secret
pair for anything new.

</details>

### 4. Fill in your environment

```bash
cp .env.example .env.local
```

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
IP_HASH_SALT=any-long-random-string
```

> **The secret key bypasses every security rule.** Keep it server-side only — never
> prefix it with `NEXT_PUBLIC_`, and never commit `.env.local`. (Supabase also refuses
> secret keys sent from a browser, but do not rely on that as your only guard.)

Restart the dev server. The demo banner disappears once you are on real data.

---

## Creating your first admin

The dashboard is open to Supabase Auth users who are also listed in `admin_users`.

1. **Authentication → Users → Add user**. Create the account with an email and password,
   and tick *Auto Confirm User*.
2. Copy the new user's UUID.
3. In the SQL editor:

   ```sql
   insert into public.admin_users (id, email, role)
   values ('paste-the-uuid-here', 'you@layanbee.com', 'owner');
   ```

Now sign in at `/admin/login`. Repeat for each team member who needs access.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import it. The framework is detected automatically.
3. Add the environment variables from `.env.local` under **Settings → Environment Variables**.
   Add `NEXT_PUBLIC_SITE_URL` too (e.g. `https://wishes.layanbee.com`) so generated QR
   codes point at your real domain rather than the preview URL.
4. Deploy.

To use a custom domain, add it under **Settings → Domains** and update
`NEXT_PUBLIC_SITE_URL` to match.

---

## How it works

### The guest journey

```
QR scan
  └─ Welcome            the couple's names, one clear call to action
     └─ Identity        name, or stay anonymous — no account, ever
        └─ Compose      message + sticker / GIF / meme
           └─ Selfie    optional, compressed in the browser
              └─ Preview
                 └─ Wish Wall     the card flies in along a curve and settles
                    └─ Thank you  Laya & Bee, Instagram, Google review
```

Laya & Bee stays a quiet footer line throughout the flow and only steps forward on the
thank-you screen, after the guest has finished.

### The Wish Wall

The card the guest just wrote is measured against its real slot on the wall, then a
clone flies from the centre of the screen along a curved path, settles with a small
bounce, and triggers themed confetti. Because the landing position is measured rather
than guessed, it lands correctly on any screen size.

Three things keep it robust on real phones:

- **Reduced motion** is honoured everywhere — `MotionConfig reducedMotion="user"`, a CSS
  reduced-motion reset that zeroes delays as well as durations, and static poster frames
  inside every animated SVG.
- **Low-powered devices** (few cores, little memory, or Data Saver on) drop the heavy
  decorative layers automatically.
- **A stalled animation cannot trap a guest.** Backgrounded tabs starve
  `requestAnimationFrame`, so if the flight never reports completion the card lands
  anyway after a short timeout.

### Never an empty wall

Organisers can add *preloaded wishes* from the dashboard. They default to anonymous, so
they read as messages that were already there, and the very first guest always arrives
to a wall that feels alive.

---

## Project structure

```
src/
  app/
    page.tsx                        public landing
    event/[eventId]/                the guest experience
    admin/                          organiser dashboard
      actions.ts                    server actions (all admin mutations)
      events/[eventId]/             overview · wishes · memories · assets · settings
    api/
      events/[eventId]/wishes/      guest submission + public wall
      events/[eventId]/scan/        QR scan counter
      admin/events/[eventId]/export CSV download
  components/
    guest/                          welcome, identity, compose, selfie, preview, thanks
    wall/                           WishWall, WishCard, SceneBackground, Decor
    admin/                          sidebar, forms, wish table, gallery, asset manager
    ui/                             Button, Reveal, BrandMark
  lib/
    data/                           events, wishes, assets — the only DB callers
    supabase/                       admin (service role), server (SSR), client (browser)
    themes.ts                       theme tokens; add a celebration style here
    validation.ts                   zod schemas shared by routes and actions
    demo/store.ts                   in-memory store used when Supabase is absent
supabase/migrations/0001_init.sql   the whole schema, RLS and storage setup
scripts/generate-library.mjs        regenerates the bundled sticker/GIF/meme library
```

---

## Security and privacy

- **Guests never sign in.** No account, phone number or email is collected.
- **Every guest write goes through the server** using the service-role key, so
  sanitising, spam checks, rate limits and expiry cannot be bypassed by editing a
  request. Anonymous clients have read-only database access.
- **Guest selfies are private.** They live in a non-public storage bucket and reach the
  dashboard only as short-lived signed URLs. They never appear on the public wall unless
  the organiser explicitly turns on *Show selfies publicly*.
- **Uploads are validated by content**, not by file name — the bytes must match the
  declared image type, and size is capped.
- **Rate limiting** is per event and per IP, using a salted hash that is useless for
  identifying anyone afterwards.
- **Wish text is sanitised** (markup and control characters stripped) and obvious link
  spam is held for moderation even in auto-approve mode.
- **Expired events stop accepting wishes** automatically, while the organiser keeps full
  access to everything already collected.

---

## Customising

**Add a celebration theme** — add an entry to `THEMES` in `src/lib/themes.ts`. It becomes
selectable in the dashboard immediately; no component changes needed.

**Change the brand links** — `BRAND` in `src/lib/env.ts` holds the Instagram, Google
review and enquiry URLs.

**Adjust limits** — `LIMITS` in `src/lib/env.ts` covers character counts, upload sizes
and rate limiting.

**Replace the default sticker library** — edit `scripts/generate-library.mjs` and run
`node scripts/generate-library.mjs`. Per-event stickers, GIFs and memes are uploaded from
the dashboard instead.

### Built to grow

The data model and routing already accommodate the roadmap without a rewrite: a public
shareable wall, a live wall on a venue screen (the RLS policy for anonymous reads of
approved wishes is already in place for Realtime), per-event domains, downloadable memory
books, and analytics.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `node scripts/generate-library.mjs` | Regenerate the bundled asset library |

---

Made for celebrations by **Laya & Bee**.

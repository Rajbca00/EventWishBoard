# Tests

```bash
npm test          # run everything once
npm run test:watch  # re-run on save
npm run verify    # typecheck + lint + tests, the whole gate
```

## How they run

Vitest, no database, no network, no dev server. The suites import the real data
layer and let it fall into **demo mode** — the same in-memory store the app uses
when no Supabase credentials are present. `vitest.config.mts` blanks the Supabase
environment variables, so a suite cannot reach a real project even if a
`.env.local` is sitting there.

That means these are not mocks of the data layer, they are the data layer:
sanitising, moderation, the two locks on a guest photo, the archive builder and
the seeder all run their actual code.

Each file gets its own module registry, and `freshStore()` in `helpers.ts` drops
the in-memory store so a suite starts from the seed.

## What each file covers

| File | What it protects |
| --- | --- |
| `validation.test.ts` | What the API will accept: message and name limits, decoration caps, de-duplication, the photo size gate, and **drafts written by an older version of the app** |
| `shape.test.ts` | Reading a row: decoration lists with a fallback to the old single columns, what the public shape may never expose, settings clamping, spotting a missing column |
| `wishes.test.ts` | Submitting: sanitising, moderation, spam, the wall cap, the CSV export, and the two locks on a photo |
| `seed.test.ts` | Test data: creation, capping, and — the important one — that clean-up **cannot** remove a real guest's wish |
| `archive.test.ts` | The downloadable archive and the memory-book link: offline HTML, escaping, CSV quoting, photo filenames, token revocation |
| `library.test.ts` | The sticker/GIF/meme library: every file animates, none carries a rule that switches its motion off, and the files on disk, the migrations and the demo store all agree |
| `api.test.ts` | The HTTP layer: that the seeder and the archive refuse a stranger, and the size gate answers before buffering |
| `images.test.ts` | Server-side image validation: bytes must match the declared type, and the size ceiling |
| `client.test.ts` | Browser-side: the unsent-wish draft surviving a reload, retry backoff, and the photo policy |
| `utils.test.ts` | Text sanitising, slugs, dates, and the seeded randomness that keeps server and client decor identical |

## What is not covered here

- **React components.** No component tests yet; the UI is exercised by hand.
- **The compression itself.** `processImage` needs a real canvas, which jsdom
  does not have. The policy it follows is pinned in `client.test.ts`; the
  behaviour was measured in a browser (a 4032×3024 source becomes 1200×900 at
  63 KB, and forcing a 40 KB ceiling shrinks it to 530×662).
- **Anything that talks to Supabase.** Storage deletion during seed clean-up runs
  only against a real project, so it is verified by inspection, not execution.

## Adding to them

Name a test for the behaviour it protects, not the function it calls — a failure
should read as a sentence about the product. `it('leaves real wishes and
preloaded ones completely alone')` tells you what broke; `it('filters by
ip_hash')` does not.

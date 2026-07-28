# Data sourcing

## Current seed

`data/seed/source/dog-toxicity-dataset.json` — ASPCA-derived toxic/non-toxic plant lists
plus a compiled foods/medications list (see its own `metadata` block for exact sources and
scrape date). Transformed by `data/seed/src/transform.ts` into `plant`, `food`, and
`medication` Things, each tagged with the pet types they're dangerous to (`dog`, plus
`cat`/`horse` where the source noted it).

**This file is gitignored, not committed.** It's scraped ASPCA content, and this repo is
public — redistributing it under this repo's license isn't something to do without
ASPCA's sign-off. Keep your own local copy at that path to run `pnpm seed:local`; ask
whoever gave you the original dataset for a copy if you don't have one.

## vetmeds.org (American College of Veterinary Pharmacists)

`data/seed/src/scrape-vetmeds.ts` pulls ~106 professionally-authored toxin
entries from vetmeds.org's Pet Poison Control (via its public WordPress
REST API — structured JSON, no HTML scraping needed) into
`data/seed/source/vetmeds-staging.json`. It extracts only short,
structured facts (clinical signs, toxic-dose summary, category) — never
the source's full descriptive prose verbatim.

This is **not** a "broad automated scraping" exception to the philosophy
above — it's an implementation of it. The script only does the tedious
fetch-and-parse labor; nothing is promoted to seed data or seeded as a
`verified: true` `Thing` until a human has actually reviewed and corrected
the staging output (category/`thingTypeId`/severity assignment is
deliberately left to that review step, not inferred by the script) and
copied it to `data/seed/source/vetmeds-toxins.json`. Both files are
**gitignored, not committed** — same reasoning as the ASPCA dataset above:
this is vetmeds.org's copyrighted clinical content, and redistributing it
under this repo's license isn't something to do without their sign-off.

`data/seed/src/run.ts` loads `vetmeds-toxins.json` optionally — a
contributor without that (gitignored) file can still run `seed:local`
using just the datasets above.

## Expanding coverage

Deliberately **not** proposing broad automated scraping here — most veterinary/poison-control
sites have terms of service around reuse, and scraped data needs a human to sanity-check
before it reaches a "this might hurt your pet" database. Candidate sources to manually
review and curate from, same pattern as the current dataset (attribute the source, keep the
disclaimer, respect robots.txt/ToS):

- Pet Poison Helpline's toxin list (foods, plants, household chemicals)
- ASPCA's cat-specific toxic plant list (current dataset is dog-focused)
- CPSC recall database, filtered for pet toys/products
- FDA pet food and pet medication recalls
- Manufacturer safety notices for collars/harnesses/leashes (less standardized — likely
  needs case-by-case sourcing rather than a single feed)

## Community contributions feed the same pipeline

Once approved (see [verification-flow.md](verification-flow.md)), a contribution becomes a
regular `Thing` with `source` set to `contributor:<id>` instead of a citation — same shape,
same table, same search index. No separate "user-generated" tier.

# Day plan revamp, Plan 1: the shape and the area map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the ground the new engine and the Saturday sweep both stand on: a centre point for every Home area with distance and travel time, the tables for places, the activities each place offers and content items, the new activity fields on today's 29 Catalogue items, and a read-only `bestie-3` baseline query.

**Architecture:** A pure `areas.ts` module (no I/O) gives centres, distance and travel time. One additive migration adds `places`, `place_activities` and `content_items`, plus new columns on `catalogue_items` and `suggestions`, all locked to the edge function's `service_role`. The new activity fields live in `catalogueSeed.ts` beside today's seed, and a generated `update` sets them on the 29 rows. `bestie-3` keeps running unchanged: nothing here changes a plan, and the fingerprint test proves it.

**Tech Stack:** TypeScript, Vitest (`npx -y pnpm@10.34.3 test`), Postgres 17 twin (`bash supabase/twin/run.sh`, needs Docker), Supabase migrations.

**Spec:** `docs/superpowers/specs/2026-11-22-day-plan-revamp-design.md` (sections 1, 2 and 5, step 1). Plan 2 (engine `bestie-4`) and Plan 3 (Saturday sweep, after the Admin scoping) follow.

## Global Constraints

- **Live is shared.** Supabase `lemtlurqzmjdahbhunhz` and the `server` function serve staging and production. Nothing is applied, deployed or merged without Khairul's yes. A read-only preflight on live comes before any apply.
- **Start from `main`** after the Ren-approval branch (`chore/74-ren-approves-lines`, migration `20261122000100`) has merged. Work on a new branch, `feat/day-plan-foundation`.
- **Additive only.** No existing column changes meaning. `bestie-3` plans must stay byte-identical (`catalogueSeed.test.ts` FINGERPRINTS stay as they are, and no new engine version).
- **Locked tables.** New tables: `revoke all ... from public, anon, authenticated`, `grant all ... to service_role`, RLS enabled and forced, no `authenticated` policy. Members reach places only through the edge function. (Gotcha `a-default-grant-ships-the-table-open`.)
- **Source-neutral storage.** `places.source` is `'google' | 'foursquare' | 'manual'`. The existing rule "Google place IDs only, never copied Google data" (schema comment on `catalogue_items`) still holds. If Plan 3 picks Google, only `source_id` is kept long-term and the rest is re-fetched within Google's caching limit. `fetched_at` exists for that.
- **Distances:** straight-line from the area centre. **Travel:** `max(10, round(3 × km))` minutes, each way. **"Within" means ≤ 5 km.**
- **Migration file names:** `supabase/migrations/20261122000200_bestie_places.sql` and `20261122000300_bestie_catalogue_shape.sql`.

## Review Focus

1. **A Member's area is "Somewhere else" or unknown.** `centreOf` returns `null`, and distance helpers never return `NaN` or throw. Pinned in Task 1.
2. **The sweep finds the same venue twice.** `unique (source, source_id)` refuses the second row. Pinned in Task 2.
3. **A price range written backwards** (min > max), or negative. Refused by checks. Pinned in Task 2.
4. **A signed-in Member queries the new tables directly.** She reads nothing and writes nothing. Pinned in Task 2.
5. **A place is deleted.** Its `place_activities` rows go with it, the Catalogue item stays, and a Suggestion that showed it keeps its row. Pinned in Task 2.

---

### Task 1: The area map

**Files:**
- Create: `supabase/functions/server/areas.ts`
- Test: `supabase/functions/server/areas.test.ts`

**Interfaces:**
- Consumes: `HOME_AREAS` from `./join.ts`
- Produces:
  - `type LatLng = { lat: number; lng: number }`
  - `AREA_CENTRES: Readonly<Record<Exclude<HomeArea, 'Somewhere else'>, LatLng>>` (`HomeArea = (typeof HOME_AREAS)[number]`)
  - `centreOf(area: string): LatLng | null`
  - `distanceKm(a: LatLng, b: LatLng): number` (haversine, Earth radius 6371 km)
  - `travelMin(km: number): number` (one way)
  - `NEARBY_KM = 5`

- [ ] **Step 1: Write the failing tests** in `areas.test.ts`:
  - `every Home area except "Somewhere else" has a centre`: `Object.keys(AREA_CENTRES).sort()` equals `HOME_AREAS.filter(a => a !== 'Somewhere else').sort()`.
  - `every centre is inside Dubai`: each `lat` within 24.75–25.40 and `lng` within 54.90–55.65.
  - `Dubai Marina to JBR is within 5 km, and to Deira is not`: `distanceKm(centreOf('Dubai Marina')!, centreOf('Jumeirah Beach Residence (JBR)')!) < NEARBY_KM`, and Marina to `'Deira'` is `> 20`.
  - `distance is symmetric and zero to itself`.
  - `travel time`: `travelMin(0) === 10`, `travelMin(0.5) === 10`, `travelMin(5) === 15`, `travelMin(12) === 36`.
  - `unknown areas have no centre` (Review Focus 1): `centreOf('Somewhere else') === null`, `centreOf('Atlantis') === null`.

- [ ] **Step 2: Run** `npx -y pnpm@10.34.3 vitest run supabase/functions/server/areas.test.ts`. Expected: FAIL, cannot find `./areas`.

- [ ] **Step 3: Implement `areas.ts`.** The centres are approximate neighbourhood middles, for Khairul to check on a map:

```ts
'Al Barsha': { lat: 25.113, lng: 55.200 }, 'Al Furjan': { lat: 25.027, lng: 55.150 }, 'Al Quoz': { lat: 25.140, lng: 55.230 },
'Al Sufouh': { lat: 25.100, lng: 55.160 }, 'Al Wasl / City Walk': { lat: 25.205, lng: 55.260 }, 'Arabian Ranches': { lat: 25.055, lng: 55.270 },
'Bluewaters': { lat: 25.080, lng: 55.120 }, 'Bur Dubai': { lat: 25.253, lng: 55.295 }, 'Business Bay': { lat: 25.186, lng: 55.265 },
'DAMAC Hills': { lat: 25.025, lng: 55.250 }, 'Deira': { lat: 25.270, lng: 55.320 }, 'DIFC': { lat: 25.212, lng: 55.280 },
'Discovery Gardens': { lat: 25.040, lng: 55.140 }, 'Downtown Dubai': { lat: 25.195, lng: 55.275 }, 'Dubai Creek Harbour': { lat: 25.200, lng: 55.345 },
'Dubai Hills Estate': { lat: 25.110, lng: 55.245 }, 'Dubai Marina': { lat: 25.080, lng: 55.140 }, 'Dubai Silicon Oasis': { lat: 25.125, lng: 55.385 },
'Dubai South': { lat: 24.890, lng: 55.160 }, 'Dubai Sports City': { lat: 25.040, lng: 55.220 }, 'Emirates Hills': { lat: 25.070, lng: 55.170 },
'Jumeirah': { lat: 25.210, lng: 55.250 }, 'Jumeirah Beach Residence (JBR)': { lat: 25.078, lng: 55.134 }, 'Jumeirah Lake Towers (JLT)': { lat: 25.070, lng: 55.145 },
'Jumeirah Village Circle (JVC)': { lat: 25.060, lng: 55.210 }, 'Jumeirah Village Triangle (JVT)': { lat: 25.045, lng: 55.190 }, 'Karama': { lat: 25.245, lng: 55.305 },
'Meydan': { lat: 25.160, lng: 55.300 }, 'Mirdif': { lat: 25.220, lng: 55.420 }, 'Motor City': { lat: 25.045, lng: 55.240 },
'Palm Jumeirah': { lat: 25.115, lng: 55.140 }, 'The Greens & The Views': { lat: 25.095, lng: 55.175 }, 'The Springs / Meadows / Lakes': { lat: 25.065, lng: 55.160 },
'Town Square': { lat: 25.015, lng: 55.290 }, 'Umm Suqeim': { lat: 25.145, lng: 55.200 },
```

`travelMin(km) = Math.max(10, Math.round(3 * km))`.

- [ ] **Step 4: Run** the same command. Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/server/areas.ts supabase/functions/server/areas.test.ts
git commit -m "feat(day-plan): a centre for every Home area, distance and travel time"
```

---

### Task 2: Places, place activities and content items (schema)

**Files:**
- Create: `supabase/migrations/20261122000200_bestie_places.sql`
- Create: `supabase/tests/places.test.sql` (same `pg_temp.check` / `pg_temp.raises` helpers as `supabase/tests/morning_lines.test.sql`, ending `\echo PLACES TESTS PASSED`)

**Interfaces:**
- Produces (Postgres, schema `bestie`):
  - `places (id uuid pk default gen_random_uuid(), source text not null check in ('google','foursquare','manual'), source_id text not null, name text not null check (char_length(btrim(name)) between 1 and 200), lat numeric(9,6) not null check (lat between -90 and 90), lng numeric(9,6) not null check (lng between -180 and 180), area text, website text, source_url text, status text not null default 'pending' check in ('pending','approved','rejected','closed'), fetched_at timestamptz not null default now(), approved_at timestamptz, approved_by uuid references auth.users(id) on delete set null, created_at, updated_at, unique (source, source_id))`, with an index on `(status, area)`
  - `place_activities (place_id uuid references places on delete cascade, catalogue_item_id uuid references catalogue_items on delete cascade, price_min_aed numeric(8,2) not null check (>= 0), price_max_aed numeric(8,2) not null, duration_min integer check (> 0), evidence_url text, updated_at timestamptz not null default now(), primary key (place_id, catalogue_item_id), check (price_max_aed >= price_min_aed))`, with an index on `catalogue_item_id`
  - `content_items (id uuid pk, catalogue_item_id uuid not null references catalogue_items on delete cascade, source text not null check in ('youtube','podcast_index','apple_podcasts','recipe_api','manual'), source_id text not null, title text not null, url text not null, duration_min integer check (> 0), tags text[] not null default '{}', screen text not null default 'held' check in ('passed','held'), screen_reason text, published_at timestamptz, created_at, unique (source, source_id))`
  - `catalogue_items` gains `needs_place boolean not null default false`, `intensity smallint not null default 1 check (intensity between 1 and 3)`, `time_note text check (char_length(time_note) <= 60)`, `ends_on date`, `place_id uuid references places on delete set null` (an event's own venue)
  - `suggestions` gains `content_item_id uuid references content_items on delete set null` and `places_shown uuid[] not null default '{}'` (the places shown, in order, for the audit; no foreign key, so deleting a place never touches a Suggestion)
  - No `updated_at` trigger: the schema has none, and the writer (the sweep, in Plan 3) sets `updated_at = now()` itself, as the other tables do
- Privileges and RLS as in Global Constraints, for the three new tables.

- [ ] **Step 1: Write the failing twin test** `places.test.sql`, as `service_role` unless stated:
  - an approved place with one activity at AED 90–150 inserts;
  - `pg_temp.raises`: a second place with the same `(source, source_id)` (Review Focus 2);
  - `pg_temp.raises`: a `price_max_aed` below `price_min_aed`, and a negative `price_min_aed` (Review Focus 3);
  - `pg_temp.raises`: `status = 'live'`, and `source = 'tripadvisor'`;
  - a content item defaults to `screen = 'held'`;
  - `catalogue_items` defaults: `needs_place = false`, `intensity = 1`;
  - Review Focus 4, in `set local role authenticated` with a Member's `request.jwt.claim.sub`: `select count(*)` from each new table returns 0 rows, and `not has_table_privilege('bestie.places', 'insert')`;
  - Review Focus 5: a Suggestion with `places_shown = array[<place id>]`; delete the place; its `place_activities` row is gone, the `catalogue_items` row and the Suggestion are still there, and `places_shown` is unchanged.

- [ ] **Step 2: Run** `bash supabase/twin/run.sh`. Expected: FAIL in `places.test.sql` (relation `bestie.places` does not exist).

- [ ] **Step 3: Write the migration** `20261122000200_bestie_places.sql` to the Interfaces block. Header comment: Day plan revamp (spec 2026-11-22). Additive only; `bestie-3` reads none of it.

- [ ] **Step 4: Run** `bash supabase/twin/run.sh`. Expected: every suite PASSED, including `PLACES TESTS PASSED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261122000200_bestie_places.sql supabase/tests/places.test.sql
git commit -m "feat(day-plan): places, place activities and content items, locked to the function"
```

---

### Task 3: Today's 29 items get their activity fields

**Files:**
- Modify: `supabase/functions/server/catalogueSeed.ts` (`SeedItem`, the `item(...)` helper's `extra`, `CATALOGUE_SEED`, a new `catalogueShapeSql()`)
- Modify: `supabase/functions/server/index.tsx:8536-8548` (`catalogue(city)` reads the new columns)
- Create: `supabase/migrations/20261122000300_bestie_catalogue_shape.sql`
- Test: `supabase/functions/server/catalogueSeed.test.ts`, `supabase/tests/places.test.sql`

**Interfaces:**
- Consumes: the columns from Task 2.
- Produces:
  - `SeedItem` gains `needsPlace: boolean`, `intensity: 1 | 2 | 3`, `timeNote: string | null` and `endsOn: string | null`. Defaults: `false`, `1`, `null`, `null`. `CatalogueItem` inherits them.
  - `catalogueShapeSql(): string`: one `update bestie.catalogue_items set needs_place = …, intensity = … where slug = '…';` per seed item, in seed order.
  - `postgresBestieStore.catalogue(city)` maps `needs_place → needsPlace`, `intensity`, `time_note → timeNote`, and `ends_on → endsOn` (read as `to_char(ends_on, 'YYYY-MM-DD')`; see `storeSql.test.ts` on dates).

The values, from the spec ("items like yoga, massage and reformer are marked as needing a place"):

| `needsPlace: true` | `hotclass reformer strength swim yoga sauna soundbath massage spaday bowl brunch lunch juice` (13) |
|---|---|
| `intensity: 3` | `hotclass strength runclub` |
| `intensity: 2` | `matpilates reformer swim` |
| `intensity: 1` | every other item |

`catalogueSeedSql()` **does not change**. The old seed migration is already applied.

- [ ] **Step 1: Write the failing tests** in `catalogueSeed.test.ts`:
  - `the shape migration sets exactly the seed's activity fields`: the `_bestie_catalogue_shape.sql` migration `toContain(catalogueShapeSql())`.
  - `13 items need a place, and no light version does`: `CATALOGUE_SEED.filter(i => i.needsPlace).map(i => i.slug).sort()` equals the 13 slugs above, sorted, and `CATALOGUE_SEED.some(i => i.light && i.needsPlace) === false`.
  - `intensity is 3 for hotclass, strength and runclub, 2 for matpilates, reformer and swim, else 1`.
  - The existing FINGERPRINTS test still passes untouched (`bestie-3` unchanged).
  - In `storeSql.test.ts`: `src` contains `to_char(ends_on, 'YYYY-MM-DD') as ends_on`.

- [ ] **Step 2: Run** `npx -y pnpm@10.34.3 test`. Expected: FAIL (no shape migration, no `needsPlace`).

- [ ] **Step 3: Implement** the `SeedItem` fields and the values, `catalogueShapeSql()` (same quoting helpers as `catalogueSeedSql`), the migration file (a header comment, then the generated statements), and the store read.

- [ ] **Step 4: Add to `places.test.sql`:** after the migrations, `select count(*) from bestie.catalogue_items where needs_place` = 13, and `intensity = 3` for `hotclass`.

- [ ] **Step 5: Run** `npx -y pnpm@10.34.3 test` and `bash supabase/twin/run.sh`. Expected: all Vitest tests pass (the FINGERPRINTS unchanged), and every twin suite PASSED.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/server/catalogueSeed.ts supabase/functions/server/catalogueSeed.test.ts supabase/functions/server/index.tsx supabase/functions/server/storeSql.test.ts supabase/migrations/20261122000300_bestie_catalogue_shape.sql supabase/tests/places.test.sql
git commit -m "feat(day-plan): today's 29 items get needs-place and intensity"
```

---

### Task 4: The `bestie-3` baseline

**Files:**
- Create: `supabase/queries/engine_baseline.sql`
- Test: `supabase/tests/engine_baseline.test.sql`
- Modify: `docs/superpowers/specs/2026-11-22-day-plan-revamp-design.md` (record the numbers under "What success looks like")

**Interfaces:**
- Produces: a read-only query returning one row per `engine_version`, with the columns `suggestions`, `completion_rate`, `swap_rate`, `skip_rate` and `members`.
  - Rates are shares of Suggestions whose outcome is `completed`, `swapped` or `skipped`, out of all Suggestions not `replaced` or `not_picked`.
  - Rounded to 3 decimals.
  - Only `member_id is not null`.
  - Excluding the known test Member `0b931b9c…` (match on the id prefix).

- [ ] **Step 1: Write the failing twin test** `engine_baseline.test.sql`. Insert fixtures for 4 Suggestions in `bestie-3`, outcomes `completed, swapped, skipped, shown`. Run the query file's statement through `\i supabase/queries/engine_baseline.sql` into a temp table. Check `completion_rate = 0.25`, `swap_rate = 0.25`, `skip_rate = 0.25`, `suggestions = 4`.

- [ ] **Step 2: Run** `bash supabase/twin/run.sh`. Expected: FAIL (the file doesn't exist).

- [ ] **Step 3: Write** `engine_baseline.sql`, a single `select` with no writes.

- [ ] **Step 4: Run** `bash supabase/twin/run.sh`. Expected: PASS.

- [ ] **Step 5: With Khairul's yes,** run it read-only on `lemtlurqzmjdahbhunhz`, inside `begin read only; … rollback;`. Write the row for `bestie-3`, with the date, into the spec.

- [ ] **Step 6: Commit**

```bash
git add supabase/queries/engine_baseline.sql supabase/tests/engine_baseline.test.sql docs/superpowers/specs/2026-11-22-day-plan-revamp-design.md
git commit -m "feat(day-plan): bestie-3 baseline: completion, swap and skip rates"
```

---

### Release (after all tasks, each step only with Khairul's yes)

1. A PR from `feat/day-plan-foundation` to `main`.
2. A read-only preflight on `lemtlurqzmjdahbhunhz`:
   - the last migration applied is `bestie_daily_lines_ren_approved`;
   - `bestie.places` does not exist yet;
   - `catalogue_items` has 29 rows with `slug`.
3. Apply `bestie_places`, then `bestie_catalogue_shape`.
4. Check that live matches the twin (column lists and the 13 `needs_place` rows).
5. Merge. Redeploying `server` isn't needed, since `bestie-3` ignores the new fields. But `catalogue()` now selects the new columns, so any later deploy of `server` from `main` must come **after** these migrations are on live, never before, or every Check-in fails.

---

## Carried forward (from the reviews, 2026-11-22)

**For Plan 2 (engine `bestie-4`):**
- "Nearby" is `<= NEARBY_KM` (5 km). The `NEARBY_KM` comment in `areas.ts` says "closer than"; fix the comment and add a known-value `distanceKm` check (1° of latitude ≈ 111.19 km).
- postgres.js returns `numeric` as a string: read `lat`, `lng`, `price_min_aed`, `price_max_aed` with `::float8`, as `cost_aed` is.
- The `(status, area)` index on `places` won't serve a 5 km radius search that crosses areas. Use a bounding-box prefilter on `lat`/`lng` (or an index for it).
- `catalogue()` now returns only `status = 'approved'` rows with no past `ends_on`. Keep that gate in the new engine.

**For Plan 3 (Saturday sweep, after the Admin scoping):**
- Opening hours aren't stored yet. Add them once the source is chosen and its caching terms are known.
- If the source is Google: `name`, `lat` and `lng` are `not null` on `places`, and expiring them means deleting the row, which cascades away the venue-site prices in `place_activities`. Re-check the shape against the chosen source's terms first.
- `content_items.fetched_at` exists for refresh or expiry within each source's limit (YouTube: 30 days).

**Release checks to add (Plan 1):**
- **Before the apply:** `select defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl from pg_default_acl;`
- **After the apply:** `information_schema.role_table_grants` for the three new tables. Expect only `postgres` and `service_role`.
- **Deploy order:** `catalogue()` selects the new columns. Deploying `server` (`make-server-a278ea32`) before the migrations breaks Check-in, swap, complete and the journal.

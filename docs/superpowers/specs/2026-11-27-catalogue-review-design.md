# Catalogue review: the data shape (design)

**Date:** 2026-11-27 · **Status:** draft, awaiting Khairul's approval · **Part of:** #100 piece 4 (Admin Catalogue), ahead of the Saturday sweep (day plan revamp, step 2)
**Builds on:** `2026-11-22-day-plan-revamp-design.md` (the Catalogue, places and engine `bestie-4`) and `2026-11-22-admin-revamp-design.md` (Admin Home and tiles). Where this document changes either, it says so.

## Intent

The Catalogue is the one list Bestie suggests from. The Saturday sweep finds candidates across Dubai (places, events, recipes, podcasts, videos). Admin approves them, and Bestie picks from the approved ones for each Check-in. Nothing a Member sees skips Admin.

Ren's main job on the Catalogue tile is **the weekly review of what the sweep found** (Khairul, 2026-11-27). Adding and fixing things by hand is the secondary path. This document settles **what the data must hold** so that review works: one card per find, from which she can decide without leaving Admin.

The Admin screen's look and flow are a later design pass. This document is only the shape, plus the two engine rules that came out of the same conversation.

## What Ren decides on (Khairul, 2026-11-27)

- **She looks at photos, price, location and reviews.**
- **Her judgement is about women-friendliness and how the place feels,** not the star rating. New places may have few or no reviews, so **no find is filtered out on rating or review count.** Every find reaches her.
- **Places to eat are in the Catalogue too,** not only home meals. A café or restaurant is a place offering Meal activities (today's `bowl`, `brunch`, `lunch`, `juice` already need a place). Bestie looks for places with:
  - **healthy options**: the sweep searches for kinds of place likely to fit (salad and poke bars, juice bars, cafés with bowls, brunch spots), reads the venue's own menu, and records why it thinks the place fits;
  - **good ambience** and **women-friendly**: Ren's judgement, as for studios;
  - **within her budget**: decided by the engine per Check-in, from the stored per-person price range.

## Goals

- A **review card per find** with: photos, the activities it offers with an AED range each and a link to where the price came from, a small map with the distance from the nearest Home area centre, "how it feels" (signals from the venue's own site, and reviews mentioning women, comfort, staff or atmosphere shown first), and three actions: **Approve**, **Edit, then approve**, **Reject**.
- **Approval per activity, not only per place.** A studio found for reformer may also list mat Pilates at a different price. She can trust one listing and not the other.
- **A one-tap reason on Reject.** Later this can teach the sweep what to skip.
- **Every decision and every Saturday run is logged,** so a bad run can be seen and undone (the 11-22 design's sweep step 6), and nothing about who decided what is lost when a row changes.

## Non-goals

- **Filtering finds on star rating or review count.**
- **Star ratings anywhere in the engine** (unchanged from 11-22). Ren reads reviews to make her own call. The rating never reaches ranking or Members.
- **Storing photos or reviews.** They are fetched live when the card is shown (see Constraints).
- **Teaching the sweep from reject reasons.** The reasons are recorded now. Using them is later.
- **The Admin screen's layout and flow.** That's the next design pass.

## Anti-goals (a failure even if it works)

- A `pending` or `rejected` find reaching a Member.
- A rejection that erases why it was rejected, or who rejected it.
- A bad Saturday run that can't be told apart from good data, or undone.
- Member-facing words like "healthy", "clean" or "guilt-free" on a place to eat. The card shows the dish ("Salmon & greens bowl"), not a judgement about it (voice rules).
- Storing a source's data longer than its terms allow.

## Constraints

- **Live is shared.** Supabase `lemtlurqzmjdahbhunhz` serves staging and production. Every migration is additive, and nothing is applied or deployed without Khairul's yes.
- **Admin goes through the `admin` edge function** (ADR-0002, admin revamp design). The new tables stay locked to `service_role`, like `places`, `place_activities` and `content_items` today.
- **Google's terms on stored data.** Google's terms allow keeping a place ID, and they limit how long latitude and longitude may be kept (30 days in the versions found on 2026-11-27). No version found addresses photos or reviews. This design stores none of them: photos and reviews are fetched live by the review card through the `admin` function. **A Google-sourced place's stored lat/lng must be refreshed within the allowed window**, which the weekly sweep does. The builder confirms the current Places API wording before the sweep ships, and whether name and hours fall under the same limit. **The places source is Google Places** (Khairul, 2026-11-27), for its Dubai coverage and the reviews Ren reads. It needs a Places API key with billing on Khairul's Google account. Setting that up is his step, and it isn't needed until the screen ships with live photos and reviews (build step 2). The `foursquare` value stays allowed in `places.source`, unused.
- **Today's data stays valid.** The 29 items and their IDs, the `places` columns from #104, and the engine `bestie-3` are untouched. The FINGERPRINTS test stays unchanged.

## Approaches (picked: C)

| | Approach | Trade-off |
|---|---|---|
| A | Add columns to the existing tables. Finds go straight into `places`, `place_activities` and `catalogue_items` as `pending`. | Fewest changes, and it's the pattern already live. But a rejection overwrites the row, so there's no history of who decided or why, and undoing a bad run means guessing which rows it touched. |
| B | A separate `sweep_finds` inbox. Approving copies a find into the real tables. | The live Catalogue stays clean, and a bad run is easy to throw away. But every find exists twice, edits happen on the copy, and the promote step can drift from the real tables. |
| **C (chosen)** | A, plus two small log tables: one row per **Saturday run** and one row per **review decision**. | Builds on what's live. The engine already ignores anything not approved. The log gives undo-a-run and keeps the reject reasons. |

Khairul picked **C** (2026-11-27).

## The design

### 1. What a find is

A **find** is anything a Saturday run adds or changes that needs Ren's yes:
- **a new place**, with the activities it offers (`places` + `place_activities`);
- **a new activity offered by an approved place** (one `place_activities` row);
- **a new event or social activity** (a `catalogue_items` row, tied to its place by `place_id`).

**Not finds:** content items (recipes, podcasts, videos) go live after the automatic screen. Only `held` ones show in Admin, to release or remove (11-22, unchanged). Updates to an approved place's hours, prices or closure apply without review (11-22, unchanged), but they are logged as changes from that run.

### 2. Additions to existing tables

**`bestie.places`**
- `opening_hours jsonb`: the source's weekly hours, so the card shows them and the engine can later drop closed places. Nullable. It is re-fetched each run, within the source's storage terms.
- `run_id uuid` → `catalogue_runs(id)`: the run that first found it. Null for `manual`.
- `last_run_id uuid` → `catalogue_runs(id)`: the last run that changed it.
- `reviewed_at`, `reviewed_by`: the latest decision. `approved_at` and `approved_by` stay as they are, so nothing reading them breaks.

**`bestie.place_activities`**
- `status text`: `pending`, `approved` or `rejected`, default `pending`. It is set to `approved` for any rows that exist when the migration runs (none are expected).
- `run_id uuid` → `catalogue_runs(id)`.
- Price meaning: `price_min_aed` and `price_max_aed` are **per person**. For Meal activities that is one person's meal. For classes it is one session. No column change, only a comment on the columns.

**`bestie.catalogue_items`** (events and social activities found by the sweep)
- `source_url text`: where the event was found.
- `run_id uuid` → `catalogue_runs(id)`. Null for the 29 seed items and anything added by hand.

**`bestie.content_items`**: `screen` gains the value `removed` (see §8).

### 3. "Why it fits" signals: `bestie.place_signals`

One row per thing the sweep found that bears on Ren's judgement:

| Column | Meaning |
|---|---|
| `id uuid` | |
| `place_id uuid` → `places(id)`, cascade | |
| `kind text` | `women_friendly` (ladies-only hours, women-only classes, a family section), `menu_fit` (dishes that fit, for places to eat), `ambience` |
| `text text` | A short line, at most 140 characters: "Ladies-only classes on weekday mornings", "Salmon & greens bowl, AED 58" |
| `evidence_url text` | Where it was found, always the venue's own site or the source's page. Required. |
| `run_id uuid` → `catalogue_runs(id)` | |
| `created_at` | |

Signals come only from what we may store, meaning the venue's own website, read as a normal visitor. They are **never summaries of Google reviews**. They are shown to Ren only, never to Members.

### 4. The logs

**`bestie.catalogue_runs`**: one row per Saturday run (or manual re-run).

| Column | Meaning |
|---|---|
| `id uuid` | |
| `started_at`, `finished_at` | |
| `status text` | `running`, `done`, `failed` or `undone` |
| `model text` | The model used for tagging, so runs can be compared |
| `counts jsonb` | Per kind: found, changed, closed, held, failed |
| `error text` | For a failed run |

**Undoing a run** is done in the `admin` function, never by hand in SQL:
- every find from that run that's still `pending` becomes `rejected`, with reason `bad_run`;
- the run is marked `undone`.

Approved finds and applied updates stay as they are. Rolling back an applied update needs the previous values, so **the run logs each update's old and new values** in `catalogue_changes` (below).

**`bestie.catalogue_changes`**: one row per automatic update the run applied to an approved place without review.

| Column | Meaning |
|---|---|
| `id uuid`, `run_id uuid` → `catalogue_runs(id)` | |
| `place_id uuid` → `places(id)` | |
| `catalogue_item_id uuid` | Null when the change is to the place itself |
| `field text`, `old_value jsonb`, `new_value jsonb` | |
| `created_at` | |

**`bestie.catalogue_reviews`**: one row per decision Ren makes. It is append-only.

| Column | Meaning |
|---|---|
| `id uuid` | |
| `target text` | `place`, `place_activity`, `event` or `content` |
| `place_id`, `catalogue_item_id`, `content_item_id` | Whichever the target needs. A check enforces the right ones per target. |
| `decision text` | `approved`, `edited_approved`, `rejected`, `released` or `removed` |
| `reason text` | Required when rejected: `not_women_friendly`, `doesnt_feel_right`, `too_far`, `wrong_price`, `closed`, `duplicate`, `not_a_fit`, `bad_run` or `other` |
| `note text` | Optional, at most 280 characters |
| `edits jsonb` | For `edited_approved`: field → old and new |
| `run_id uuid` | The run that produced the find |
| `decided_by uuid` (a plain id with no foreign key, like `team_changes`, so deleting an admin never touches this append-only log); `decided_at` | |

A decision writes its log row and changes the target's `status` **in one transaction**.

### 5. What the engine reads

- **A place is usable** when `places.status = 'approved'`.
- **An activity at a place is usable** when `place_activities.status = 'approved'` **and** its place is usable.
- **An event is usable** when `catalogue_items.status = 'approved'` and `ends_on` hasn't passed (as today).

Pending and rejected rows are invisible to the engine and to Members.

### 6. The radius rule (changes the 11-22 design)

The 11-22 design fixes places at **within 5 km** of her area's centre. Khairul kept 5 km as the default and widened it for long days (2026-11-27):

| Her Check-in time | Places counted from her area's centre |
|---|---|
| Under 240 minutes (30 min, 1 hr, 2 hrs, or exact minutes under 240) | **5 km** (unchanged) |
| **Half day** (240 minutes) up to the Whole day chip | **15 km** |
| **Whole day** (a new Check-in chip, 480 minutes) or more | **All of Dubai** |

- Travel (both ways) still counts against her time in every case, so a far place only fits when the trip and the activity both fit.
- Places are shown nearest first, as before.
- Thresholds and radii live in one constant in `areas.ts`, next to `NEARBY_KM`, and are part of the places engine (see below).
- **The travel estimate** (3 min per km, at least 10 minutes) is fine inside 5 km, but too slow across Dubai: about 75 minutes each way from the Marina to Downtown. Before the widened radius ships, it needs a better estimate for longer trips. The builder proposes one, for example a lower minutes-per-km past 5 km, and checks it against a handful of real drive times.
- **The Whole day chip** is added to `TIME_CHIPS` (`src/app/wellness/bestie/engine.ts`) and the Check-in screen. Copy: "Whole day".

This rule ships with the places engine, not with the Catalogue screen. **Engine version:** `bestie-4` is already taken by the live #102 engine (`BESTIE_ENGINE_VERSION`), so the places engine from the 11-22 design becomes **`bestie-5`**, and the Whole day chip ships with it. Today's engine never sees a 480-minute chip. *(My call: the 11-22 name was written before #102 shipped.)* It's recorded here because it was decided here.

### 7. Meal places in the sweep

- The sweep searches for places to eat by kind (salad and poke bars, juice bars, cafés serving bowls, brunch spots), per area, like other place-needing activities.
- It reads the venue's own menu for per-person prices and dishes that fit, and writes `menu_fit` signals with the menu link.
- **It skips places whose cheapest fitting dish is above AED 300 per person.** It's one constant, tunable.
- A place to eat is offered to Ren with its Meal activities (for example "Slow brunch", "Healthy grain or poke bowl"), each with its own per-person range and status.

### 8. Rules the builder check settled (my calls, 2026-11-27)

- **The sweep attaches places only to existing activities.** It never creates a new activity kind. "Slow brunch" and "Healthy grain or poke bowl" are today's `brunch` and `bowl`. Events and social activities are the exception: each one is a new `catalogue_items` row with `run_id` set. The 29 seed items are never touched.
- **Approving a new place is one tap that covers several rows.** The card lists its activities, all ticked. Ren can untick any she doesn't trust. Approve writes:
  - one `catalogue_reviews` row for the place;
  - one row for each activity, approved or rejected;
  - all in one transaction.

  A place needs at least one approved activity. If she unticks them all, the button becomes Reject. "Edit, then approve" can change the name, the area, each activity's price range and duration, and the signals' text.
- **Content gets a third screen value.** `content_items.screen` gains `removed`, alongside `passed` and `held`. Release sets `passed`, and Remove sets `removed`. The row is never deleted, so the log keeps pointing at it. *(This replaces "no change" for `content_items` in §2.)*
- **When the sweep finds a rejected place again:**
  - it stays rejected quietly, and its source fields are refreshed;
  - if the rejection reason was `bad_run`, it goes back to `pending`;
  - if it was rejected as `closed` and the source now reports it open, it also goes back to `pending`.
- **Undoing a run also rolls back the updates it applied.** It puts back each `catalogue_changes` old value, including any place the run marked `closed`, as long as the field hasn't changed since. If it has, that field is left and listed in the undo result.
- **Stored data past its time limit.** `places.lat` and `places.lng` become nullable, with a check that an `approved` place has both.
  - When a Google-sourced place's position is older than the allowed window and wasn't refreshed (rejected, pending, closed, missed by the source, or a failed run), a daily job clears `lat`, `lng` and any other field the terms limit.
  - It keeps `source_id` and the row.
  - An approved place whose position was cleared drops out of the engine until the next run refreshes it.
  - Rows are never deleted, so the logs' foreign keys stay plain references.

## What this build covers (my call)

**This build: the migrations, plus the `admin` routes that write decisions and undo a run**, with their Postgres-twin and Vitest tests. That's enough to test that a decision and its log row land together.

**Next, in order:**
1. The Admin Catalogue screen design.
2. The screen, together with the live photos-and-reviews route. That route needs a Places API key with billing (see the open question).
3. The Saturday sweep.
4. The places engine `bestie-5`, with the radius rule and the Whole day chip.

## Left to the builder

- Migration file names and order. The new tables must exist before the column references to them. Everything stays additive, with `lock_timeout` as in #104.
- Indexes, for example `status` on `place_activities` and `run_id` on each table.
- The exact JSON shape of `opening_hours` (follow the source's shape).
- The `admin` function routes for the review list, decisions, live photos and reviews, and undoing a run. Their shape comes from the screen design.
- Postgres-twin tests, in the style of #104: locked to `service_role`, the check on `catalogue_reviews` targets, and a decision with its log row being atomic.

## Related decisions

- 11-22: the Catalogue, places, the engine and the sweep (`2026-11-22-day-plan-revamp-design.md`).
- 11-22: Admin Home, with Catalogue as piece 4 (`2026-11-22-admin-revamp-design.md`).
- 11-27 (this document): Ren reviews mostly sweep finds; judgement over rating; places to eat; approach C; the radius widens for Half day and Whole day.

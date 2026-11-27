# Catalogue review, step 1: the data and the decision routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The database and the `admin` function can record Ren's decisions on the Saturday sweep's finds (approve, edit then approve, reject with a reason, release or remove held content) and can undo a whole run. Every decision is logged in the same transaction as the change it makes.

**Architecture:**
- **Database:** one additive migration, with new columns on `places`, `place_activities`, `catalogue_items` and `content_items`; the new tables `catalogue_runs`, `catalogue_changes`, `catalogue_reviews` (append-only) and `place_signals`; and five `plpgsql` functions that do each decision or undo in one call. All of it is locked to `service_role`.
- **`admin` function:** new routes under `/admin/catalogue/`. A Deno-free `catalogue.ts` validates bodies and maps results to answers, and vitest drives it. `index.tsx` calls the SQL functions through `asServiceRole`.
- **Not touched:** `supabase/functions/server/` (the engine `bestie-4` ignores the new statuses because it already reads only approved rows), the site, the review list and screen (they come from the screen design, step 2), and the daily job that clears expired positions (spec §8; it ships with the sweep, because until then no place comes from Google).

**Tech Stack:** Postgres 17 twin (`bash supabase/twin/run.sh`, needs Docker); Deno edge function with Hono and `npm:postgres@3.4.5`; Vitest (`npx -y pnpm@10.34.3 test`).

**Spec:** `docs/superpowers/specs/2026-11-27-catalogue-review-design.md` (approved by Khairul, 2026-11-27; vault DEC-023). This plan covers §2, §3, §4 and §8 and the "What this build covers" step. Sections §6 (radius) and §7 (meal search) belong to later plans.

## Global Constraints

- **Live is shared.** `lemtlurqzmjdahbhunhz` and the `admin` function serve staging and production. **Nothing is applied, deployed, pushed or merged without Khairul's yes.** A read-only preflight on live comes before any apply.
- **Branch:** `feat/catalogue-review` (the design is committed there as `824ff70`).
- **Additive only.** Two changes loosen existing rules and add none: `places.lat` and `lng` become nullable, and `content_items.screen` gains `removed`. No existing row changes value, except that `place_activities.status` is set to `'approved'` on rows that exist when the migration runs. `bestie-3` and `bestie-4` plans stay byte-identical, and the FINGERPRINTS in `catalogueSeed.test.ts` are untouched.
- **Locked tables:** `revoke all … from public, anon, authenticated`, `grant … to service_role`, RLS enabled and forced, and no `authenticated` policy (gotcha `a-default-grant-ships-the-table-open`). Functions: `revoke execute … from public, anon, authenticated`, `grant execute … to service_role`, `set search_path = ''`.
- **`lock_timeout = '5s'`** at the top of the migration, as in #104.
- **Migration file:** `supabase/migrations/20261127000100_bestie_catalogue_review.sql`.
- **Reject reasons, exactly:** `not_women_friendly`, `doesnt_feel_right`, `too_far`, `wrong_price`, `closed`, `duplicate`, `not_a_fit`, `bad_run`, `other`. `bad_run` is written only by undo, and the routes refuse it.
- **Lengths:** a review `note` is at most 280 characters, a signal `text` at most 140, and a place name 1 to 200 characters after trimming.
- **Prices** are per person, in AED: `0 ≤ min ≤ max ≤ 5000`.
- **Admin** means `requireAdmin` (`app.ts`) on every route. No fresh sign-in is needed.
- **IDs in paths** are UUIDs (`isUuid` from `members.ts`). Anything else gets 404.
- **The repo is public.** Fixtures use `example.test` emails only.

## Review Focus

1. **A find decided twice** (a double tap, or two admins at once). The second call writes nothing and gets 409 "Someone already decided this one." Owner: Task 2 twin test, Task 3 vitest.
2. **Approving a place with every activity unticked.** It is refused with "Pick at least one thing they offer, or reject the place." and nothing is written. Owner: Task 2 twin test.
3. **Approving an activity whose place isn't approved** (pending, rejected or closed). It is refused. An activity never becomes usable on its own. Owner: Task 2 twin test.
4. **Approving a place that has no map position** (its lat/lng were cleared). It is refused with "This place has no map position yet. It comes back after Saturday's run." rather than failing a check constraint as a 500. Owner: Task 2 twin test.
5. **Undoing a run after something changed a field it updated.** That field is left, listed in the result as skipped, and every other field from the run is restored. Owner: Task 2 twin test.

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261127000100_bestie_catalogue_review.sql` | Columns, the four new tables, the append-only trigger, five functions, grants. |
| `supabase/tests/catalogue_review.test.sql` | Twin tests for the schema and the five functions. |
| `supabase/functions/admin/catalogue.ts` (+ `catalogue.test.ts`) | Types, body validation, result → answer mapping, the `CatalogueDeps` port, route handlers. |
| `supabase/functions/admin/app.ts` (+ `app.test.ts`) | Mount the routes; `AdminDeps.catalogue`. |
| `supabase/functions/admin/index.tsx` | The real `CatalogueDeps`: call the SQL functions via `asServiceRole`. |

---

### Task 1: The schema

**Files:**
- Create: `supabase/migrations/20261127000100_bestie_catalogue_review.sql` (tables and columns only; Task 2 adds the functions to the same file)
- Create: `supabase/tests/catalogue_review.test.sql`

**Interfaces:**
- Produces the following, in schema `bestie`:
  - **`catalogue_runs`:**
    - `id uuid pk default gen_random_uuid()`
    - `started_at timestamptz not null default now()`, `finished_at timestamptz`
    - `status text not null default 'running'`, one of `running`, `done`, `failed` or `undone`
    - `model text`
    - `counts jsonb not null default '{}'`
    - `error text`
    - `undone_at timestamptz`, `undone_by uuid` → `auth.users` on delete set null
  - **`catalogue_changes`:**
    - `id bigint generated always as identity pk`
    - `run_id uuid not null` → `catalogue_runs`
    - `place_id uuid not null` → `places`
    - `catalogue_item_id uuid`, null when the change is to the place itself
    - `field text not null`: for a place one of `name`, `area`, `website`, `opening_hours`, `status`; for an activity one of `price_min_aed`, `price_max_aed`, `duration_min`
    - `old_value jsonb`, `new_value jsonb`
    - `created_at timestamptz not null default now()`
  - **`catalogue_reviews`:**
    - `id bigint generated always as identity pk`
    - `target text not null`, one of `place`, `place_activity`, `event` or `content`
    - `place_id uuid` → `places`, `catalogue_item_id uuid` → `catalogue_items`, `content_item_id uuid` → `content_items`
    - `decision text not null`, one of `approved`, `edited_approved`, `rejected`, `released` or `removed`
    - `reason text`, one of the nine reasons
    - `note text` (≤ 280)
    - `edits jsonb`
    - `run_id uuid` → `catalogue_runs`
    - `decided_by uuid` → `auth.users` on delete set null
    - `decided_at timestamptz not null default now()`
    - **Checks:**
      - `place`: `place_id` set, the other two null;
      - `place_activity`: `place_id` and `catalogue_item_id` set;
      - `event`: `catalogue_item_id` set, `place_id` null;
      - `content`: `content_item_id` set, the other two null;
      - `reason is not null` exactly when `decision = 'rejected'`;
      - `released` and `removed` only with `content`; `edited_approved` never with `content`.
    - **Append-only:** a trigger refuses update and delete, like `team_changes`.
  - **`place_signals`:**
    - `id uuid pk default gen_random_uuid()`
    - `place_id uuid not null` → `places` on delete cascade
    - `kind text not null`, one of `women_friendly`, `menu_fit` or `ambience`
    - `text text not null`, 1 to 140 characters after trimming
    - `evidence_url text not null`, starting with `https://`
    - `run_id uuid` → `catalogue_runs`
    - `created_at timestamptz not null default now()`
  - **`places`:**
    - adds `opening_hours jsonb`, `run_id uuid`, `last_run_id uuid` (both → `catalogue_runs`), `reviewed_at timestamptz`, and `reviewed_by uuid` → `auth.users` on delete set null;
    - `lat` and `lng` drop `not null` and keep their range checks;
    - new check: `status <> 'approved' or (lat is not null and lng is not null)`.
  - **`place_activities`:**
    - adds `status text not null default 'pending'`, one of `pending`, `approved` or `rejected`;
    - adds `run_id uuid` → `catalogue_runs`;
    - existing rows are set to `'approved'` in the migration;
    - column comments on `price_min_aed` and `price_max_aed`: "Per person, AED".
  - **`catalogue_items`:**
    - adds `source_url text`, checked to start with `https://` when set;
    - adds `run_id uuid` → `catalogue_runs`.
  - **`content_items.screen`:** the check becomes `passed`, `held` or `removed`. Drop the existing check by its name and add the new one.
  - **Indexes:** `place_activities (status)`, and `run_id` on `places`, `place_activities`, `catalogue_items`, `catalogue_changes`, `catalogue_reviews` and `place_signals`.
  - **Foreign keys** from the logs to `places`, `catalogue_items` and `content_items` are plain references (no cascade). Rows are never deleted (spec §8).

- [ ] **Step 1: Write the failing twin test** `catalogue_review.test.sql`. Copy the `pg_temp.check` and `pg_temp.raises` helpers from `places.test.sql`. Fixtures: one admin user `a@example.test`, one run, one `pending` place with two `pending` activities on seed items `reformer` and `yoga`. Assert, as `service_role` unless stated:
  - a `place` review row with a `catalogue_item_id` set raises `23514`;
  - a `rejected` review with a null `reason` raises `23514`, and an `approved` one with a reason raises `23514`;
  - `released` with target `place` raises `23514`;
  - `update` and `delete` on `catalogue_reviews` raise (append-only);
  - `update places set status = 'approved'` on a place with `lat = null` raises `23514`;
  - `content_items.screen = 'removed'` inserts, and `'deleted'` raises `23514`;
  - a `place_signals` row with `evidence_url = 'http://x.test'` raises `23514`, and one with 141 characters of text raises `23514`;
  - `place_activities.status` defaults to `pending`;
  - as `authenticated`, with a Member's `request.jwt.claim.sub`: `has_table_privilege` is false for `select` on each of the four new tables;
  - the last line raises notice `CATALOGUE REVIEW TESTS PASSED`.
- [ ] **Step 2: Run** `bash supabase/twin/run.sh`. Expected: FAIL in `catalogue_review.test.sql` (relation `bestie.catalogue_runs` does not exist).
- [ ] **Step 3: Write the migration's schema part** to the Interfaces block. Header comment: "Catalogue review (spec 2026-11-27). Additive only; the engine reads approved rows only, so nothing pending reaches a Member."
- [ ] **Step 4: Run** `bash supabase/twin/run.sh` and `npx -y pnpm@10.34.3 test`. Expected: every twin suite PASSED, including `PLACES TESTS PASSED` and `CATALOGUE REVIEW TESTS PASSED`, and every Vitest test passes.
- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261127000100_bestie_catalogue_review.sql supabase/tests/catalogue_review.test.sql
git commit -m "feat(catalogue): review logs, run logs, signals and statuses, locked to the function"
```

---

### Task 2: The decision and undo functions

Each function does its whole job in one call, so the change and its log row commit together or not at all. They are `plpgsql` and `security invoker`, run as `service_role`, and return one `text` result. They never raise for an expected outcome. *(My call: a decision branches over several rows, and undo walks the run's changes. Functions are clearer than one CTE statement, and the twin can call them directly with no embedded copy to keep in step.)*

**Files:**
- Modify: `supabase/migrations/20261127000100_bestie_catalogue_review.sql` (append the functions and their grants)
- Modify: `supabase/tests/catalogue_review.test.sql`

**Interfaces:** Produces:

```sql
bestie.decide_place(p_actor uuid, p_place uuid, p_decision text, p_reason text, p_note text,
                    p_activities jsonb, p_edits jsonb) returns text
-- p_decision: 'approved' | 'edited_approved' | 'rejected'
-- p_activities: [{"catalogue_item_id": uuid, "approve": bool,
--                 "price_min_aed"?: num, "price_max_aed"?: num, "duration_min"?: int}]
--   It must list exactly the place's pending activities. Ignored when rejecting
--   (all pending activities become rejected with the same reason).
-- p_edits: {"name"?: text, "area"?: text, "signals"?: [{"id": uuid, "text": text}]} or null
-- Results: 'decided' | 'notPending' | 'needsActivity' | 'activitiesMismatch' | 'noPosition' | 'notFound'

bestie.decide_place_activity(p_actor uuid, p_place uuid, p_item uuid, p_decision text, p_reason text,
                             p_note text, p_edits jsonb) returns text
-- For a new activity at an already approved place. p_edits: {"price_min_aed"?, "price_max_aed"?, "duration_min"?}
-- Results: 'decided' | 'notPending' | 'placeNotApproved' | 'notFound'

bestie.decide_event(p_actor uuid, p_item uuid, p_decision text, p_reason text, p_note text,
                    p_edits jsonb) returns text
-- Only catalogue_items with run_id not null. p_edits: {"title"?, "time_note"?, "ends_on"?}
-- Results: 'decided' | 'notPending' | 'notFound'

bestie.decide_content(p_actor uuid, p_content uuid, p_decision text, p_note text) returns text
-- p_decision: 'released' (held → passed) | 'removed' (held → removed)
-- Results: 'decided' | 'notHeld' | 'notFound'

bestie.undo_catalogue_run(p_actor uuid, p_run uuid) returns jsonb
-- {"result": "undone" | "alreadyUndone" | "stillRunning" | "notFound",
--  "rejected": int, "restored": int, "skipped": [{"change_id": bigint, "field": text}]}
```

**Rules every function follows:**
- Lock the target row `for update` first. If its status is no longer the starting one, return `notPending` or `notHeld` and write nothing (Review Focus 1).
- On success:
  - write one `catalogue_reviews` row per target changed: for a place, one for the place plus one per activity;
  - set `reviewed_at` and `reviewed_by` on the place;
  - when approving, also set `approved_at` and `approved_by`, so existing readers keep working;
  - record `edits` as `{field: {"old": …, "new": …}}`.
- `edited_approved` with empty or null edits is stored as `approved`.
- `decide_place`, when approving:
  - with no activity approved, return `needsActivity` (Review Focus 2);
  - when `p_activities` doesn't match the place's pending activities exactly, return `activitiesMismatch`;
  - when `lat` or `lng` is null, return `noPosition`, checked before the update so the check constraint is never what answers (Review Focus 4).
- `decide_place_activity` returns `placeNotApproved` unless the place is `approved` (Review Focus 3).
- `undo_catalogue_run`:
  1. Lock the run `for update`.
  2. Reject every still-`pending` place, `place_activity` and event with this `run_id`, writing one review row each with reason `bad_run`.
  3. For each `catalogue_changes` row of the run, newest first: restore `old_value` only if the field's current value equals that row's `new_value` (compare as `jsonb`). Otherwise add it to `skipped` (Review Focus 5).
  4. Set the run's `status = 'undone'`, `undone_at` and `undone_by`.
  5. The restore writes go to the same columns the change named, through one `case` on `field`. There's no dynamic SQL.

- [ ] **Step 1: Add twin tests** to `catalogue_review.test.sql`:
  - **Approve a place:** `decide_place(admin, place, 'approved', null, null, '[{reformer, approve: true}, {yoga, approve: false}]', null)` returns `decided`. The place is `approved` with `approved_by = admin`, reformer is `approved`, yoga is `rejected` with reason `not_a_fit`, and there are 3 review rows. *(My call: an unticked activity is rejected as `not_a_fit`.)*
  - **Decided twice:** the same call again returns `notPending`, and there are still 3 review rows.
  - **Every activity unticked:** on a fresh pending place, all `approve: false` returns `needsActivity`. The place is still `pending`, with 0 new review rows.
  - **List doesn't match:** listing only one of two pending activities returns `activitiesMismatch`.
  - **No position:** with `lat = null`, approving returns `noPosition`, and the status is still `pending`.
  - **Edit, then approve:** `edited_approved` with `{"name": "Flex Studio JLT"}` and reformer `price_max_aed: 220`. The name and price change, and `edits->'name'` = `{"old": "Flex Reformer Studio", "new": "Flex Studio JLT"}`.
  - **Reject a place:** with `'rejected', 'doesnt_feel_right'`, every pending activity becomes `rejected` with that reason.
  - **Activity at a pending place:** `decide_place_activity` on a pending place's activity returns `placeNotApproved`.
  - **Content:** `decide_content` on a `held` item with `'removed'` sets `screen = 'removed'`. Repeating it returns `notHeld`.
  - **Undo:** a run that produced one pending place and two `catalogue_changes` on an approved place (`opening_hours`, and `price_max_aed` from 150 to 180), where the price has since been set to 200 by hand. Undo returns `undone`, `rejected = 1`, `restored = 1`, and `skipped` holds the price change. The hours are back, the price is still 200, the run is `undone`, and undoing again returns `alreadyUndone`.
  - **Who can call:** as `authenticated`, `has_function_privilege` on each of the five functions is false.
- [ ] **Step 2: Run** `bash supabase/twin/run.sh`. Expected: FAIL (function `bestie.decide_place` does not exist).
- [ ] **Step 3: Append the five functions and their grants** to the migration, to the Interfaces block and rules.
- [ ] **Step 4: Run** `bash supabase/twin/run.sh`. Expected: every suite PASSED.
- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261127000100_bestie_catalogue_review.sql supabase/tests/catalogue_review.test.sql
git commit -m "feat(catalogue): decide and undo in one call each, logged in the same transaction"
```

---

### Task 3: Decision rules and handlers (`catalogue.ts`)

**Files:**
- Create: `supabase/functions/admin/catalogue.ts`, `supabase/functions/admin/catalogue.test.ts`

**Interfaces:**
- Consumes: `AdminUser` (`app.ts`), `isUuid` (`members.ts`), the SQL results from Task 2.
- Produces:

```ts
export const REJECT_REASONS = ['not_women_friendly', 'doesnt_feel_right', 'too_far', 'wrong_price', 'closed',
  'duplicate', 'not_a_fit', 'other'] as const          // no 'bad_run': only undo writes it
export type RejectReason = typeof REJECT_REASONS[number]
export type Decision = 'approved' | 'edited_approved' | 'rejected'

export interface PlaceDecisionBody { decision: Decision; reason?: RejectReason; note?: string
  activities: { catalogueItemId: string; approve: boolean; priceMinAed?: number; priceMaxAed?: number; durationMin?: number }[]
  edits?: { name?: string; area?: string; signals?: { id: string; text: string }[] } }
export interface ActivityDecisionBody { decision: Decision; reason?: RejectReason; note?: string
  edits?: { priceMinAed?: number; priceMaxAed?: number; durationMin?: number } }
export interface EventDecisionBody { decision: Decision; reason?: RejectReason; note?: string
  edits?: { title?: string; timeNote?: string; endsOn?: string } }
export interface ContentDecisionBody { decision: 'released' | 'removed'; note?: string }

export function cleanPlaceDecision(body: unknown): PlaceDecisionBody      // throws Problem(message)
export function cleanActivityDecision(body: unknown): ActivityDecisionBody
export function cleanEventDecision(body: unknown): EventDecisionBody
export function cleanContentDecision(body: unknown): ContentDecisionBody

export type DecideResult = 'decided' | 'notPending' | 'notHeld' | 'needsActivity' | 'activitiesMismatch'
  | 'noPosition' | 'placeNotApproved' | 'notFound'
export interface UndoResult { result: 'undone' | 'alreadyUndone' | 'stillRunning' | 'notFound'
  rejected: number; restored: number; skipped: { changeId: number; field: string }[] }

export interface CatalogueDeps {
  decidePlace(actor: string, placeId: string, body: PlaceDecisionBody): Promise<DecideResult>
  decideActivity(actor: string, placeId: string, itemId: string, body: ActivityDecisionBody): Promise<DecideResult>
  decideEvent(actor: string, itemId: string, body: EventDecisionBody): Promise<DecideResult>
  decideContent(actor: string, contentId: string, body: ContentDecisionBody): Promise<DecideResult>
  undoRun(actor: string, runId: string): Promise<UndoResult>
}

/** HTTP status and the words Ren sees. */
export function answerFor(result: DecideResult): { status: number; body: { ok: true } | { problem: string } }
export const decidePlaceHandler, decideActivityHandler, decideEventHandler, decideContentHandler, undoRunHandler
  // (c: Context, deps: CatalogueDeps, user: AdminUser) => Promise<Response>, the pattern of events.ts
```

- **The body uses camelCase.** `index.tsx` maps it to the SQL's snake_case JSON.
- **Wording**, exact (`answerFor`):

| Result | Status | Words |
|---|---|---|
| `decided` | 200 | `{ ok: true }` |
| `notPending`, `notHeld` | 409 | "Someone already decided this one." |
| `needsActivity` | 422 | "Pick at least one thing they offer, or reject the place." |
| `activitiesMismatch` | 409 | "This place changed while you were looking. Open it again." |
| `noPosition` | 422 | "This place has no map position yet. It comes back after Saturday's run." |
| `placeNotApproved` | 422 | "Approve the place first." |
| `notFound` | 404 | "That's no longer here." |

- **Validation problems** get 400. The words:
  - "Pick a reason." for a reject with no reason, or with a reason not in `REJECT_REASONS`, including `bad_run`;
  - "That's longer than it can be." for a note over 280 characters, a signal over 140, or a name over 200;
  - "Check the prices: the lowest can't be above the highest." for `min > max`;
  - "Prices are in AED, from 0 to 5000." for a price out of range;
  - "Give it a name." for an empty or whitespace name.
  - A path id that isn't a UUID gets 404 before validation runs.

- [ ] **Step 1: Write the failing vitest** `catalogue.test.ts`:
  - `cleanPlaceDecision({decision: 'rejected'})` throws "Pick a reason.", and so does `{decision: 'rejected', reason: 'bad_run'}`;
  - `{decision: 'approved', reason: 'too_far', …}` drops the reason, so `.reason` is `undefined`;
  - a note of 281 characters throws "That's longer than it can be.";
  - `priceMinAed: 200, priceMaxAed: 150` throws the prices message, and `priceMaxAed: 5001` throws "Prices are in AED, from 0 to 5000.";
  - `edits.name: '   '` throws "Give it a name.";
  - unknown keys are dropped;
  - `answerFor` gives each row of the wording table, exactly;
  - `decidePlaceHandler` with a fake `CatalogueDeps` returning `notPending` answers 409 with "Someone already decided this one." (Review Focus 1);
  - with a path id `'abc'`, it answers 404, and the fake is never called.
- [ ] **Step 2: Run** `npx -y pnpm@10.34.3 test supabase/functions/admin/catalogue.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `catalogue.ts`** to the Interfaces block. Follow `events.ts` for the `Problem` class, `refuse`, `str` and `capped`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add supabase/functions/admin/catalogue.ts supabase/functions/admin/catalogue.test.ts
git commit -m "feat(admin): catalogue decision rules and answers"
```

---

### Task 4: Routes and wiring

**Files:**
- Modify: `supabase/functions/admin/app.ts`, `supabase/functions/admin/app.test.ts`, `supabase/functions/admin/index.tsx`

**Interfaces:**
- Consumes: Task 3's handlers and `CatalogueDeps`; Task 2's SQL functions.
- Produces:
  - `AdminDeps.catalogue: CatalogueDeps`
  - **Routes**, each behind `requireAdmin`:
    - `POST /admin/catalogue/places/:placeId/decision`
    - `POST /admin/catalogue/places/:placeId/activities/:itemId/decision`
    - `POST /admin/catalogue/events/:itemId/decision`
    - `POST /admin/catalogue/content/:contentId/decision`
    - `POST /admin/catalogue/runs/:runId/undo`, which answers `200` with an `UndoResult`, or `404` for `notFound`, or `409` with "That run is still going. Try again when it's finished." for `stillRunning`
- **In `index.tsx`:**
  - each dep calls its function with `asServiceRole`, for example `select bestie.decide_place($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7::jsonb) as result`, passing JSON built from the camelCase body;
  - anything other than a known result string throws, so the route answers 500 with no detail.

- [ ] **Step 1: Write the failing tests** in `app.test.ts`, with the existing fake-deps helper:
  - each of the five routes answers 401 with no token and 403 for a signed-in non-admin;
  - an admin `POST` to the place route reaches `deps.catalogue.decidePlace` with `(adminId, placeId, cleanedBody)`;
  - an undo with `stillRunning` answers 409 with the exact words.
- [ ] **Step 2: Run** `npx -y pnpm@10.34.3 test supabase/functions/admin/app.test.ts`. Expected: FAIL.
- [ ] **Step 3: Mount the routes in `app.ts`, and build the real `catalogue` deps in `index.tsx`.**
- [ ] **Step 4: Run** `npx -y pnpm@10.34.3 test` and `deno check supabase/functions/admin/index.tsx`. Expected: every Vitest test passes, and `deno check` reports no new errors in `admin/` (the old `server/kv_store.tsx:16` error is known; gotcha `a-new-type-gate-fails-on-errors-the-base-already-had`).
- [ ] **Step 5: Commit**

```bash
git add supabase/functions/admin/app.ts supabase/functions/admin/app.test.ts supabase/functions/admin/index.tsx
git commit -m "feat(admin): catalogue decision and undo routes"
```

---

## Release (each step needs Khairul's yes; not part of executing this plan)

1. Read-only preflight on live:
   - `place_activities` row count (expected 0);
   - the current name of the `content_items.screen` check;
   - no `bestie.catalogue_*` tables yet.
2. Apply the migration to `lemtlurqzmjdahbhunhz`.
3. Deploy `admin` (nothing calls the new routes until the screen ships).
4. Open the PR and merge.

`server` isn't deployed: nothing in it changes.

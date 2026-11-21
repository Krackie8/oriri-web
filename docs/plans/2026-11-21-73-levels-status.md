# Plan: #73 Levels, Status and the spider chart

Branch `feat/73-levels-status`. Sub-issue of #67. Rules: DEC-003 and DEC-010, plus the #73 grilling on 2026-11-21 (DEC-011, all 12 accepted, summarised below).
Nothing here touches the live project `lemtlurqzmjdahbhunhz` until steps 5 and 6, each with Khairul's yes.

## Decisions from the grilling (2026-11-21, all accepted)

1. **Points.**
   - 10 for a normal Completion.
   - 5 if the item is light (`is_light`) or a reach-out (`kind = 'reach_out'`).
   - 15 for QR Proof. It's written now, but nothing can earn it until #76.
   - A two-Pillar item gets one row per Pillar at the full amount.
   - The amounts are constants in the module.
2. **Undo.** One negative row per original row: same `completion_id`, `reason = 'undo'`, opposite amount. Only one reversal per Completion. Re-completing makes a new Completion with new rows.
3. **Thresholds.** `LEVEL_AT = [0, 30, 80, 160, 280, 450, 700, 1000, 1400, 1900]`, for Levels 1 to 10.
4. **Never drop.**
   - Level = max(Level from the ledger, highest Level recorded *before today's Dubai midnight*).
   - Today's Level-ups are provisional, and a same-day undo can take them back.
5. **Status.**
   - Port the prototype's `statusOf`: Balanced (spread ≤ 1), else Single (top minus second ≥ 2), else Pair (second minus third ≥ 1), else Single.
   - Tier from total Levels: 4–8 Rising, 9–17 Glowing, 18–27 Radiant, 28+ Iconic.
   - Pillars with equal Levels are ordered by points, then by Move, Meal, Mindset, Meet up.
   - The names are placeholders.
6. **Moment.**
   - Fires on the Completion or undo that changes the Status, and is returned in the reply.
   - The baseline "Rising Balanced" is implicit and needs no row.
   - A same-day undo takes back today's moment, and a Status never visibly drops.
7. **Level-up.** An inline note, not a moment.
8. **Chart.** The outer filled shape is her Levels now. The inner outline is her Levels as of 30 days ago, on the same 1 to 10 axes.
9. **Profile.** `/profile` becomes the Member's Profile. Visitors keep the sign-in page and admins keep their branch. The Day screen links to it.
10. **Share/save.** A PNG built in the browser (Status name + chart shape, no numbers), sent through Web Share with a file, or downloaded as a fallback. Nothing is uploaded.
11. **Flagged Completions earn points.**
12. **No backfill.**

## 1. Migration `supabase/migrations/20261121000100_bestie_points_levels.sql`

The migration is additive only: constraints and indexes, no data and no new tables.

**On `bestie.points`:**
- `add constraint points_reason check (reason in ('completion', 'undo'))`
- `add constraint points_amount check (amount <> 0 and amount between -15 and 15)`. This bounds every row a sum can read. See the gotcha `one-bad-append-only-row-can-break-every-reader-of-a-computing-view`.
- `add constraint points_sign check ((reason = 'completion') = (amount > 0))`
- `add constraint points_has_completion check (completion_id is not null)`. Every row comes from a Completion. Account deletion still works: the cascade deletes both the Completion and its points.
- `create unique index points_one_award on bestie.points (completion_id, pillar) where reason = 'completion'`
- `create unique index points_one_reversal on bestie.points (completion_id, pillar) where reason = 'undo'`
- `create index points_member_time_idx on bestie.points (member_id, created_at)`. The "30 days ago" layer reads by time.

**On `bestie.member_levels`:**
- `add constraint member_levels_status_names check (kind <> 'status' or (status_tier in ('rising','glowing','radiant','iconic') and status_shape ~ '^(balanced|move|meal|mindset|meet_up|[a-z_]+\+[a-z_]+)$'))`. This stores the shape as a key (`meal`, `meal+meet_up`) and never as a placeholder name, so renaming with Ren is a code change only.

**Preflight on live (shown at step 5):**
- How many rows `bestie.points` and `bestie.member_levels` hold (expected 0, since #72 wrote no points).
- That no existing row breaks a new check.
- That the index and constraint names are free.

**Twin test changes:**
- `bestie_schema.test.sql` keeps its fixture rows (they already use `10, 'completion'`) but has to give them a `completion_id`. Its "A cannot award herself" case stays as it is.
- New `supabase/tests/points_levels.test.sql`, written first:
  - The checks refuse `reason='self'`, amount 0, amount 16, a negative `completion`, a positive `undo`, and a null `completion_id`.
  - A second award or a second reversal for the same (Completion, Pillar) is refused.
  - Account deletion with **every FK filled in** (members → completions → points) still cascades cleanly.
  - A `member_levels` status row with a display name is refused, and a valid key is accepted.

## 2. Pure rules: new `supabase/functions/server/progress.ts` (no I/O)

- `POINTS = { normal: 10, light: 5, qr: 15 }` and `pointsFor(item, proofKind): { pillar, amount }[]`.
- `LEVEL_AT` and `levelOf(points)`.
- `levelsFrom(sums, floor)`: the per-Pillar `max(levelOf(sum), floor[p])`.
- `statusOf(levels, sums): { shape, tier }`: keys, with the tie-break.
- `STATUS_NAMES`: placeholder display names, `statusName(status)`, for example `"Glowing Clean Eater"`.
- `progressChanges({ sums, recorded, dayStart })` returns:
  - `levelUps`: Pillars whose Level is above their highest recorded Level.
  - `retract`: rows recorded today that no longer hold.
  - `moment`: the new Status if it differs from the latest still-holding status row (or from the implicit `rising/balanced`), else null.

**Tests first, `progress.test.ts`:**
- Every amount: normal, light, reach-out, QR, and two-Pillar (both Pillars full, QR two-Pillar 15 + 15).
- Every threshold edge (29 → 1, 30 → 2, 1899 → 9, 1900 → 10, 99999 → 10).
- The floor holds after a later threshold change.
- Each shape branch, the tie-break, and each tier edge (8/9, 17/18, 27/28).
- **The prototype scenario "Status changes"** with the same grants: Rising Balanced → Glowing Clean Eater → Glowing Table Setter (`meal+meet_up`) → Iconic Balanced, with a moment at each step and none on the baseline.
- An undo the same day retracts today's Level-up and moment. Yesterday's Level-up survives an undo today.

## 3. Bestie module and stores (`bestie.ts`, the Postgres store in `index.tsx`)

**`recordCompletion`:** `NewCompletion` gains `points: { pillar, amount }[]`. The store inserts them in the **same transaction** as the Completion (already under the member-row lock), with `reason='completion'`.

**`undoCompletion`:** in the same transaction it inserts `select member_id, pillar, -amount, 'undo', completion_id from bestie.points where completion_id = $1 and reason = 'completion'`.

**New `settleProgress(memberId, at, dayStart, decide)`:**
- Its own transaction, which takes the same member-row lock, so it is serialised with Completions and undos.
- It reads her per-Pillar sums and her `member_levels` rows, then calls the pure `decide` (`progressChanges`).
- It inserts the Level-up rows and the moment's status row, and deletes the `retract` rows.
- Deleting rows is allowed here: `member_levels` has no append-only trigger, and only rows from today are ever deleted.
- It's self-healing: if a crash lands between the two transactions, the next settle writes whatever is missing. The Profile shows Levels from the ledger either way.

**Replies:**
- `complete` and `undoCompletion` return `planned` with the plan plus `progress: { levelUps: { pillar, level }[], moment: { shape, tier, name } | null }`.
- New `profile(store, user, now)` returns:
  - `levels`, `points`, and `nextAt` per Pillar
  - `levels30` (from ledger rows before now − 30 days, floored by the Levels recorded before then)
  - `status` with its name
  - `moments` (her last 10 status rows)
  - It returns `notJoined` for a non-Member.

**The memory store** in `bestie.ts` implements all of the same, so the module tests run without Postgres.

**Twin test `completion_store.test.sql`, extended:** a Completion followed by an undo leaves a net sum of 0 and two rows. A second undo is refused by the index.

**Tests first (`bestie.completion.test.ts`, extended, plus a new `bestie.progress.test.ts`):**
- A Completion writes the right ledger rows, and so does a two-Pillar one. A flagged Completion still earns points.
- Undo reverses the points exactly once.
- A Completion that crosses 30 returns a Level-up. One that changes the Status returns a moment, and undoing it removes it.
- The Profile's `levels30` matches the 30-day cut-off.
- A non-Member gets `notJoined`.

**The engine version stays `bestie-2`**, because plan fitting doesn't change.

## 4. Route and Function client

**Route:**
- `GET /make-server-a278ea32/bestie/profile`, which goes through `socialUser` the same way the Journal does.
- The complete and undo replies gain `progress`.

**Function client** (`functionClient/bestie.ts`):
- `bestie.profile()` returns `ok { profile } | notJoined | signedOut`.
- `complete` and `undo` pass `progress` through.

**Tests first in `functionClient/bestie.test.ts`:** paths, the reply shapes, and the error mapping, using the existing fake transport.

## 5. UI

**`/profile`:**
- `profileView` gains a `'member'` view (signed in, a Member, not an admin).
- A new `src/app/wellness/profile/MemberProfilePage.tsx` shows her Status name (with a small "names are placeholders" note shown only in dev builds), the spider chart, a row per Pillar ("Level 3 · 40 points to Level 4"), recent moments, and a "Share or save" button. The Journal stays on `/plan/day`.
- `GuestProfilePage` keeps visitors.

**`SpiderChart.tsx`:**
- An inline SVG on four axes. The outer filled polygon is Levels now, and the inner outline is `levels30`. It has 5 rings and the Pillar labels.
- It uses design tokens, and its `aria-label` lists the Levels as text.
- A pure `chartPoints(levels)` gets a unit test.

**`shareCard.ts`:** draws the Status name and the chart shape (no numbers) on a canvas, makes a PNG, and then:
- If `navigator.canShare({ files })` is true, it shares it.
- Otherwise it downloads `oriri-status.png`.
- The choice between those two is pure and tested.

**Day screen:**
- After a Completion, a Level-up shows an inline note ("Move is now Level 3").
- A moment shows a card ("You're now a Glowing Clean Eater") with Share or save and a link to Profile.
- The screen gains a "Your Profile" link.

**Copy:** follows GLOSSARY (Level, Status, Profile, Member). Status names render from `STATUS_NAMES`.

## 6. Order of work (each step red, then green)

1. Twin test `points_levels.test.sql` → migration → `bash supabase/twin/run.sh` green.
2. `progress.test.ts` → `progress.ts`.
3. Module and memory-store tests → `bestie.ts` → the Postgres store in `index.tsx` → twin `completion_store` extensions.
4. Function client tests → client.
5. `profileView`, `chartPoints` and share-choice tests → UI.
6. `pnpm test`, `pnpm build`, the twin, and a local browser check of `/profile` and a Completion moment with the fake transport → PR.

## 7. Release (steps 5 and 6, each with a yes)

This follows `auto-deploy-on-push-ships-code-before-its-migration` and `a-staging-that-deploys-from-main-cannot-test-a-pr-before-merge`:

1. Preflight SQL on live, read-only.
2. Apply the additive migration. The old function v152 keeps working, because its rows don't violate the new checks: it writes no points at all.
3. Check the `SUPABASE_ACCESS_TOKEN` secret, then deploy the function through the CI workflow (not by hand).
4. Merge, so staging updates. Khairul tests on staging, then I verify with read-only SQL (the ledger rows, a reversal, the `member_levels` rows).
5. Production is a separate yes.

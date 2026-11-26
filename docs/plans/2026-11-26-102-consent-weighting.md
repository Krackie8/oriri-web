# #102: Bestie's personal weighting honours the personalisation Consent

**Ticket:** #102 (under #67) · **Branch:** `fix/102-consent-weighting` from `main` at `ec9d947` · **Date:** 2026-11-26

## The problem

The personalisation Consent says: "Let Bestie learn from what I accept, skip and complete, to suggest things I'll love."
It is recorded at Join. But the Day plan's learning runs whether she said yes or no:

- `personalWeight` ranks the Catalogue by her completed (+3), accepted (+1), skipped or swapped (-2) outcomes over 30 days.
  This happens in `context()` in `supabase/functions/server/bestie.ts`, which is used by Check-in and by swap options.
- One day in three, the new-for-you slot leans towards her weakest Pillar, the one with the fewest Completions in 30 days.

#74's morning line already honours the Consent (`morningSignals().personal`).

## Rulings (Khairul, 2026-11-26)

1. **Service rules stay without the Consent.** They are "nothing but a light version two days running" and "one Suggestion new for you".
   They serve her rather than learn her taste.
2. **The weakest-Pillar lean is off without the Consent.** It steers her Suggestions using what she completed.
3. **Only outcomes from her yes count.** With the Consent, weighting uses only the outcomes from plans dated on or after the Dubai date of her latest yes.
   Nothing recorded while she had said no is used for learning. The 30-day fade still applies on top of that.
   The same cut-off applies to the weakest-Pillar count.
4. **Her latest Consent row wins** (from the ticket). She can withdraw it, or say yes again. The next Check-in or swap reads her latest row; nothing is cached.

What doesn't change:
- Outcomes are still **recorded** without the Consent. The plan, swaps, skips and Completions need them, and so do Levels and the Streak.
- What changes is only whether Bestie *learns* from them.

## Design

**One new store method:**

```ts
/** Her latest personalisation Consent: a yes, and the Dubai date of that yes; or null when she has none or said no. */
personalisation(memberId: string): Promise<{ since: string } | null>
```

- **Postgres** (`index.tsx`): read the latest `bestie.consents` row for `purpose = 'personalisation'` by `recorded_at desc`.
  If it is a yes, return `to_char(recorded_at at time zone 'Asia/Dubai', 'YYYY-MM-DD')`. Otherwise return null.
  Use the same `set local role service_role` transaction as `morningSignals`.
- **Memory store:** it uses the existing `consents` option. The latest by `at` wins.

**`context()` in `bestie.ts`:**
- It also fetches `personalisation(memberId)`.
- It defines `learnFrom`, the history rows Bestie may learn from:
  - with no yes, none;
  - with a yes, the rows with `plan_date >= since`.
- Weights are `personalWeight(learnFrom, ...)`.
- `banned` (yesterday) and `ever` (new for you) still read the full history. That's ruling 1.
- It returns `personal: boolean` so that `checkIn` can decide the lean.

**`checkIn`:** the lean is `personal && leansWeakest(today) ? weakestPillar(learnFrom, today) : null`.

**Engine version:** bump it to `bestie-4`.
- The fixed-input fingerprint in `catalogueSeed.test.ts` doesn't move, because a fresh Member has no history.
  But plans for Members with history change.
- `engine_baseline.sql` groups by `engine_version`, so the split shows up there by itself.
- Add `'bestie-4'` to `FINGERPRINTS` with the same hash, and a comment saying why.
- Update the two `toBe('bestie-3')` asserts.

**Header comment of `bestie.ts`:** add one line under Learning saying that it needs the personalisation Consent, and what the service rules are.

## Tests (red first)

New file: `supabase/functions/server/bestie.consent.test.ts`.

1. **No Consent row:** a strong history doesn't change the ranking. Her plan matches a fresh Member's plan for the same Check-in, apart from today's no-repeat and new-for-you rules.
2. **Consent no:** the same result as no row.
3. **Consent yes:** history lifts an item, the same as today's learning tests.
4. **Yes, then no (withdrawn):** her next Check-in is unweighted.
5. **No, then yes on day D:** an outcome dated before D doesn't count, and one on or after D does.
6. **Service rules without the Consent:**
   - yesterday's full Suggestion isn't suggested today;
   - one Suggestion is still new for her.
7. **Lean:**
   - on a leaning day without the Consent, the new-for-you slot uses plain Pillar order;
   - with the Consent, it leans to her weakest Pillar.
8. **Swap options without the Consent:** they're ranked with weight 0. A skipped item isn't pushed down.

Existing tests:
- The learning tests in `bestie.learning.test.ts` and `bestie.completion.test.ts` seed history and expect weighting, so they need a yes Consent seeded.
  Without it they go red, and that's what proves the gate works.

SQL replay:
- Add the `personalisation()` query to `supabase/tests/day_plan_store.test.sql`, and run it on the local twin.
- Cover four cases: no row; yes; yes then no; no then yes, which returns the yes date in Dubai time.
  Include a yes recorded at 22:30 UTC, which falls on the next Dubai day.

## Done means

- `pnpm test` and the SQL replay on the twin are green.
- A code review is done on the branch.
- A PR against `main`.
- **Then stop for Khairul:**
  - the merge;
  - the `server` redeploy (`make-server-a278ea32`, live, shared by staging and production).

Before asking for the deploy, confirm that `main`'s `server` code is what v156 runs. That way the deploy ships only this change ([[a-deploy-from-a-branch-ships-every-undeployed-change-since-the-last]]).

## Not in scope

- Withdrawing a Consent from the app. That's #81, Privacy.
- Deleting past outcomes when she says no. They're service records, kept as today.

## As built (2026-11-26)

- **The lean is its own function.** It's `leaningPillar(learnFrom | null, today)`, exported and tested directly.
  An end-to-end fixture couldn't tell a leaning plan from the weighting's effect, so the gate is pinned at the function instead.
- **The SQL replay** went into `supabase/tests/morning_lines.test.sql` (section 6b), not `day_plan_store.test.sql`. That's where the consent fixtures already are.
  It has four checks: yes then no; no row; yes today; and no then a yes at 22:30 UTC, which gives the next Dubai day.
- **Mutation checks:**
  - With the Consent gate removed, 9 of the 12 tests in `bestie.consent.test.ts` fail.
  - Learning from all history after a yes fails "a skip from before her yes".
  - A lean that ignores a missing yes fails "without it, no day leans".
- **Green:** `pnpm test` (557) and `supabase/twin/run.sh`.

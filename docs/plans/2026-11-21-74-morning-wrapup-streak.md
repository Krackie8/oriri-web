# Plan: #74 Morning with Bestie, Wrap-up and Streak

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** a daily reason to open Oriri. A morning card (a line in Ren's voice picked for her, the sunset and heat, this week's Meet up, her Streak), an evening Wrap-up, and a forgiving Streak.

**Architecture:**
- The rules are pure functions in two new server modules: `streak.ts` and `morning.ts`.
- `bestie.ts` gains `morning()` and four store methods. Both adapters implement them: in-memory in `bestie.ts`, Postgres in `index.tsx`.
- The site gets one Function client action, a `MorningCard`, and a Wrap-up mode on the Day screen.

**Tech stack:** Deno edge function (Hono, postgres.js), React + Vite, Vitest, and the Postgres 17 twin (`bash supabase/twin/run.sh`).

**Spec:**
- Issue #74, and #67 stories 9, 37 and 39.
- The #74 grilling on 2026-11-21: round 1 (Q4 to Q13), round 2 (Q1 to Q9) and the voice round (Q1 to Q4), all accepted.
- Ren's voice comes from her live Stepsisters write-up, her Directory notes and the Tea for Two feed.

Branch `feat/74-morning-wrapup-streak`. Nothing touches the live project `lemtlurqzmjdahbhunhz` until steps 5 and 6, each with Khairul's yes.

## Decisions from the grilling (2026-11-21, all accepted)

1. **The line.**
   - Bestie picks a line in Ren's voice from a seeded bank, matched to what it knows about her.
   - Writing new lines with a model is a later ticket.
   - With no line at all, the card shows none.
2. **Author.**
   - A line Ren wrote is signed "· Ren". A drafted line (`author = 'bestie'`) shows with no name under it.
   - The whole seed is `bestie`. A line becomes `ren` when Ren approves it.
3. **Signals and Consent.**
   - With her latest personalisation Consent `granted = true`, the pick may use her last Check-in's energy and Goal, her weakest Pillar, her Streak state, her days away and her first week.
   - It never uses her Reflections, photos, area or name.
   - Without the Consent: the day's general line, the same for everyone, and nothing is recorded.
4. **Schema.**
   - `daily_lines` gains `author`, `goal`, `pillar`, `energy` and `moment`, and keeps `show_on`.
   - `set_name` is left unused. Seasonal sets wait for the Admin revamp.
5. **Picking and memory.**
   - A line dated today comes first, for everyone.
   - Otherwise, the best-matching line not shown to her in the last 14 days.
   - The line she is shown is recorded in `bestie.member_lines`, one row per Member per Dubai day. Reloading returns the same line.
6. **The seed.**
   - At least 60 lines, each under 90 characters, at most one ✨ or 🌸 at the end, on at most 40% of the lines.
   - Nothing about Ren's own life, and nothing about weight, bodies, food rules, medical or supplement claims, or the news.
   - A review file is checked against the seed by a test.
7. **Admin.** No Admin UI in #74. A new ticket, "Admin revamp", takes the criterion "Ren can add, edit and schedule daily lines".
8. **Sky.**
   - Sunset comes from the standard (NOAA) sunrise/sunset formula for Dubai and replaces the month table in `bestie.ts`.
   - Heat comes from the hot season, May to September. The wording never claims a forecast.
9. **Meet up.** From the next 7 Dubai days, in this order: pinned, then the soonest Stepsisters moment (not `recap`), then the soonest event. None means no line.
10. **Card.** Members only, above the Check-in (`/plan/inputs`) and above the Day plan (`/plan/day`). Visitors keep `Affirmation`.
11. **Wrap-up.**
    - The Day screen turns into the Wrap-up from 18:00 Dubai time. A "Wrap up my day" link opens it earlier, any time after a Check-in.
    - It lists today's active plan: open Suggestions (with their own Proof, and "opens at" while the time gate is shut) and completed ones (with undo), plus a summary line.
    - No "complete all" button.
12. **Day boundary.** Dubai midnight.
13. **Streak.**
    - A day counts if it has at least one live Completion. Flagged ones count; undone ones don't.
    - Weeks run Monday to Sunday, Dubai time. The first missed day in a week is the rest day: the Streak is kept but doesn't go up. A second missed day ends it. The rest day doesn't carry over.
    - Today, before her first tick, is never a missed day.
14. **Computed, not stored.** The Streak is worked out from her live Completions every time it's read. It never touches points or Levels.
15. **Burst flag.** Unchanged. Tests pin the Wrap-up cases.
16. **Streak copy.**
    - "{n}-day Streak · rest day available"
    - "{n}-day Streak · rest day used, Streak kept"
    - "New Streak starts with today's first tick"
    - No Streak moment card.

## Global constraints

- Server code is pure TS shared by Deno and Vitest. Imports in `supabase/functions/server/*` use `.ts` extensions, like the existing modules.
- With postgres.js, bind JSON with `tx.json(...)`, never `${JSON.stringify(x)}::jsonb`, which `storeSql.test.ts` guards. Every store SQL statement runs inside `bestieDb().begin(...)` with `set local role service_role`, like `journal`.
- Dubai is UTC+4 with no daylight saving. Reuse `dubaiDayBounds` and `DUBAI_OFFSET_MS` from `proof.ts`, and the `dubaiDate`/`addDays`/`dayNumber` helpers in `bestie.ts`. Export them if a new module needs them; don't copy them.
- Copy follows `GLOSSARY.md`: Member, Streak, Wrap-up, Meet up, Check-in, Day plan, Completion. Never "user" in product copy.
- Migrations are additive. No data step touches existing Members' rows.

## Review focus

1. **A tick at 23:59:59 Dubai time** (19:59:59Z) counts for that day, and one at 00:00:00 counts for the next. Tested in Task 3's twin test and Task 1's unit test.
2. **Two tabs or a reload racing the first morning call** both get the same line: `recordLine` returns the line already stored for that day. Tested in Task 3.
3. **A Member who withdraws the personalisation Consent** gets the general line from the next call. The latest Consent row wins over an earlier `true`. Tested in Task 4.
4. **A bank where every eligible line was shown in the last 14 days** still returns a line: the one shown longest ago. `null` only when there's no active line at all. Tested in Task 2.
5. **A key-value Meet up with a missing or malformed `date` or `startTime`, or a Meet up source that throws,** is skipped. The card still loads with `meetUp: null`, and `/bestie/morning` never fails because of an event. Tested in Tasks 2 and 5.

---

### Task 1: The Streak rules (`streak.ts`)

**Files:**
- Create: `supabase/functions/server/streak.ts`
- Test: `supabase/functions/server/streak.test.ts`

**Interfaces:**
- Produces:
  - `export interface StreakView { count: number; todayDone: boolean; restUsedThisWeek: boolean; restDayYesterday: boolean }`
  - `export function streakOf(days: string[], today: string): StreakView`. `days` are Dubai dates (`YYYY-MM-DD`) with at least one live Completion, in any order and possibly repeated.
  - `export const weekStart = (date: string) => string`, the Monday of that date's week.

- [ ] **Step 1: Write the failing tests.** Dates: 2026-11-23 is a Monday.
  - `'Streak and the rest day (prototype scenario)'`, with done = `['2026-11-23','2026-11-24']`:
    - On `'2026-11-24'`: `{count: 2, todayDone: true, restUsedThisWeek: false}`.
    - On `'2026-11-25'` (Wednesday, not ticked yet): `{count: 2, todayDone: false, restUsedThisWeek: false}`.
    - On `'2026-11-26'` (Wednesday missed): `{count: 2, restUsedThisWeek: true, restDayYesterday: true}`.
    - On `'2026-11-27'` (Thursday missed too): `{count: 0, restUsedThisWeek: false}`.
  - `'a rest day does not carry over'`: done Fri 11-27 and Sat 11-28, missed Sun 11-29 and Mon 11-30, viewed on Tue 12-01. Result: `count 2`, `restUsedThisWeek: true`, because Monday used this week's rest day and Sunday used last week's.
  - `'only the first missed day in a week is forgiven'`: done Mon and Thu, missed Tue and Wed, viewed on Fri. Result: `count 1`.
  - `'nothing yet'`: `streakOf([], d)` is `{count: 0, todayDone: false, restUsedThisWeek: false, restDayYesterday: false}`.
  - `'a missed day before her first Completion is not a rest day'`: done = `['2026-11-25']`, viewed on 11-25. Result: `count 1`, `restUsedThisWeek: false`.
  - `'repeated dates count once'`.
- [ ] **Step 2:** Run `npx -y pnpm@10.34.3 vitest run supabase/functions/server/streak.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `streakOf`.**
  1. Count today if done.
  2. Walk back day by day from yesterday. A done day adds 1. On a missed day: if its week's rest day isn't used yet and an earlier done day exists, use it and continue. Otherwise stop.
  3. Stop when the walk passes her earliest done day.
  4. `restUsedThisWeek` is true only if the walk used the current week's rest day and `count > 0`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(#74): Streak rules with the weekly rest day`.

### Task 2: The morning rules (`morning.ts`)

**Files:**
- Create: `supabase/functions/server/morning.ts`
- Test: `supabase/functions/server/morning.test.ts`
- Modify: `supabase/functions/server/bestie.ts`. Replace `SUNSET[month]` in the why lines with `sunsetAt(planDate)`, and delete the `SUNSET` table.

**Interfaces:**
- Consumes: `StreakView` (Task 1), and `Pillar`, `Goal`, `Energy` from `bestie.ts` types.
- Produces:
  - `export type LineMoment = 'any' | 'streak' | 'rest_day' | 'comeback' | 'first_week' | 'low_energy'`
  - `export interface DailyLine { id: string; body: string; author: 'ren' | 'bestie'; goal: Goal | null; pillar: Pillar | null; energy: Energy | null; moment: LineMoment; showOn: string | null }`
  - `export interface LineContext { today: string; personal: boolean; moment: LineMoment; goal: Goal | null; energy: Energy | null; weakest: Pillar | null }`
  - `export function momentOf(i: { today: string; joinedOn: string; lastDoneOn: string | null; streak: StreakView; lastEnergy: Energy | null }): LineMoment`
  - `export function pickLine(lines: DailyLine[], ctx: LineContext, recent: { lineId: string; shownOn: string }[]): DailyLine | null`
  - `export function sunsetAt(date: string): string`, for example `'5:36pm'`
  - `export function skyHint(date: string): { sunset: string; hot: boolean; hint: string }`
  - `export interface MeetUpRow { id: string; kind: 'moment' | 'event'; title: string; date?: unknown; startTime?: unknown; location?: unknown; link?: unknown; pinned?: unknown; type?: unknown }`
  - `export interface MeetUpView { title: string; date: string; time: string | null; location: string | null; url: string | null }`
  - `export function thisWeeksMeetUp(rows: MeetUpRow[], today: string): MeetUpView | null`

- [ ] **Step 1: Write the failing tests.**
  - `momentOf`. Precedence: `comeback` (last done 3 or more days before today, after her first week) > `rest_day` (`streak.restDayYesterday`) > `first_week` (joined less than 7 days ago) > `streak` (`count >= 3`) > `low_energy` (`lastEnergy === 'low'`) > `any`. One test per branch, plus one where both `comeback` and `low_energy` hold.
  - `pickLine`:
    - A `showOn === today` line wins even with `personal: false`.
    - With `personal: false`, only untagged `moment 'any'` lines are eligible. The pick is `eligible[sortedById][dayNumber(today) % n]`, so the same input always gives the same line.
    - With `personal: true`, a line is eligible when each of its non-null tags equals the context and its moment is `'any'` or `ctx.moment`. Score: moment match 4, goal 2, pillar 2 (`pillar === ctx.weakest`), energy 1. The top score wins, ties go by day number as above.
    - A line in `recent` within 14 days is skipped. If every eligible line was recent, pick the one with the oldest `shownOn` (Review focus 4).
    - `[]` gives `null`.
  - `sunsetAt`, within ±3 minutes of the NOAA calculator for Dubai (25.2048 N, 55.2708 E, UTC+4): `'2026-12-21'` about 17:33, `'2027-06-21'` about 19:13, `'2027-03-21'` about 18:26, `'2026-09-23'` about 18:13. The test parses the returned `h:mmam/pm`.
  - `skyHint`:
    - In May to September: `hot: true`, `hint === \`Hot season: outdoors after sunset (${sunset})\``.
    - Otherwise: `hint === \`Good season for outdoors · sunset ${sunset}\``.
    - Neither ever contains "today" or a temperature.
  - `thisWeeksMeetUp`:
    - A pinned row within 7 days beats a sooner moment, and a moment beats a sooner event.
    - Rows dated before today or after `addDays(today, 6)` are skipped, and so are `type === 'recap'` rows.
    - A row whose `date` isn't a `YYYY-MM-DD` string is skipped. A malformed `startTime` gives `time: null`, and `'18:30'` gives `'6:30pm'` (Review focus 5).
    - `[]` gives `null`.
  - Existing tests that assert a month-table sunset in a why line are updated to the `sunsetAt` value.
- [ ] **Step 2:** Run `vitest run supabase/functions/server/morning.test.ts supabase/functions/server/bestie.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. `sunsetAt` is the NOAA solar-position approximation: day of year, then equation of time, declination, hour angle at −0.833°, then UTC+4.
- [ ] **Step 4:** Run all unit tests: `npx -y pnpm@10.34.3 test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(#74): line picking, sunset, heat and this week's Meet up`.

### Task 3: Migration and twin test

**Files:**
- Create: `supabase/migrations/20261121000200_bestie_morning_lines.sql`
- Create: `supabase/tests/morning_lines.test.sql` (write it first)

**Interfaces:**
- Produces: the columns and table the Postgres adapter (Task 5) reads, and the SQL text Task 5 copies.

**Migration:**
- `alter table bestie.daily_lines`:
  - `add column author text not null default 'bestie' check (author in ('ren','bestie'))`
  - `add column goal bestie.goal`
  - `add column pillar bestie.pillar`
  - `add column energy bestie.energy`
  - `add column moment text not null default 'any' check (moment in ('any','streak','rest_day','comeback','first_week','low_energy'))`
  - `add constraint daily_lines_body check (char_length(btrim(body)) between 1 and 90)`
  - `create unique index daily_lines_body_unique on bestie.daily_lines (body)`
- `create table bestie.member_lines`:
  - `member_id uuid not null references bestie.members(id) on delete cascade`
  - `line_id uuid not null references bestie.daily_lines(id) on delete cascade`
  - `shown_on date not null`
  - `created_at timestamptz not null default now()`
  - `primary key (member_id, shown_on)`
- Also: `create index member_lines_line_idx on bestie.member_lines (line_id)`. RLS enabled and forced. `revoke all ... from public, anon, authenticated`, `grant select ... to authenticated`, `grant all ... to service_role`, and policy `member_lines_own` (select, `member_id = (select auth.uid())`).

- [ ] **Step 1: Write the failing twin test.** It fails before the migration exists.
  - The checks refuse `author 'amanda'`, `moment 'monday'`, a body of 91 characters and a blank body. They accept a full valid row (see the pattern `prove-a-constraint-accepts-before-proving-it-refuses`).
  - A second `member_lines` row for the same (Member, day) is refused.
  - `insert ... on conflict (member_id, shown_on) do nothing returning line_id`, followed by a select of the stored `line_id`, gives the first line both times (Review focus 2).
  - As `authenticated`, a Member reads only her own `member_lines` and can't insert any.
  - Deleting her `auth.users` row removes her `member_lines`.
  - The `completionDays` SQL, `select distinct (completed_at at time zone 'Asia/Dubai')::date ... where undone_at is null`, puts `2026-11-24 19:59:59Z` on 11-24 and `2026-11-24 20:00:00Z` on 11-25, and leaves out an undone Completion (Review focus 1).
- [ ] **Step 2:** Run `bash supabase/twin/run.sh`. Expected: FAIL in `morning_lines.test.sql`.
- [ ] **Step 3:** Write the migration.
- [ ] **Step 4:** Run `bash supabase/twin/run.sh`. Expected: every suite PASSED, including `MORNING LINES TESTS PASSED`.
- [ ] **Step 5:** Commit: `feat(#74): daily line tags and member_lines`.

### Task 4: `morning()` in the module, the store port and the memory adapter

**Files:**
- Modify: `supabase/functions/server/bestie.ts`. Add to the `BestieStore` interface, add `morning()`, add `streak` to `ProfileView`/`profile()`, and extend `createMemoryBestieStore`.
- Test: `supabase/functions/server/bestie.morning.test.ts`, plus the two Wrap-up burst cases in `supabase/functions/server/bestie.completion.test.ts`.
- Check first: whether `DayPlan.suggestions` can hold skipped or swapped rows. If it can, `wrapUpView` (Task 7) must filter them out.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces:
  - `BestieStore` gains:
    - `completionDays(memberId: string): Promise<string[]>`, Dubai dates of her live Completions.
    - `dailyLines(): Promise<DailyLine[]>`, the active lines.
    - `recentLines(memberId: string, sinceDate: string): Promise<{ lineId: string; shownOn: string }[]>`
    - `recordLine(memberId: string, lineId: string, shownOn: string): Promise<string>`, which returns the `line_id` stored for that day, whoever won.
    - `morningSignals(memberId: string): Promise<{ joinedAt: string; personal: boolean; lastCheckIn: { energy: Energy; goal: Goal | null } | null }>`. `personal` comes from her latest `personalisation` Consent row.
  - `export interface MeetUpSource { upcoming(): Promise<MeetUpRow[]> }`
  - `export interface MorningCard { line: { text: string; by: 'ren' | 'bestie' } | null; sky: { sunset: string; hot: boolean; hint: string }; meetUp: MeetUpView | null; streak: StreakView }`
  - `export type MorningOutcome = { outcome: 'morning'; card: MorningCard } | { outcome: 'notJoined' }`
  - `export async function morning(store: BestieStore, meetUps: MeetUpSource, user: { id: string }, now: Date): Promise<MorningOutcome>`
  - `ProfileView.streak: StreakView`

- [ ] **Step 1: Write the failing tests.** Use the memory store; seed lines through an option on `createMemoryBestieStore({ lines, consents, meetUps })`.
  - A non-Member gets `notJoined`.
  - With the Consent and a low-energy Check-in, a `low_energy` line is picked and recorded. A second call the same day returns the same line without recording again.
  - **Withdrawn Consent:** consent rows `true` then `false`. She gets the day's general line and `recentLines` stays empty (Review focus 3).
  - A line shown to her yesterday isn't picked today when another eligible line exists.
  - An empty bank gives `line: null` and the card still has `sky` and `streak`.
  - A `MeetUpSource` that throws gives `meetUp: null`, not a rejection (Review focus 5).
  - The prototype "Streak and the rest day" scenario run through the module: check in and complete on 11-23 and 11-24, then `morning()` on 11-26 shows `count 2, restUsedThisWeek: true`, and on 11-27 shows `count 0`. `profile().profile.streak` agrees.
  - An undone Completion doesn't count toward the Streak, and a flagged one does.
  - **Wrap-up burst cases** (in `bestie.completion.test.ts`):
    - Check in at 08:00 Dubai time, then complete four items at 21:00, 21:02, 21:04 and 21:06: no flag.
    - Check in at 19:00 with four items totalling 125 minutes, all completed between 21:05 and 21:10: flagged, because the last tick is before 19:00 + 125 + 15 minutes.
- [ ] **Step 2:** Run `vitest run supabase/functions/server/bestie.morning.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `morning()`.
  1. Read the signals, `completionDays`, the lines, recent lines from the last 14 days, and the sums from `progressInputs(id, null)`. The weakest Pillar is the lowest sum, with ties in `PILLARS` order.
  2. Work out the Streak, the moment and the context, then pick the line.
  3. If `personal` and a line was picked, call `recordLine`. If the returned id differs, use that line instead.
  4. Wrap the Meet up source in a try/catch.
- [ ] **Step 4:** Run `npx -y pnpm@10.34.3 test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(#74): morning() with picked lines, sky, Meet up and Streak`.

### Task 5: Postgres adapter, Meet up source and route

**Files:**
- Modify: `supabase/functions/server/index.tsx`. Add the five store methods to `postgresBestieStore`, a `kvMeetUps: MeetUpSource`, and `GET /make-server-a278ea32/bestie/morning`.
- Modify: `supabase/functions/server/storeSql.test.ts`. Extend the guard: the new statements contain no `JSON.stringify`.

**Interfaces:**
- Consumes: Task 3's schema, Task 4's port.
- Produces: `GET /bestie/morning` →
  - 200 `{ success: true, card: MorningCard }`
  - 401 when signed out
  - 409 `'Join Oriri to see your morning.'`
  - 500 `'Could not load your morning.'` (logged as `bestie/morning failed:`)

- [ ] **Step 1:** Write the SQL exactly as Task 3's twin test runs it. `recordLine` does `insert ... on conflict (member_id, shown_on) do nothing`, then selects the stored `line_id` in the same transaction. `morningSignals` reads `members.created_at`, the latest `consents` row with `purpose = 'personalisation'`, and the latest `check_ins` row.
- [ ] **Step 2:** `kvMeetUps.upcoming()` reads `kv.getByPrefix('wellness:moment:')` and `kv.getByPrefix('wellness:event:')` and tags each row `kind`. Bad rows are left for `thisWeeksMeetUp` to drop.
- [ ] **Step 3:** Add the route, shaped like `/bestie/profile`.
- [ ] **Step 4:** Run `npx -y pnpm@10.34.3 test` and `bash supabase/twin/run.sh`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(#74): /bestie/morning on the edge function`.

### Task 6: The seed bank in Ren's voice

**Files:**
- Create: `supabase/functions/server/linesSeed.ts`, which exports `DAILY_LINES_SEED: Omit<DailyLine, 'id' | 'author' | 'showOn'>[]` and `linesSeedSql(): string`.
- Create: `supabase/functions/server/linesSeed.test.ts`
- Create: `docs/lines/2026-11-ren-voice.md`. It holds the voice brief (traits, plus at most 4 quotes from her writing, each under 15 words), then every line as `- [moment · goal · pillar · energy] body`.
- Create: `supabase/migrations/20261121000300_bestie_daily_lines_seed.sql`, containing `linesSeedSql()` verbatim.

- [ ] **Step 1: Write the failing tests**, following `catalogueSeed.test.ts`:
  - The migration contains `linesSeedSql()`, and the review file lists exactly the seed bodies in the same order (`keep-a-duplicated-list-honest-with-an-equality-test`).
  - At least 60 lines, and at least 14 untagged `any` lines, so the general line doesn't repeat within two weeks.
  - At least 2 lines for each moment, each Goal, each Pillar and each energy.
  - Every body is at most 90 characters and unique. Emoji: at most one, only ✨ or 🌸, only at the end, on at most 40% of the lines.
  - No body matches `/\b(weight|kg|calorie|diet|skinny|fat|detox|cure|heal|supplement|ozempic|anxiety|news|war|I|my|me)\b/i`. The first-person words are banned too, because the lines are Bestie's.
  - The test must fail on a fixture with a banned word and on one over 90 characters (`red-proof-a-test-by-breaking-the-rule-it-guards`).
- [ ] **Step 2:** Run `vitest run supabase/functions/server/linesSeed.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the lines.** Load the skill `marketing:content-creation` to draft and `marketing:brand-review` to check every line against the voice brief.
  - Draw on the traits: she opens with a question, keeps things small and steady, gives permission rather than pressure, treats the Dubai seasons positively, and talks warmly to "Stepsisters".
  - `linesSeedSql()` emits one `insert into bestie.daily_lines (body, author, goal, pillar, energy, moment) values ... on conflict (body) do nothing;` with dollar-quoted bodies.
- [ ] **Step 4:** Run `npx -y pnpm@10.34.3 test` and `bash supabase/twin/run.sh`. Expected: PASS. Add a twin assertion that `count(*) >= 60`.
- [ ] **Step 5:** Commit: `feat(#74): seed bank of daily lines in Ren's voice (for review)`.

### Task 7: Function client, MorningCard and the Wrap-up

**Files:**
- Modify: `src/app/wellness/functionClient/bestie.ts` and `types.ts`. Add `morning(): Promise<Result<MorningClientOutcome>>`, where `MorningClientOutcome = { outcome: 'morning'; card: MorningCard } | { outcome: 'signedOut' } | { outcome: 'notJoined' }`.
- Test: `src/app/wellness/functionClient/bestie.test.ts` (against `fakeTransport`).
- Create: `src/app/wellness/bestie/morningView.ts`, with pure functions:
  - `streakLine(s: StreakView): string`
  - `isWrapUpTime(now: Date): boolean`, true from 18:00 Dubai time
  - `wrapUpView(plan: DayPlan, now: Date): { open: SuggestionView[]; done: SuggestionView[]; summary: string }`
- Test: `src/app/wellness/bestie/morningView.test.ts`
- Create: `src/app/wellness/bestie/MorningCard.tsx`
- Modify:
  - `src/app/wellness/bestie/InputScreen.tsx`: card above the Check-in, for Members.
  - `src/app/wellness/bestie/DayScreen.tsx`: the card replaces `Affirmation` for Members, and the Wrap-up mode reuses the existing `PlanRow`, `ReflectionBox` and undo.
  - `src/app/wellness/profile/MemberProfilePage.tsx`: the Streak line.

- [ ] **Step 1: Write the failing tests.**
  - Client: 200 returns the card, 401 gives `signedOut`, 409 gives `notJoined`, and a 500 stays an error.
  - `streakLine`:
    - `{count:5, restUsedThisWeek:false}` → `'5-day Streak · rest day available'`
    - `{count:5, restUsedThisWeek:true}` → `'5-day Streak · rest day used, Streak kept'`
    - `{count:0}` → `'New Streak starts with today\'s first tick'`
  - `isWrapUpTime`: 17:59 Dubai → false, 18:00 → true, 23:59 → true, 00:00 → false.
  - `wrapUpView`: open holds the suggestions with `done === null`, done holds the rest, and the summary is `'3 of 4 done'`. The screen appends `' · ' + streakLine` to it.
- [ ] **Step 2:** Run `vitest run src/app/wellness`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `MorningCard` shows the line, with `· Ren` only when `by === 'ren'`. Then `sky.hint`, the Meet up (title, day, time, location, opening `url` when present), and `streakLine`.
  - If the call fails, the card renders nothing and the Check-in or plan below is untouched.
  - The Day screen shows the Wrap-up when `isWrapUpTime(now)` or after "Wrap up my day" is tapped. Each item is ticked one at a time. No complete-all.
- [ ] **Step 4:** Run `npx -y pnpm@10.34.3 test` and `npx -y pnpm@10.34.3 build`. Expected: PASS. Then check it in the browser preview as a Member (the card, the Wrap-up at a faked 18:00, phone width), and as a visitor (still sees `Affirmation`).
- [ ] **Step 5:** Commit: `feat(#74): Morning card, evening Wrap-up and Streak on the site`.

### Task 8: Tickets and the PR

- [ ] File three tickets with `gh` on `Krackie8/oriri-web` as sub-issues of #67:
  - "Admin revamp: daily lines, sets and scheduling, then the Catalogue"
  - "Bestie writes daily lines with a model, in Ren's voice"
  - "Personal weighting ignores the personalisation Consent"
- [ ] Comment on #74 that the Admin criterion moved to the Admin revamp ticket.
- [ ] Open the PR from `feat/74-morning-wrapup-streak`. List both migrations, the review file to read with Ren, and that nothing is applied or deployed.

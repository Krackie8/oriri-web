# Admin piece 2: Members + Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two new Admin sections at `oriri.me/admin`:
- **Members:** find a Member and see her details.
- **Team:** list, add and remove admins, guarded by a recent sign-in, a notice to every admin, and a record of each change.

**Architecture:**
- **Server:** new routes in the existing `admin` edge function (Hono, `supabase/functions/admin/`). Pure rules live in Deno-free modules that vitest drives. Thin adapters in `index.tsx` touch Postgres and Auth.
- **Site:** two new screens in `src/app/admin/`.
- **Database:** one migration revokes Members' write grants on `public.user_roles` and adds an append-only `bestie.team_changes`.
- **Not touched:** the Member function `server` (`make-server-a278ea32`) is neither changed nor deployed.

**Tech Stack:**
- Deno edge function: Hono, `npm:postgres@3.4.5`, `@supabase/supabase-js@2`, denomailer.
- Site: React + Vite + Tailwind.
- Tests: vitest (`npm test`), plus the Postgres twin (`bash supabase/twin/run.sh`, needs Docker).

**Spec:** `docs/superpowers/specs/2026-11-23-admin-members-team-design.md` (approved 2026-11-23). Parent: `docs/superpowers/specs/2026-11-22-admin-revamp-design.md`. Rulings: vault DEC-014, DEC-015, DEC-016.

## Global Constraints

- **Live is shared.** `lemtlurqzmjdahbhunhz`, `make-server-a278ea32` and `admin` serve staging and production. **Nothing is applied, deployed, pushed or merged without Khairul's yes.** Granting or removing an admin role outside the Team screen is Khairul's to approve. Auth settings are his to change.
- **Admin is a live `admin` row in `public.user_roles`**, checked on every request with `hasAdminRole` (`supabase/functions/server/adminRole.ts`). Never `user_metadata`, never an email.
- **`service_role` cannot select `auth.users`.** Every read of `auth.users` runs as the connection user in `db().begin('read only', …)` with no role switch. Writes to `public.user_roles` and `bestie.team_changes` run in `db().begin(…)` starting with `` tx`set local role service_role` ``.
- **`profiles` links to the auth user by `user_id`**, never `profiles.id`.
- **The repo is public.** No admin's email goes in any committed file, test fixture or commit message. Use `example.test` addresses.
- **Wording:** no IDs, codes or technical words on screen. Dates read like "14 Nov", times are Dubai time (UTC+4). Copy is short and plain.
- **Fresh sign-in window:** **10 minutes** (600 s), for Team changes only.
- **Team:** you can't remove yourself, and the last admin is never removed. "Recent changes" shows the last 20.
- **Members:** at most 50 rows, newest first, matched case-insensitively on name or email. No pagination.
- **`server` is not modified.** Pure modules may be imported from `../server/` (as piece one imports `adminRole.ts`). Nothing in `supabase/functions/server/` changes.

## Review Focus

1. **A token whose newest `amr` entry is `token_refresh`, or with no `amr`.** It must not count as fresh by its refresh time. Only real sign-in methods count; with none, the answer is "sign in again" (Task 2 test).
2. **Two admins removing the last two others at the same moment.** One must be refused as "last admin" and one admin must remain (Task 1 twin test, Task 5 adapter: count and delete in one transaction under `for update`).
3. **Adding an email in a different case, or with spaces, that matches an existing account.** It must reuse that account, not create a second one (Task 5 test, Task 1 lookup is `lower(email)`).
4. **A Member whose display name is her email, or who has no profile.** Members must show no name rather than the email twice (Task 4 test, reusing `firstNameOf`'s rule).
5. **A Member with no check-ins, completions, consents or membership row.** Details must still render, with zeros, "Not asked" and "Free", never a 500 (Task 4 test, Task 3 twin test).

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20261123000100_admin_team.sql` | Revoke `user_roles` writes from `anon`/`authenticated`; create `bestie.team_changes` (append-only). |
| `supabase/tests/admin_team.test.sql` | Twin test: grants, append-only trigger, `TEAM_*_SQL` and `MEMBERS_*_SQL` behaviour. |
| `supabase/functions/admin/fresh.ts` (+ test) | `signedInAt(claims)`, `isFresh(signedInAt, nowMs)`. |
| `supabase/functions/admin/membersQuery.ts` (+ test) | `MEMBERS_LIST_SQL`, `MEMBER_DETAIL_SQL` text, embedded in the twin test. |
| `supabase/functions/admin/members.ts` (+ test) | Member types; `toListItem`, `toDetail`; route handlers. |
| `supabase/functions/admin/teamQuery.ts` (+ test) | `TEAM_LIST_SQL`, `TEAM_GRANT_SQL`, `TEAM_REMOVE_SQL`, `TEAM_CHANGES_SQL`. |
| `supabase/functions/admin/team.ts` (+ test) | Team rules, ports and route handlers; email wording. |
| `supabase/functions/admin/app.ts` | Mount the new routes; `AdminUser.signedInAt`. |
| `supabase/functions/admin/index.tsx` | Real adapters for the new ports. |
| `src/app/wellness/functionClient/admin.ts` | Site copies of the types; new client methods. |
| `src/app/admin/view.ts` (+ test) | Pure wording helpers for the two screens. |
| `src/app/admin/MembersScreen.tsx`, `TeamScreen.tsx` | The screens. |
| `src/app/admin/AdminSite.tsx`, `tiles.ts`, `HomeScreen.tsx` | Routing, tiles live, tile lines, return-to-Team after a re-sign-in. |
| `src/app/components/AdminDashboard.tsx`, `src/app/components/admin/AdminManagement.tsx` | Legacy: drop the Users and Admin tabs; delete the file. |

---

### Task 1: Migration, `user_roles` lock and the Team change record

**Files:**
- Create: `supabase/migrations/20261123000100_admin_team.sql`
- Create: `supabase/tests/admin_team.test.sql` (grants and trigger part here; Tasks 3 and 5 append their query checks)

**Interfaces:**
- Produces table `bestie.team_changes (id bigint generated always as identity primary key, actor_id uuid not null, target_id uuid not null, target_email text not null, action text not null check (action in ('add','remove')), created_at timestamptz not null default now())`. It has no foreign keys.
- Grants: `select, insert` to `service_role` only; `revoke all … from public, anon, authenticated`. RLS is on, with no policies.
- Trigger `bestie.team_changes_append_only` refuses `UPDATE` and `DELETE` with `raise exception 'bestie.team_changes is append-only (% refused)'`.
- `revoke insert, update, delete, truncate on public.user_roles from anon, authenticated;` The `select` grant and the own-row policy stay.

- [ ] **Step 1: Write the failing twin test** (`admin_team.test.sql`, the same `pg_temp.check` style as `admin_overview.test.sql`, all inside `begin … rollback`). It asserts:
  - `has_table_privilege('authenticated','public.user_roles','insert') = false`, and the same for `update` and `delete`; `anon` likewise.
  - `has_table_privilege('authenticated','public.user_roles','select') = true`.
  - `has_table_privilege('service_role','bestie.team_changes','insert') = true`, and `authenticated` has neither `select` nor `insert`.
  - The sign-up trigger still works: inserting an `auth.users` row creates a `user_roles` row with role `user` (the twin's `handle_new_user`).
  - As `service_role`, one insert into `team_changes` succeeds; `update` and `delete` of it each raise `append-only`.
- [ ] **Step 2: Run** `bash supabase/twin/run.sh`. Expected: it fails at the first `team_changes` check (the relation doesn't exist).
- [ ] **Step 3: Write the migration** with a header comment saying why (DEC-015 second lock, the Team record), per Interfaces.
- [ ] **Step 4: Run** `bash supabase/twin/run.sh`. Expected: every `ok -` line, exit 0.
- [ ] **Step 5: Commit** `git commit -m "Admin Team: lock user_roles writes, add bestie.team_changes (#100)"`

### Task 2: Fresh sign-in check

**Files:**
- Create: `supabase/functions/admin/fresh.ts`, `supabase/functions/admin/fresh.test.ts`
- Modify: `supabase/functions/admin/app.ts` (the `AdminUser` interface), `supabase/functions/admin/index.tsx` (`userFromToken`)

**Interfaces:**
- `export const FRESH_MS = 600_000`
- `export function signedInAt(claims: unknown): number | null`. This is the newest `amr[].timestamp` (seconds → ms) whose `method` is not `'token_refresh'`. It returns null when `amr` is missing, empty or malformed.
- `export function isFresh(signedInAtMs: number | null, nowMs: number): boolean`. True only when it's non-null and `0 <= nowMs - signedInAtMs <= FRESH_MS`. A future timestamp more than 60 s ahead counts as not fresh.
- `AdminUser` becomes `{ id: string; email: string; signedInAt: number | null }`.

- [ ] **Step 1: Write failing tests** in `fresh.test.ts`:
  - `signedInAt({ amr: [{ method: 'otp', timestamp: 1000 }] }) === 1_000_000`
  - newest wins: `[{method:'otp',timestamp:2000},{method:'otp',timestamp:1000}]` → `2_000_000`
  - `[{method:'token_refresh',timestamp:3000},{method:'magiclink',timestamp:1000}]` → `1_000_000`
  - `{}`, `{ amr: 'x' }`, `{ amr: [{ method: 'otp' }] }` and `null` → `null`
  - `isFresh(t, t + 600_000) === true`, `isFresh(t, t + 600_001) === false`, `isFresh(null, t) === false`, `isFresh(t + 120_000, t) === false`
- [ ] **Step 2: Run** `npx vitest run supabase/functions/admin/fresh.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `fresh.ts`. In `index.tsx`, `userFromToken` keeps `supabase.auth.getUser(token)` as the check that the token is genuine. Only after it succeeds does it base64url-decode the JWT payload and pass it to `signedInAt`; a decode failure gives `signedInAt: null`. Update every fake user in `app.test.ts`/`me.test.ts` to include `signedInAt`.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `git commit -m "Admin: read the sign-in time from the verified token (#100)"`

### Task 3: Members SQL

**Files:**
- Create: `supabase/functions/admin/membersQuery.ts`, `supabase/functions/admin/membersQuery.test.ts`
- Modify: `supabase/tests/admin_team.test.sql` (append)

**Interfaces:**
- `MEMBERS_LIST_SQL`, with params `$1::text` = the search ('' = all, already lower-cased and trimmed). It returns up to 50 rows newest first: `id uuid, email text, display_name text|null, joined timestamptz, last_sign_in_at timestamptz|null`. It covers only `bestie.members` joined to `auth.users`, with `left join public.profiles p on p.user_id = m.id`. It matches when `$1 = ''` or `lower(email)` contains `$1` or `lower(display_name)` contains `$1`. `%` and `_` in `$1` are escaped, so they match literally.
- `MEMBER_DETAIL_SQL`, with params `$1::uuid`. It returns one row or none:
  - Account: `email, display_name, joined, email_confirmed boolean, last_sign_in_at, banned boolean` (`banned_until > now()`), `providers text[]` (from `raw_app_meta_data->'providers'`).
  - Profile: `home_area, instagram_handle, adult_confirmed boolean`.
  - `consents jsonb`: `{purpose: granted}`, the latest row per purpose.
  - Activity: `check_ins int, last_check_in timestamptz|null, completions int` (live, `undone_at is null`), `flagged int` (live and flagged).
  - Progress: `completion_days text[]` (distinct Dubai dates of live completions, `YYYY-MM-DD`), `sums jsonb` (pillar → sum of `bestie.points.amount`), `recorded jsonb` (her `member_levels` rows as `{kind,pillar,level,shape,tier,reachedAt}`).
  - `membership_status text|null`.
- Both are single read-only selects with no `;`. They run inside `begin('read only')` as the connection user.

- [ ] **Step 1: Write failing tests.**
  - `membersQuery.test.ts`: both statements start with `with`/`select`, contain no write keyword and no `;`, and are embedded unchanged in `admin_team.test.sql` (the same pattern as `overviewQuery.test.ts`).
  - Twin part: seed 3 Members, one with profile name `Sara Ali`, one whose display name is her email, and one with no profile, check-ins, consents or membership. Assert:
    - the `''` list returns 3, newest first;
    - `'sara'` and `'SAR'` (pre-lowered by the caller to `'sar'`) return Sara;
    - `'%'` returns 0;
    - an auth user with no `bestie.members` row isn't listed;
    - the empty Member's detail has `check_ins = 0`, `completions = 0`, `consents = '{}'`, `membership_status is null`;
    - two consent rows for `marketing` give the later one's value;
    - an undone completion isn't counted;
    - an unknown uuid returns no row.
- [ ] **Step 2: Run** `npx vitest run supabase/functions/admin/membersQuery.test.ts` and `bash supabase/twin/run.sh`. Expected: both FAIL.
- [ ] **Step 3: Write the two statements** and embed them in the twin file.
- [ ] **Step 4: Run** both again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin Members: list and detail queries (#100)"`

### Task 4: Members rules and routes

**Files:**
- Create: `supabase/functions/admin/members.ts`, `supabase/functions/admin/members.test.ts`
- Modify: `supabase/functions/admin/app.ts`, `supabase/functions/admin/index.tsx`

**Interfaces:**
- Consumes: `firstNameOf` (`me.ts`); `streakOf` (`../server/streak.ts`); `levelsFrom`, `statusOf`, `statusName`, `emptySums`, `type Tier, RecordedRow, Levels` (`../server/progress.ts`); `requireAdmin` (`app.ts`); `dubaiDate` (`overview.ts`).
- Produces:
  ```ts
  export interface MemberListItem { id: string; name: string | null; email: string; joined: string; lastSeen: string | null; tags: ('team' | 'test')[] }
  export interface MemberDetail {
    name: string | null; email: string; tags: ('team' | 'test')[]
    account: { joined: string; emailConfirmed: boolean; lastSignIn: string | null; signsInWith: string[]; blocked: boolean }
    profile: { area: string | null; instagram: string | null; adultConfirmed: boolean }
    consents: Record<'terms' | 'location' | 'wellness_signals' | 'personalisation' | 'push' | 'marketing', boolean | null>
    bestie: { checkIns: number; lastCheckIn: string | null; done: number; streak: number; status: string; photosReported: number }
    membership: string // 'Free' when none; else the status in words, e.g. 'Trial', 'Paying', 'Payment overdue', 'Cancelled', 'Ended'
  }
  export interface MembersDeps {
    list(q: string): Promise<Record<string, unknown>[]>          // MEMBERS_LIST_SQL rows
    detail(id: string): Promise<Record<string, unknown> | undefined> // MEMBER_DETAIL_SQL row
    adminIds(): Promise<string[]>
    testEmails(): Promise<Set<string>>                          // lower-cased, from bestie:leadflag:* with test === true
    now?: () => Date
  }
  export function toListItem(row, adminIds: Set<string>, testEmails: Set<string>): MemberListItem
  export function toDetail(row, id: string, adminIds: Set<string>, testEmails: Set<string>, today: string): MemberDetail
  export function cleanQuery(q: unknown): string // trim, lower-case, max 100 chars, '' for non-strings
  ```
  Dates go out as ISO strings; the site formats them. `name` uses `firstNameOf`'s rule on the whole name: null when empty or containing `@`, otherwise the trimmed full display name, at most 60 characters. `status` is `statusName(statusOf(levelsFrom(sums, floor), sums))`, where `floor` is a **local copy** of `bestie.ts`'s private `floorOf` (copied, with a comment naming its source; `server` isn't edited).
- Routes (both `requireAdmin` first; 500 answers say only "Could not load Members"):
  - `GET /admin/members?q=` → `{ success: true, data: MemberListItem[] }`
  - `GET /admin/members/:id` → `{ success: true, data: MemberDetail }`. A non-uuid `:id` or no row → 404 `{ error: 'Not found' }`.

- [ ] **Step 1: Write failing tests** in `members.test.ts`, using a Hono app with fake deps:
  - no token → 401; a non-admin → 403, and `list` is never called;
  - `q` of `'  SaRa '` reaches `list` as `'sara'`;
  - an admin's row has `tags: ['team']`, and a test email (in any case) `['test']`;
  - `display_name: 'x@y.test'` → `name: null`;
  - an empty-activity row → `checkIns: 0, done: 0, streak: 0, photosReported: 0, membership: 'Free'`, and every consent `null`;
  - a `sums` of `{move: 30}` gives the same `status` string the Member app's `profile()` would (assert against `statusName(statusOf(levelsFrom({...emptySums(), move: 30}, {}), {...emptySums(), move: 30}))`);
  - `:id` `'not-a-uuid'` → 404, and `detail` is never called;
  - `detail` throwing → 500 with body `{ success: false, error: 'Could not load Members' }`.
- [ ] **Step 2: Run** `npx vitest run supabase/functions/admin/members.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `members.ts`. Add `members: MembersDeps` to `AdminDeps` and mount the routes in `createAdminApp`. In `index.tsx`:
  - `list` and `detail` run their SQL in `db().begin('read only', …)`.
  - `adminIds` reuses the Overview's adapter.
  - `testEmails` reads `kv.getByPrefix('bestie:leadflag:')` as `loadOverview` does. Extract that piece of `overview.ts` into an exported `testEmailsFrom(kv)` and use it in both places.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `git commit -m "Admin Members: routes for the list and her details (#100)"`

### Task 5: Team SQL, rules and routes

**Files:**
- Create: `supabase/functions/admin/teamQuery.ts`, `teamQuery.test.ts`, `team.ts`, `team.test.ts`
- Modify: `supabase/tests/admin_team.test.sql` (append), `app.ts`, `index.tsx`

**Interfaces:**
- SQL (`teamQuery.ts`, each embedded in the twin test and checked identical):
  - `TEAM_LIST_SQL` (read-only, connection user). For live admin rows it returns `user_id, email, display_name, since (user_roles.created_at), last_sign_in_at`, ordered by `since`.
  - `TEAM_GRANT_SQL` (`$1 actor uuid, $2 target uuid, $3 target_email text`; as `service_role`). In one statement: `insert … ('admin', expires_at null) on conflict (user_id, role) do update set expires_at = null`, then insert a `team_changes` row `'add'`.
  - `TEAM_REMOVE_SQL` (`$1 actor, $2 target, $3 target_email`; as `service_role`). It locks live admin rows `for update`. If the target isn't a live admin it returns `'notAdmin'`; if it's the only live admin, `'last'`. Otherwise it deletes the target's admin row, inserts a `team_changes` `'remove'` row and returns `'removed'`. The whole statement returns one column `result`.
  - `TEAM_CHANGES_SQL` (read-only, connection user). The last 20 changes, newest first: `actor_id, actor_email, actor_name, target_email, action, created_at`. The names and emails come from a left join, so a deleted account still shows its recorded `target_email`.
- `team.ts`:
  ```ts
  export interface TeamMember { userId: string; name: string | null; email: string; since: string; lastSignIn: string | null; isYou: boolean }
  export interface TeamChange { who: string; action: 'add' | 'remove'; whom: string; at: string }
  export interface TeamDeps {
    list(): Promise<Record<string, unknown>[]>
    changes(): Promise<Record<string, unknown>[]>
    findUserIdByEmail(email: string): Promise<string | null>   // lower(email), read-only, as in signInLink
    createAccount(email: string): Promise<string>              // auth.admin.createUser({ email, email_confirm: true }); returns id
    grant(actorId: string, targetId: string, targetEmail: string): Promise<void>
    remove(actorId: string, targetId: string, targetEmail: string): Promise<'removed' | 'last' | 'notAdmin'>
    sendMail(to: string, subject: string, text: string, html: string): Promise<void>
    now?: () => number
  }
  export const TEAM_MAIL: { addedSubject: string; noticeSubject: (who: string, verb: 'added' | 'removed', whom: string) => string }
  ```
  `who`/`whom` are the first name when there is one, otherwise the email.
- Routes (all `requireAdmin` first; the 500 body is `{ success: false, error: 'Could not change the team' }` or `'Could not load the team'`):
  - `GET /admin/team` → `{ success: true, data: { members: TeamMember[], changes: TeamChange[] } }`.
  - `POST /admin/team` with body `{ email }`:
    1. Not fresh (`isFresh(user.signedInAt, now)` false) → 403 `{ success: false, error: 'reauth' }`, and nothing else runs.
    2. A bad email (same `EMAIL_RE` and 200-character cap as `signInLink.ts`) → 400 `{ error: 'invalid' }`.
    3. Already a live admin → 200 `{ data: { result: 'already' } }`, with no grant and no mail.
    4. Otherwise it finds or creates the account, grants, then mails: the welcome to the new admin, then a notice to every admin including the new one. → 200 `{ data: { result: 'added' } }`.
  - `DELETE /admin/team/:userId`:
    1. Not fresh → 403 `reauth`.
    2. `:userId === user.id` → 400 `{ error: 'self' }`.
    3. A non-uuid → 404.
    4. It reads the admin list first (the removed admin gets the notice too), then calls `remove`. `'last'` → 409 `{ error: 'last' }`; `'notAdmin'` → 404; `'removed'` → notice mail to the pre-removal list → 200 `{ data: { result: 'removed' } }`.
  - **Mail failures** are logged with no address in the log and never undo or fail a change.

- [ ] **Step 1: Write failing tests.**
  - Twin part (as `service_role` inside the test):
    - `TEAM_GRANT_SQL` twice for the same target leaves one admin row and two `add` records;
    - granting a target with an expired admin row makes it live;
    - `TEAM_REMOVE_SQL` on the only admin returns `last` and deletes nothing;
    - with two admins, removing one returns `removed` and writes one `remove` record;
    - removing a non-admin returns `notAdmin`;
    - `TEAM_CHANGES_SQL` returns newest first, capped at 20 (seed 21).
  - `team.test.ts` (Hono with fakes):
    - no token → 401; non-admin → 403;
    - stale `signedInAt` → 403 `reauth`, with `findUserIdByEmail`, `grant` and `sendMail` never called;
    - `'  New@Example.TEST '` is looked up as `'new@example.test'`, and when it's found `createAccount` isn't called;
    - an unknown email calls `createAccount` once, then `grant` with the new id;
    - an existing live admin → `already`, with no grant and no mail;
    - an added admin gets 1 welcome mail + N+1 notices, where N is the admin count before;
    - removing self → 400 `self`, and `remove` isn't called;
    - `remove` returning `last` → 409;
    - a removed admin is among the notice recipients;
    - `sendMail` rejecting still answers 200 `added`;
    - `GET` marks `isYou` on the caller's own row.
- [ ] **Step 2: Run** `npx vitest run supabase/functions/admin/team*.test.ts` and `bash supabase/twin/run.sh`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `index.tsx` adapters: `grant`/`remove` run in `db().begin(async tx => { await tx\`set local role service_role\`; return tx.unsafe(SQL, [...]) })`, while `list`/`changes`/`findUserIdByEmail` run in `begin('read only')`. `sendMail` is the existing one.
  - Email wording is short:
    - **Welcome:** subject "You've been added to Oriri Admin", body "You can now sign in at oriri.me/admin with this email."
    - **Notice:** subject "{who} {verb} {whom} on Oriri Admin", body "If you didn't expect this, tell the team."
  - Every interpolated name is HTML-escaped in `html` (reuse `esc` from `signInLink.ts`, exported).
- [ ] **Step 4: Run** `npm test` and `bash supabase/twin/run.sh`. Expected: all pass.
- [ ] **Step 5: Commit** `git commit -m "Admin Team: list, add and remove admins, guarded (#100)"`

### Task 6: Site client

**Files:**
- Modify: `src/app/wellness/functionClient/admin.ts`
- Create: `src/app/wellness/functionClient/admin.test.ts`

**Interfaces:**
- Copy `MemberListItem`, `MemberDetail`, `TeamMember`, `TeamChange` exactly from Tasks 4–5. Add a comment that they mirror the Deno files, as `Overview` does (DEC-016 ruling 9).
- New methods on `createAdmin(core)`:
  - `members(q: string): Promise<Result<MemberListItem[]>>` → `GET /members?q=<encodeURIComponent(q)>`
  - `member(id: string): Promise<Result<MemberDetail>>` → `GET /members/<encodeURIComponent(id)>`
  - `team(): Promise<Result<{ members: TeamMember[]; changes: TeamChange[] }>>` → `GET /team`
  - `addToTeam(email: string): Promise<Result<'added' | 'already'>>` → `POST /team`
  - `removeFromTeam(userId: string): Promise<Result<'removed'>>` → `DELETE /team/<id>`
  - `export function teamProblem(e: FunctionError): 'reauth' | 'invalid' | 'self' | 'last' | 'other'` reads `(e.details as {error?})?.error`.
- Paths carry no `/admin` prefix (DEC-016 ruling 6).

- [ ] **Step 1: Write failing tests**, driving `createAdmin` with the in-memory fake transport (`fakeTransport.ts`):
  - each method's method and path, including a `q` of `'a b&c'` encoded;
  - `addToTeam` returns `'already'` from `{ data: { result: 'already' } }`;
  - `teamProblem` maps a 403 `{ error: 'reauth' }` to `'reauth'` and an unknown body to `'other'`.
- [ ] **Step 2: Run** `npx vitest run src/app/wellness/functionClient/admin.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin client: Members and Team calls (#100)"`

### Task 7: Members and Team screens

**Files:**
- Modify: `src/app/admin/view.ts`, `src/app/admin/view.test.ts`, `tiles.ts`, `HomeScreen.tsx`, `AdminSite.tsx`
- Create: `src/app/admin/MembersScreen.tsx`, `src/app/admin/TeamScreen.tsx`

**Interfaces:**
- `view.ts` adds:
  - `dayWord(iso: string, now?: Date): string`: "today", "yesterday", or "14 Nov" (Dubai date; the year is added when it isn't this year: "14 Nov 2025").
  - `timeWord(iso: string): string`: "09:12", Dubai.
  - `lastSeenWord(iso: string | null, now?: Date): string`: "Never" or `Last seen ${dayWord}`.
  - `consentWord(v: boolean | null): '✓' | '✗' | 'Not asked'`.
  - `CONSENT_LABELS`: `{ terms: 'Terms', location: 'Location', wellness_signals: 'Wellness', personalisation: 'Personalisation', push: 'Push', marketing: 'Marketing' }`.
  - `signsInWithWord(providers: string[]): string`: `email` → "email link", `google` → "Google", others → "another way". Joined with " and ".
  - `teamProblemWord(p): string`: `reauth` → "For safety, sign in again to change the team."; `invalid` → "That doesn't look like an email address."; `self` → "You can't remove yourself."; `last` → "The team needs at least one admin."; `other` → "That didn't work. Try again."
  - `AFTER_SIGN_IN_KEY = 'oriri-admin-after'`.
- `tiles.ts`: `members` and `team` become `live: true`.
- `HomeScreen`: the Members tile line is "{n} Members" (`overview.members.total`). The Team tile line is "{n} admins", from `adminClient.team()` called once when Home shows (it reads "Team" until it answers or if it fails). Neither has a pill.
- `AdminSite`:
  - `screen` becomes `'home' | 'overview' | 'members' | 'team'`, with "← Home" on each.
  - On a `reauth` problem, Team shows `teamProblemWord('reauth')` and a "Send me a sign-in link" button. It calls `adminClient.requestLink(<her email from the session>)` and writes `localStorage[AFTER_SIGN_IN_KEY] = 'team'` (in try/catch).
  - When the screen first becomes `home`, if the key reads `'team'`, it removes the key and opens Team.
- `MembersScreen`: a search box (debounced 300 ms) and a list (name, else email; email; "Joined {dayWord}"; `lastSeenWord`; tag pills "Team"/"Test"). A tapped row opens the details as in the spec sketch, with a "← Members" back link. Loading reads "One moment…"; an error reads "Couldn't load Members." with "Try again". The page shows no IDs.
- `TeamScreen`:
  - Rows: name or email; "Admin since {dayWord}"; last sign-in.
  - A "Remove" button on every row except `isYou`. It asks "Remove {name} from the team?" with a confirm/cancel pair before calling.
  - The add form: an email field and an "Add" button. Results: "Added." / "Already on the team." / `teamProblemWord`.
  - "Recent changes": `{dayWord} {timeWord}  {who} added|removed {whom}`.

- [ ] **Step 1: Write failing tests** in `view.test.ts` for every new helper:
  - `dayWord` for today, yesterday, a date this year and one last year, using a fixed `now` across the UTC/Dubai midnight edge (`2026-11-22T21:30:00Z` is 23 Nov in Dubai);
  - `lastSeenWord(null) === 'Never'`;
  - `consentWord(null) === 'Not asked'`;
  - `signsInWithWord(['email','google']) === 'email link and Google'`;
  - each `teamProblemWord` string exactly as above.
- [ ] **Step 2: Run** `npx vitest run src/app/admin/view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, then the screens and the `AdminSite` wiring, in the piece-one look (`wb-*` classes, blush `#C98A90`, the same `FOCUS` ring, readable on a phone).
- [ ] **Step 4: Run** `npm test` and `npm run build`. Expected: all pass; the build succeeds.
- [ ] **Step 5: Check in the browser** against the local dev server, with `admin` served by `supabase functions serve admin` if Docker is up, otherwise with the client's fake transport:
  - Home shows Members and Team as pressable;
  - Members search narrows the list and the details open;
  - Team shows the add form and no Remove on your own row;
  - a 403 `reauth` shows the sign-in-again line.

  Take a screenshot at phone width.
- [ ] **Step 6: Commit** `git commit -m "Admin: Members and Team screens (#100)"`

### Task 8: Remove Legacy's Users and Admin tabs

**Files:**
- Modify: `src/app/components/AdminDashboard.tsx` (the `TabsTrigger value="users"` and `value="admin"`, their `TabsContent` blocks, the `AdminManagement` import, and any handlers used only by them, e.g. `sendNotification`/`exportData('users')`, if nothing else uses them)
- Delete: `src/app/components/admin/AdminManagement.tsx`

- [ ] **Step 1: Check** `grep -rn "AdminManagement\|value=\"users\"\|value=\"admin\"" src`. It should find only the lines being removed.
- [ ] **Step 2: Remove** them.
- [ ] **Step 3: Run** `npm test` and `npm run build`. Expected: pass. Then `grep -rn AdminManagement src`, which should give no output.
- [ ] **Step 4: Commit** `git commit -m "Legacy admin: drop the Users and Admin tabs, replaced by Members and Team (#100)"`

### Task 9: Review, then release (each step needs Khairul's yes)

No code. This is the order and the proof for each step. Stop and ask before every numbered step that touches live.

- [ ] **Step 1: Whole-branch review.** Run `npm test`, `npm run build` and `bash supabase/twin/run.sh` green. Then `git diff main -- supabase/functions/server` is empty, and `git grep -n -i -E "@(gmail|hotmail)\.|account@oriri" -- ':!supabase/functions/admin/index.tsx' ':!supabase/functions/server'` finds no admin address added by this branch.
- [ ] **Step 2: Push the branch and open the PR** (yes). Bind it with the ccd_pr tools.
- [ ] **Step 3: Apply the migration on live** (yes).
  - Run it, then check read-only that `has_table_privilege('authenticated','public.user_roles','insert')` is false and that `bestie.team_changes` exists with the trigger.
  - Expect the admin count unchanged (2).
- [ ] **Step 4: Deploy `admin`** from the branch with `deploy-function.yml`, function `admin` (yes).
  - Before it, run `git diff e63ec72 HEAD -- supabase/functions/admin` and check that every change is this branch's.
  - Record the deployed commit.
- [ ] **Step 5: Merge** (yes), so the site goes to staging. On `new.oriri.me/admin`:
  - Sign in; Members lists 5; a detail opens.
  - **Check the sign-in-time assumption on live:** right after signing in, Team add works for a throwaway `example.test` address. Then remove it again: the "Recent changes" list shows both.
  - Wait past 10 minutes and a token refresh: an add is refused with the sign-in-again line. If a refresh resets `amr`'s time, stop and report; the design's fallback (the session's `created_at`) then needs a yes.
  - The throwaway account is left (a ban or delete is Khairul's call); name it in the report.
- [ ] **Step 6: Production** release via `deploy.yml` (yes). Sign in on www and open Members and Team.
- [ ] **Step 7: The main account's admin role** (yes, after Khairul has registered it on the main site): one `insert … on conflict do update set expires_at = null` by one-off SQL, not committed. Then check read-only that there are 3 live admins, and that the main account's sign-in link arrives.
- [ ] **Step 8: Record** the release in the vault (state, DEC-017 for rulings made while building).

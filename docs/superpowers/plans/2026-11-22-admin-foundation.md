# Admin foundation (#100, piece one) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ren and Khairul sign in at `oriri.me/admin` with a team-only email link, land on a Home of tiles, and open a live Overview. The Legacy dashboard moves to `/admin/legacy`.

**Architecture:** A new `admin` edge function (Hono, Deno) serves `/admin/*` routes. It reuses `server/adminRole.ts` and `server/kv_store.tsx` by relative import and does not change or redeploy `server`. The site renders a standalone `AdminSite` for the exact path `/admin`, outside WellnessSite's chrome and analytics. It calls the function through an `admin` Function client and a second fixed Relay, `/api/admin/*`. The Legacy `AdminDashboard` stays reachable only at `/admin/legacy`.

**Tech Stack:** React 18 + Vite + Tailwind; Supabase Auth (magic link via `auth.admin.generateLink`); Deno edge functions with Hono, `npm:postgres@3.4.5` and denomailer; Vitest; the Postgres twin (`supabase/twin/run.sh`).

**Spec:** `docs/superpowers/specs/2026-11-22-admin-revamp-design.md`

## Global Constraints

- Admin = a live `admin` row in `public.user_roles`, through `hasAdminRole` / `adminUserIds` (`supabase/functions/server/adminRole.ts`). Never `user_metadata`, never an email. Every `/admin/*` route except `sign-in-link` checks it on the server.
- Supabase `lemtlurqzmjdahbhunhz` and the `server` function are live for staging and production. **Nothing is applied, deployed or merged without Khairul's yes.** Piece one does not deploy `server`.
- The repo is public: no admin email in any committed file. Use `example.test` addresses in tests.
- The site deploys staging on push to `main`. Merge only after the `admin` function is deployed.
- Copy is plain words, never technical: "Send me a sign-in link", "Only Oriri's team can sign in here.", "Check your inbox", "Coming soon", "Good morning, <first name>" / "Good morning", "After Membership", "Old admin".
- Look: `wb-*` tokens in `src/styles/wellness.css` (paper `#FAF8F5`, shell, stone, sand, taupe, ink `#2B2522`) and blush `#C98A90` for pills. Serif headings.
- Dates are Dubai days (UTC+4). "This week" = the last 7 Dubai days including today; "this month" = the last 30. The visits trend compares against the 7 or 30 days before that. *(Plan decision: this matches the 7- and 30-day visits.)*
- Counts leave out admins (`adminUserIds`) and emails flagged `test: true` in KV `bestie:leadflag:<email>`.

## Review Focus

1. **The sign-in link refuses without leaking.** An unknown email, a Member's email, an expired admin row or a malformed email gets the same 200 body as a real admin, after the same fixed delay. → Task 2 tests.
2. **A signed-in Member who opens `/admin`** sees the login page, never the Home or an error. `GET /admin/me` answers `{ isAdmin: false }`, and `/admin/overview` answers 403. → Tasks 2, 3, 5.
3. **An inbox can't be flooded.** More than 3 link requests per email per 15 minutes, or 10 per IP per 15 minutes, stop sending but still answer the same way. → Task 2 test.
4. **Mixed-case or padded emails** (`" Ren@Example.TEST "`) match the account and the lead/test flags. → Tasks 2, 4 tests.
5. **Empty data:** no stats rows, no leads or no Members show "0", never NaN, blank or "undefined". The trend reads as flat when the previous period was 0. → Task 4 tests.

---

### Task 1: `admin` function skeleton and the deploy choice

**Files:**
- Create: `supabase/functions/admin/index.tsx`, `supabase/functions/admin/app.ts`, `supabase/functions/admin/app.test.ts`
- Modify: `.github/workflows/deploy-function.yml`

**Interfaces:**
- Produces: `createAdminApp(deps: AdminDeps): Hono`, where `AdminDeps = { isAdmin(userId: string): Promise<boolean>; userFromToken(token: string | undefined): Promise<{ id: string; email: string } | null>; signInLink: SignInLinkDeps; overview: OverviewDeps; me: MeDeps }`. The types are filled in by Tasks 2–4. `index.tsx` builds the real deps and calls `Deno.serve(app.fetch)`. Every route lives under `/admin/` (the function is named `admin`). CORS follows `server`'s allow-list.
- Produces: the helper `requireAdmin(c, deps) → { user } | Response`: 401 with no user, 403 for a non-admin.

- [ ] **Step 1: Test** `app.test.ts`, "unknown route is 404" and "requireAdmin: no token 401, Member 403, admin passes", using fake deps.
- [ ] **Step 2:** Run `pnpm vitest run supabase/functions/admin/app.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `app.ts` with `createAdminApp` and `requireAdmin`. In `index.tsx`, wire real deps: a service-role client; `isAdmin = (id) => hasAdminRole(client as unknown as RolesReader, id)` imported from `../server/adminRole.ts`; KV from `../server/kv_store.tsx`.
- [ ] **Step 4:** Change `deploy-function.yml` to take `workflow_dispatch` input `function` (choice: `make-server-a278ea32` | `admin`, default `make-server-a278ea32`). For `admin`, it deploys `supabase/functions/admin` as `admin` with `--use-api --yes` and the same `index.ts → index.tsx` shim. For `make-server-a278ea32`, the steps stay exactly as they are today.
- [ ] **Step 5:** Run `pnpm test`. Expected: all pass. Syntax-check with `node -e` and esbuild `transformSync` on `admin/*.ts(x)` (see `node_modules/.pnpm/esbuild@*/`). Expected: no errors.
- [ ] **Step 6:** Commit with "Admin: the admin function skeleton and a deploy choice (#100)".

### Task 2: `POST /admin/sign-in-link`

**Files:**
- Create: `supabase/functions/admin/signInLink.ts`, `supabase/functions/admin/signInLink.test.ts`
- Modify: `supabase/functions/admin/app.ts`, `supabase/functions/admin/index.tsx`

**Interfaces:**
- Produces: `requestSignInLink(email: unknown, ip: string, deps: SignInLinkDeps): Promise<void>`. It never throws to the route. `SignInLinkDeps = { findUserIdByEmail(email: string): Promise<string | null>; isAdmin(id: string): Promise<boolean>; makeLink(email: string, redirectTo: string): Promise<string>; sendMail(to: string, subject: string, text: string, html: string): Promise<void>; limiter: { hit(key: string, max: number, windowMs: number): Promise<boolean> }; redirectTo: string; sleep(ms: number): Promise<void> }`.
- The route always answers `200 {"success":true,"data":{"sent":true}}` after `await sleep(1200)` measured from the request's start. It awaits the work, then sleeps whatever is left of the 1200 ms.

- [ ] **Step 1: Tests** in `signInLink.test.ts`:
  - `admin email → makeLink called with the trimmed lowercase email and redirectTo; one mail sent; subject "Sign in to Oriri Admin"`
  - `unknown email → no link, no mail`
  - `Member (not admin) → no link, no mail`
  - `" Ren@Example.TEST " matches ren@example.test`
  - `malformed / empty / non-string email → no lookup at all`
  - `4th request for one email in 15 min → no mail (limit 3/email/15 min)`
  - `11th request from one IP in 15 min → no mail (limit 10/ip/15 min)`
  - `makeLink or sendMail throws → requestSignInLink resolves`
  - `route: unknown, Member and admin emails get byte-identical responses, and each waited ≥1200 ms on the fake clock`
- [ ] **Step 2:** Run `pnpm vitest run supabase/functions/admin/signInLink.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `requestSignInLink` and the route.
  - Real deps: `findUserIdByEmail` is one `select id from auth.users where lower(email) = $1` through `postgres(Deno.env.get('SUPABASE_DB_URL'))`.
  - `makeLink` is `auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } })` → `data.properties.action_link`. Use it only after the account is known to exist, so no user is ever created.
  - `sendMail` uses denomailer, the same SMTP settings and `from: 'Oriri <account@oriri.me>'` as `server/index.tsx` `sendMail`.
  - `limiter` is KV `admin:signin:<key>` = `{ hits: number[] }`, pruned to the window.
  - `redirectTo` = `${origin}/admin`, where `origin` is one of `https://www.oriri.me`, `https://new.oriri.me` and `http://localhost:8443`, chosen from the request `Origin` header and falling back to `https://www.oriri.me`. Never use the raw header (gotcha: a link you hand out must not take its origin from the request).
  - The mail text is short: "Here's your link to sign in to Oriri Admin. It works once and expires soon." plus the link, and "Didn't ask for this? You can ignore this email."
- [ ] **Step 4:** Run `pnpm vitest run supabase/functions/admin`. Expected: PASS.
- [ ] **Step 5:** Commit with "Admin: a team-only sign-in link (#100)".

### Task 3: `GET /admin/me`

**Files:**
- Create: `supabase/functions/admin/me.ts`, `supabase/functions/admin/me.test.ts`
- Modify: `supabase/functions/admin/app.ts`, `supabase/functions/admin/index.tsx`

**Interfaces:**
- Produces: `GET /admin/me` → `{ success: true, data: { isAdmin: boolean, firstName: string | null } }`. It answers 401 with no user. A Member gets `isAdmin: false, firstName: null`, with a 200, not a 403.
- Produces: `firstNameOf(displayName: string | null): string | null`. It returns null for empty values or anything containing `@`. Otherwise it returns the first word, trimmed and capped at 40 characters. `MeDeps = { displayName(userId: string): Promise<string | null> }` reads `public.profiles.display_name`.

- [ ] **Step 1: Tests:** `firstNameOf("Renee Shaqirah") === "Renee"`; `firstNameOf("ren@example.test") === null`; `firstNameOf(null) === null`; `firstNameOf("  ") === null`; route: admin → `{isAdmin:true, firstName:"Renee"}`; Member → `{isAdmin:false, firstName:null}`; no token → 401.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit with "Admin: who is signed in (#100)".

### Task 4: `GET /admin/overview`

**Files:**
- Create: `supabase/functions/admin/overview.ts`, `supabase/functions/admin/overview.test.ts`, `supabase/functions/admin/overviewQuery.ts`, `supabase/functions/admin/overviewQuery.test.ts`, `supabase/tests/admin_overview.test.sql`
- Modify: `supabase/functions/admin/app.ts`, `supabase/functions/admin/index.tsx`

**Interfaces:**
- Produces: `OVERVIEW_SQL: string` in `overviewQuery.ts`. It is one read-only `select`, with parameters `$1::uuid[]` (excluded user ids) and `$2::text[]` (excluded lowercase emails). It returns one row: `members_total, members_week, members_month, active_week, member_emails` (`text[]` of lowercase emails of counted Members, used to drop leads who joined). Members and their emails come from `bestie.members` joined to `auth.users`; active comes from `bestie.check_ins` (distinct `member_id`). Windows use `(x at time zone 'Asia/Dubai')::date > today - 7` / `- 30`, with `today = (now() at time zone 'Asia/Dubai')::date`.
- Produces: `buildOverview(input: { today: string; dayVisits: Record<string, number>; row: OverviewRow; leadEmails: string[]; testEmails: Set<string> }): Overview`, where `Overview = { visits: { week: number; weekBefore: number; month: number; monthBefore: number }; members: { total: number; week: number; month: number }; activeWeek: number; leads: number; paying: null }`.
- Produces: `visitsForDay(date: string, kv): Promise<number>`. It uses `stats:day:<date>.sessions` when that exists, otherwise counts `t === 'session'` hits in `stats:hit:<date>:*`. It never writes. `dayVisits` covers the last 60 Dubai days.
- Leads = unique trimmed lowercase emails from KV `waitlist:bestie:*` (`.email`), `plan:signup:*` (`.email`) and `nourish:lead:*` (`.email`), minus `member_emails`, minus `testEmails`. `testEmails` = `bestie:leadflag:*` rows with `test === true`, which are also passed as `$2`.
- The route uses `requireAdmin`, then answers `{ success: true, data: Overview }`.

- [ ] **Step 1: Tests:**
  - `buildOverview`: week/weekBefore split across the 14 days ending `today`; month/monthBefore across 60; days missing from `dayVisits` count 0; leads dedupe `"A@x.test"`/`"a@x.test "`; a lead who is a Member is dropped; a test-flagged lead is dropped; all-empty input gives all zeros and `paying: null`.
  - `visitsForDay`: a rolled day uses `sessions`; an unrolled day counts session hits only (views and clicks ignored); no rows gives 0; nothing is written.
  - `overviewQuery.test.ts`: `OVERVIEW_SQL` starts with `select`, has no `insert|update|delete|drop|alter|create|truncate` and no `;`, and is embedded unchanged in `supabase/tests/admin_overview.test.sql` (copy the `engineBaseline.test.ts` pattern).
  - The twin, `admin_overview.test.sql`: inside `begin … rollback`, `prepare q(uuid[], text[]) as <OVERVIEW_SQL>`. Fixtures: 3 Members (one created 3 days ago, one 20 days ago, one 40 days ago), one excluded by id and one other by email; check-ins inside and outside 7 days. Assert the counts with `pg_temp.check` and that `member_emails` leaves out the excluded.
- [ ] **Step 2:** Run `pnpm vitest run supabase/functions/admin` (expected: FAIL), then `bash supabase/twin/run.sh` (expected: FAIL in `admin_overview`).
- [ ] **Step 3:** Implement `overviewQuery.ts`, `overview.ts` and the route. Real deps: `postgres(SUPABASE_DB_URL, { max: 2, prepare: false })` run inside `begin read only` (`sql.begin('read only', …)`), `sql.unsafe(OVERVIEW_SQL, [ids, emails])`; KV from `../server/kv_store.tsx`.
- [ ] **Step 4:** Run both test suites again. Expected: PASS.
- [ ] **Step 5:** Commit with "Admin: the Overview numbers (#100)".

### Task 5: The Admin page: login, Home of tiles, Overview

**Files:**
- Create: `src/app/admin/AdminSite.tsx`, `src/app/admin/LoginScreen.tsx`, `src/app/admin/HomeScreen.tsx`, `src/app/admin/OverviewScreen.tsx`, `src/app/admin/tiles.ts`, `src/app/admin/view.ts`, `src/app/admin/view.test.ts`, `src/app/wellness/functionClient/admin.ts`, `src/app/wellness/functionClient/admin.test.ts`, `public/api/admin.php`
- Modify: `src/app/wellness/functionClient/httpTransport.ts` (+ its test), `src/app/App.tsx`, `src/app/components/AppRouter.tsx`, `public/.htaccess`

**Interfaces:**
- Consumes: the routes from Tasks 2–4.
- Produces: `createHttpTransport({ …, relay?: string })`. It defaults to `'/api/fn'`, so existing callers are unchanged. The `admin` client uses `relay: '/api/admin'` and `fnBase: https://${projectId}.supabase.co/functions/v1/admin`.
- Produces: `createAdminClient(core)` → `{ requestLink(email): Result<void>; me(): Result<{ isAdmin: boolean; firstName: string | null }>; overview(): Result<Overview> }`, plus a default `adminClient` built like `functionClient/index.ts`.
- Produces: `TILES` in `tiles.ts`, in this order: Overview, Members, Events, Catalogue, Shop, Site content, Leads, Bestie, Reports, Team. Each is `{ key, label, live: boolean }`, and only `overview` is live.
- Produces, in `view.ts`: `greeting(hourDubai: number, firstName: string | null): string`, which gives "Good morning" for hours before 12, "Good afternoon" for 12–17 and "Good evening" from 17, with ", <name>" when the name is set. Also `trendWord(now: number, before: number): string`, which gives "+8%", "−12%", "same as before" when they're equal, and "new" when `before` is 0 and `now` > 0. Also `summaryLine(o: Overview): string`, for example "248 Members · 3.1k visits this week", with numbers ≥1000 shown as "3.1k".

- [ ] **Step 1: Tests:** `view.test.ts` covers greeting at 8, 13 and 20 with and without a name, every trendWord case, `summaryLine` with 0s and with 3120 visits → "3.1k". `admin.test.ts` (fake transport) covers paths `/admin/sign-in-link` (POST `{email}`), `/admin/me` and `/admin/overview`. `httpTransport.test.ts` adds "custom relay is used on oriri.me".
- [ ] **Step 2:** Run `pnpm vitest run src/app/admin src/app/wellness/functionClient`. Expected: FAIL.
- [ ] **Step 3:** Implement:
  - **`App.tsx`:** when the path is exactly `/admin` (trailing slash allowed), render a lazily loaded `AdminSite`, before the Wellness check.
  - **`AdminSite`:** sets `<meta name="robots" content="noindex">`. With no session it shows `LoginScreen`. Otherwise it calls `me()`: `isAdmin: false` shows `LoginScreen` (with no error), `true` shows `HomeScreen`. Opening a live tile shows its screen with "← Home". The "Name ▾" menu has Sign out (`supabase.auth.signOut()` → `LoginScreen`). A small "Old admin" link goes to `/admin/legacy`.
  - **`LoginScreen`:** has the copy from Global Constraints. After a submit it always shows "Check your inbox. If this email is on Oriri's team, a sign-in link is on its way."
  - **`HomeScreen`:** shows the greeting, `summaryLine`, then the tile grid (3 columns on a phone, 5 on a laptop). A tile that isn't live is dimmed, can't be pressed and reads "Coming soon".
  - **`OverviewScreen`:** shows the Visits (7 and 30 days, with `trendWord`), Members (total, this week, this month), Active this week, Leads not yet Members, and Paying = "After Membership". It ends with the link "More detail in Google Analytics" (https://analytics.google.com/).
  - **`AppRouter.tsx`:** replace the three `/admin` routes with one, `/admin/legacy`, still wrapped in `AdminProtectedRoute` (its `check-admin` call now reads `user_roles`, PR #105).
  - **`admin.php`:** a copy of `fn.php` with `UPSTREAM = …/functions/v1/admin/`.
  - **`.htaccess`:** add `RewriteRule ^api/admin/(.+)$ api/admin.php?p=$1 [QSA,L]` beside the `api/fn` rule.
- [ ] **Step 4:** Run `pnpm test`, then `pnpm build`. Expected: PASS, and the build is green.
- [ ] **Step 5:** Run the dev server (`preview_start`). Check `/admin` signed out (the login shows, there are no console errors, a submit shows "Check your inbox"), check the 375 px width, and check that `/admin/legacy` signed out shows Legacy's sign-in prompt.
- [ ] **Step 6:** Commit with "Admin: login, Home of tiles and Overview at /admin (#100)".

### Task 6: Trim the Legacy dashboard

**Files:**
- Modify: `src/app/components/AdminDashboard.tsx`
- Delete: the components under `src/app/components/admin/` used only by the tabs that go (find them with `grep` before deleting)

**Interfaces:** none.

- [ ] **Step 1:** Remove these tabs and their panels: Content, Platforms, VIP, Social, Store, Revenue, Analytics. Keep Overview, Stepsisters & events, Directory, Traffic, Shop, Sign-ups and Admin until their sections ship.
- [ ] **Step 2:** Delete each component that is now imported nowhere. Leave the server routes alone.
- [ ] **Step 3:** Run `pnpm test` and `pnpm build`. Expected: green. Then check `/admin/legacy` in the preview: the kept tabs render.
- [ ] **Step 4:** Commit with "Legacy admin: keep only what Ren still uses (#100)".

### Task 7: Release (each step waits for Khairul's yes)

- [ ] **Step 1: Read-only preflight.**
  - **Auth redirect allow-list:** it must include `https://www.oriri.me/admin`, `https://new.oriri.me/admin` and `https://oriri.me/admin`. If any is missing, ask Khairul to add it; it's an Auth setting.
  - **Function secrets:** `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` and `SUPABASE_DB_URL` are project-wide, so the `admin` function sees them. Confirm by name only.
  - **Overview SQL:** run it inside `begin read only; … rollback;` and show the row.
- [ ] **Step 2:** Push the branch, open a PR, and run "Deploy edge function" with `function: admin` on the branch. Check signed out: `POST /admin/sign-in-link` → 200, `GET /admin/overview` → 401, and `server` is still v156.
- [ ] **Step 3:** Merge. That deploys staging. On new.oriri.me/admin, Khairul requests a link, signs in and sees the Overview. Then run production (`deploy.yml`, target production) on his yes.

# Admin piece 3: Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** an Events section at `oriri.me/admin`.
- Ren adds, edits, pins and deletes Stepsisters meet-ups, Stepsisters recaps and partner events, with photos.
- She sees which event the Meet up card will show this week.
- She sees each event's bookings and can remove one.
- The Legacy "Stepsisters & events" tab goes.

**Architecture:**
- **Server:** new routes in the existing `admin` edge function (`supabase/functions/admin/`).
  - Pure rules live in a Deno-free `events.ts` that vitest drives.
  - Thin adapters in `index.tsx` touch KV (`../server/kv_store.tsx`, as piece one does) and Storage.
- **Site:** one new screen in `src/app/admin/`.
- **Database:** none. No migration.
- **Not touched:** nothing under `supabase/functions/server/` changes, and the Member function isn't deployed.

**Tech Stack:**
- Deno edge function: Hono, `@supabase/supabase-js@2`.
- Site: React + Vite + Tailwind.
- Tests: vitest (`npm test`). The twin has nothing new to test, since there's no SQL.

**Spec:** `docs/superpowers/specs/2026-11-26-admin-events-design.md` (approved 2026-11-26). Rulings: vault DEC-014, DEC-015, DEC-016, DEC-017, DEC-020.

## Global Constraints

- **Live is shared.** `lemtlurqzmjdahbhunhz`, `make-server-a278ea32` and `admin` serve both staging and production. **Nothing is deployed, pushed or merged without Khairul's yes.**
- **Admin** means a live `admin` row in `public.user_roles`, checked on every request with `requireAdmin` (`app.ts`). These routes don't need a fresh sign-in; that's only for Team.
- **The KV shapes don't change.** Use the same keys and field names the Member side reads (spec, "Constraints"):
  - `wellness:moment:<id>`
  - `wellness:event:<id>`
  - `rsvp:<ref>:<email>`, where `ref` is `m-<id>` or `e-<id>`.

  New keys are only `admin:eventlog:<iso>:<rand>` and `admin:seen:events:<userId>`.
- **IDs** are `crypto.randomUUID()`. Any id in a path must match `/^[A-Za-z0-9-]{6,64}$/` (the shape `rsvpEvent` in `server` accepts).
- **Links:** only `https:` URLs are stored. Anything else is refused with "Links must start with https://".
- **Photos:**
  - only public URLs of the bucket `make-a278ea32-wellness` in this project are stored;
  - uploads are JPEG, PNG or WebP by their first bytes, at most 8 MB, with generated file names.
- **Guests' details** (name, email, WhatsApp) appear only in the bookings response. They never go in the log, the tile, a URL query or `console.log`.
- **The repo is public.** No real email goes in a fixture. Use `example.test`.
- **Wording:** no IDs or technical words on screen. Dates read like "Sat 29 Nov", times are Dubai time ("7:30 pm"), and copy is short and plain.

## Review Focus

1. **A `javascript:`, `data:` or `http:` link, or a link with leading spaces.** Each must be refused, not stored (Task 1 test).
2. **A photo URL from another bucket or host, or one that only contains the bucket name**, e.g. `https://evil.test/make-a278ea32-wellness/x.jpg`. It must be refused (Task 1 test).
3. **Two admins editing the same event.** The second save, made with a stale `updatedAt`, gets 409, and the first one's change stays (Task 3 test).
4. **Deleting an event with bookings.** Its `rsvp:<ref>:*` keys go too, and another event's bookings stay. An email with `+` or upper case still deletes the right key (Task 3 test).
5. **The "Shows in Meet up" mark** must name the same event that `thisWeeksMeetUp` picks, including a pinned event and the 7-day edge across Dubai midnight (Task 2 test).

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/functions/admin/events.ts` (+ `events.test.ts`) | Types; `cleanEvent` (validation); `meetUpPickId`; `groupBookings`; `EventsDeps` port; route handlers. |
| `supabase/functions/admin/app.ts` (+ `app.test.ts`) | Mount the Events routes; `AdminDeps.events`. |
| `supabase/functions/admin/index.tsx` | Real `EventsDeps`: KV reads and writes, Storage upload, the log, the seen marker. |
| `src/app/wellness/functionClient/admin.ts` (+ test) | Site copies of the types; the Events client methods. |
| `src/app/admin/view.ts` (+ test) | Wording helpers for events. |
| `src/app/admin/EventsScreen.tsx` | The screen: lists, form, bookings. |
| `src/app/admin/AdminSite.tsx`, `tiles.ts`, `HomeScreen.tsx` | Routing, the Events tile turned on, its line and pill. |
| `src/app/components/AdminDashboard.tsx` | Legacy: drop the "Stepsisters & events" tab. |
| `src/app/components/admin/StepsistersManagement.tsx`, `WellnessCalendarManagement.tsx` | Delete. Keep `PhotoPicker.tsx` if the Directory tab still uses it. |

---

### Task 1: Event rules (`events.ts`, validation)

**Files:** Create `supabase/functions/admin/events.ts` and `events.test.ts`.

**Interfaces:**
```ts
export type EventKind = 'moment' | 'event'
export const EVENT_CATEGORIES = ['Movement', 'Mind', 'Food', 'Beauty', 'Workshop', 'Pop-up', 'Community'] as const
export interface StoredEvent {           // exactly the KV value
  id: string; title: string; date: string; startTime?: string; location?: string; description?: string; link?: string
  pinned: boolean; createdAt: string; updatedAt: string
  type?: 'upcoming' | 'recap'; photos?: string[]               // moment
  category?: string; image?: string; partner?: string           // event
}
export function cleanEvent(kind: EventKind, body: unknown, photoBase: string):
  { ok: true; fields: Omit<StoredEvent, 'id' | 'createdAt' | 'updatedAt'> } | { ok: false; problem: string }
export const isEventId = (s: string) => /^[A-Za-z0-9-]{6,64}$/.test(s)
export const refOf = (kind: EventKind, id: string) => `${kind === 'moment' ? 'm' : 'e'}-${id}`
```

`photoBase` is `${SUPABASE_URL}/storage/v1/object/public/make-a278ea32-wellness/`. A photo must start with it and have no `..` or `?` after it.

**The rules:**
- Title: required, 1–120 characters after a trim.
- Date: required, YYYY-MM-DD and a real date (`2026-02-30` is refused).
- `startTime`: empty, or HH:MM from 00:00 to 23:59.
- Location: up to 120 characters. Description: up to 1,000. Partner: up to 80.
- Link: empty, or a `new URL()` with `protocol === 'https:'`, up to 500 characters.
- `type`: `upcoming` or `recap`, for moments only, and it defaults to `upcoming`.
- `photos`: up to 12, each under `photoBase`, for moments only.
- `category`: one of `EVENT_CATEGORIES`, for partner events only, defaulting to `Movement`. `image`: one photo under `photoBase`, for partner events only.
- `pinned`: a boolean, defaulting to false.
- Unknown fields (including `hidden` and `id`) are dropped. Fields of the other kind are dropped.

**The problem wording**, used exactly:
- "Give it a title."
- "Pick a date."
- "That time doesn't look right."
- "Links must start with https://"
- "Upload photos here, then pick them."
- "Up to 12 photos."
- "That's longer than it can be."

- [ ] **Step 1: Write failing tests.**
  - One good moment and one good partner event round-trip.
  - Each rule above refuses with its exact wording.
  - The Review Focus 1 and 2 cases.
  - Fields from the other kind and `hidden` are dropped.
  - `isEventId` refuses `../x` and a 65-character id.
- [ ] **Step 2: Run** `npx vitest run supabase/functions/admin/events.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** it again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin Events: the event rules (#100)"`

### Task 2: The Meet up mark and bookings grouping (`events.ts`)

**Interfaces:**
```ts
export interface Booking { ref: string; name: string; email: string; phone: string; guests: number; bookedAt: string }
export interface EventListItem extends StoredEvent { kind: EventKind; bookings: number; spots: number; newBookings: number; inMeetUp: boolean }
/** The id of the event thisWeeksMeetUp (server/morning.ts) shows this week, or null. */
export function meetUpPickId(moments: StoredEvent[], events: StoredEvent[], today: string): string | null
export function groupBookings(rows: unknown[]): Map<string, Booking[]>   // by ref, newest first; malformed rows dropped
export function listEvents(i: { moments: StoredEvent[]; events: StoredEvent[]; rsvps: unknown[]; today: string; seenAt: string | null }):
  { upcoming: EventListItem[]; past: EventListItem[]; tile: { comingUp: number; bookings: number; fresh: boolean } }
```

**How `meetUpPickId` works:**
- It imports `thisWeeksMeetUp` from `../server/morning.ts`. That's a read-only import, and the file doesn't change.
- It calls it with each row's `title` set to its `id`. The returned `title` is therefore the picked id.
- The comment says why, and a test pins it to the real call: same rows with real titles, and the same date and title come back.

**How `listEvents` works:**
- Upcoming means `date >= today`, soonest first. Past is newest first, and the screen shows the first 20.
- `spots` is the sum of `guests`. `newBookings` counts bookings with `bookedAt > seenAt`.
- The tile's `fresh` is true when an upcoming event within 7 days has `newBookings > 0`.

- [ ] **Step 1: Write failing tests.**
  - The Meet up mark:
    - a pinned partner event wins over a Stepsisters event;
    - a Stepsisters event beats a partner event on the same day;
    - a recap never wins;
    - an event 7 days out is included and 8 days out isn't;
    - nothing in range gives null.
  - The pin test against the real `thisWeeksMeetUp`.
  - Bookings:
    - they group by `ref`;
    - a row with no `ref` or `email` is dropped;
    - `spots` and `newBookings` are counted.
  - The tile `fresh` flag:
    - true for a booking made after `seenAt` on an event in 3 days;
    - false for one on an event in 10 days.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** the code.
- [ ] **Step 4: Run** the tests again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin Events: the Meet up mark and bookings (#100)"`

### Task 3: Routes (`events.ts` handlers, `app.ts`)

**The port:**
```ts
export interface EventsDeps {
  list(kind: EventKind): Promise<StoredEvent[]>
  get(kind: EventKind, id: string): Promise<StoredEvent | null>
  put(kind: EventKind, e: StoredEvent): Promise<void>
  remove(kind: EventKind, id: string): Promise<void>
  rsvps(prefix: string): Promise<unknown[]>                 // values under 'rsvp:' or 'rsvp:<ref>:'
  removeRsvps(keys: string[]): Promise<void>
  upload(bytes: Uint8Array, type: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<string>   // public URL
  log(entry: { actor: string; kind: EventKind; id: string; action: 'create' | 'edit' | 'delete' | 'booking_removed' }): Promise<void>
  seenAt(userId: string): Promise<string | null>
  markSeen(userId: string, at: string): Promise<void>
  photoBase: string
  now(): Date
}
```

**The routes.** Every one runs `requireAdmin` first, and paths have no `/admin` prefix in the client (DEC-016 ruling 6).

| Route | Result |
|---|---|
| `GET /admin/events?seen=1` | `{ data: listEvents(...) }`. With `seen=1` it calls `markSeen` after reading `seenAt`, so the pill clears when the screen opens. Home omits it. |
| `POST /admin/events` | Body is `{ kind, ...fields }`. A bad `kind` gives 400 `{ error: 'kind' }`. A `cleanEvent` problem gives 400 `{ error: 'invalid', problem }`. On success: 201 `{ data: StoredEvent }`, then a `create` log entry. |
| `PUT /admin/events/:kind/:id` | Body is `{ updatedAt, ...fields }`. A missing event gives 404. A stored `updatedAt` different from the body's gives 409 `{ error: 'stale' }`. On success it keeps `id` and `createdAt`, sets a new `updatedAt`, and logs an `edit`. |
| `DELETE /admin/events/:kind/:id` | Reads `rsvps('rsvp:<ref>:')`, removes those keys (`rsvp:<ref>:<email lowercased>`), removes the event, logs a `delete`, and returns `{ data: { bookingsRemoved: n } }`. A missing event gives 404. |
| `GET /admin/events/:kind/:id/bookings` | `{ data: Booking[] }`, newest first. |
| `DELETE /admin/events/:kind/:id/bookings/:email` | `:email` is `encodeURIComponent`'d. Removes `rsvp:<ref>:<email lowercased>`, logs `booking_removed` with no email, and returns 404 if there was no such booking. |
| `POST /admin/events/photo` | Multipart field `file`. It sniffs the magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`). Over 8 MB gives 400 `{ error: 'invalid', problem: 'Photos can be up to 8 MB.' }`; another type gives problem 'Photos must be JPEG, PNG or WebP.'. On success: `{ data: { url } }`. |

- An invalid `:kind` or `:id` gives 404 and touches nothing.
- `AdminDeps` gains `events: EventsDeps`, and the existing tests' fake deps gain a stub.
- **The KV race:** `get` then `put` isn't atomic, and KV has no compare-and-set. The window is one request's length with two admins, and that's accepted. Say so in a comment.

- [ ] **Step 1: Write failing tests** in `app.test.ts`, using an in-memory `EventsDeps`:
  - every route gives 401 with no token and 403 for a non-admin;
  - create, then list; edit; a stale edit gets 409 and the first edit stays (Review Focus 3);
  - delete takes only its own bookings (Review Focus 4, with `Ana+test@Example.test`);
  - removing a booking gives 404 on the second try;
  - bad `kind` and `../` ids give 404 or 400;
  - a log entry never contains an email (the log fake's JSON doesn't match `/@/`);
  - photo: a JPEG passes; a PNG renamed `.jpg`, but with GIF bytes, is refused; 9 MB is refused;
  - `seen=1` calls `markSeen` once, and Home's call doesn't.
- [ ] **Step 2: Run** `npx vitest run supabase/functions/admin`. Expected: FAIL.
- [ ] **Step 3: Implement** the handlers in `events.ts` and mount them in `app.ts`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin Events: routes (#100)"`

### Task 4: Real adapters (`index.tsx`)

Prefixes: `moment` → `wellness:moment:`, `event` → `wellness:event:`.

- **`list`:** `kv.getByPrefix(prefix)`, filtered to objects with a string `id`.
- **`get`, `put`, `remove`:** `kv.get`, `kv.set` and `kv.del` of `prefix + id`.
- **`rsvps(p)`:** `kv.getByPrefix(p)`. **`removeRsvps`:** `kv.mdel`.
- **`upload`:** the `supabase` service client.
  - Upload to `make-a278ea32-wellness` at `admin/<Date.now()>-<uuid8>.<jpg|png|webp>`, with its `contentType`.
  - Then return `getPublicUrl`.
  - The bucket already exists (Legacy made it). If the upload says it's missing, return 500 and log it. Don't create buckets from `admin`.
- **`log`:** `kv.set('admin:eventlog:<iso>:<uuid8>', { ...entry, at })`.
- **`seenAt`, `markSeen`:** `admin:seen:events:<userId>`.
- **`photoBase`:** `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/make-a278ea32-wellness/`.

- [ ] **Step 1: Implement.** These adapters have no unit test, because they're thin. They're checked on staging in Task 8.
- [ ] **Step 2: Run** `npm test`. Expected: PASS.
  - Then run `git diff main -- supabase/functions/server`. Expected: empty.
  - If Deno is available, run `deno check supabase/functions/admin/index.tsx`. The only error allowed is the known one in `kv_store.tsx:16`.
- [ ] **Step 3: Commit** `git commit -m "Admin Events: KV and photo adapters (#100)"`

### Task 5: Site client

**Files:** Modify `src/app/wellness/functionClient/admin.ts` and `admin.test.ts`.

**Interfaces:**
- Copy `EventKind`, `StoredEvent`, `EventListItem`, `Booking` and `EVENT_CATEGORIES` from Task 1–2. Add a comment that they mirror the Deno file.
- New methods:
  - `events(opts?: { seen?: boolean })` → `GET /events[?seen=1]`
  - `createEvent(kind, fields)` → `POST /events`
  - `updateEvent(kind, id, updatedAt, fields)` → `PUT /events/<kind>/<id>`
  - `deleteEvent(kind, id)` → `DELETE /events/<kind>/<id>`, returning `{ bookingsRemoved }`
  - `bookings(kind, id)` → `GET /events/<kind>/<id>/bookings`
  - `removeBooking(kind, id, email)` → `DELETE /events/<kind>/<id>/bookings/<encodeURIComponent(email)>`
  - `uploadPhoto(file: Blob)` → `POST /events/photo` with `form`
- `export function eventProblem(e: FunctionError): { kind: 'invalid'; problem: string } | { kind: 'stale' } | { kind: 'other' }`

- [ ] **Step 1: Write failing tests** with `fakeTransport`:
  - each method's method and path;
  - an email `a+b@x.test` is encoded;
  - `uploadPhoto` sends `form`;
  - `eventProblem` maps 400 invalid, 409 stale and anything else.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** the methods.
- [ ] **Step 4: Run** the tests again. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin client: Events calls (#100)"`

### Task 6: The Events screen

**Files:**
- Modify: `src/app/admin/view.ts` and `view.test.ts`, `tiles.ts`, `HomeScreen.tsx`, `AdminSite.tsx`.
- Create: `src/app/admin/EventsScreen.tsx`.

**`view.ts` adds:**
- `eventDayWord(date: string, startTime?: string): string`: "Sat 29 Nov, 7:30 pm", or "Sat 29 Nov" with no time. The year is added when it isn't this year.
- `bookingsWord(n: number, spots: number): string`: "No bookings yet", "1 booked · 2 spots" or "4 booked · 6 spots". "1 spot" is singular.
- `eventsTileLine(t): string`: "Nothing coming up", or "3 coming up · 7 bookings". "1 booking" is singular.
- `kindLabel(e): string`:
  - "Stepsisters" for a meet-up;
  - "Stepsisters recap" for a recap;
  - otherwise the partner name, or "Partner event".

**`tiles.ts`:** `events` becomes `live: true`.

**`HomeScreen`:** the Events tile line comes from `adminClient.events()`, called once. It reads "Events" until it answers or if it fails. The pill shows when `tile.fresh` is true.

**`AdminSite`:** adds `'events'` to `screen`, with "← Home".

**`EventsScreen`** follows the spec's "The screen":
- **The lists:**
  - Coming up and Past (the first 20, then "Show more").
  - Each row shows the title, `eventDayWord`, the location, `kindLabel`, a "Shows in Meet up this week" or "Pinned for Meet up" badge, and `bookingsWord`.
- **"Add an event":** asks Stepsisters meet-up, Stepsisters recap or Partner event, then shows that kind's form.
- **The form:**
  - Photos upload one at a time through `uploadPhoto`, with a preview and remove. That's up to 12 for a moment and 1 for a partner event.
  - A save shows `eventProblem`'s wording.
  - A `stale` result reads "Someone else changed this event. Reload to see it." with a "Reload" button.
- **Delete:** confirms with "Delete this event? Its N bookings will be removed too." (or "Delete this event?" with none).
- **Bookings view:**
  - Shows name, email, WhatsApp, spots and "Booked {dayWord}".
  - "Remove" confirms with "Remove {name}'s booking?".
  - "Copy emails" copies the guests' emails to the clipboard, joined by ", ", then shows "Copied".
- **Loading and errors:** loading reads "One moment…". An error reads "Couldn't load events." with "Try again".
- **Look:** the piece-one look (`wb-*`, the blush `#C98A90`, the same `FOCUS` ring), readable at 390px.

- [ ] **Step 1: Write failing tests** for every `view.ts` helper:
  - singular and plural forms;
  - no time;
  - another year;
  - a recap;
  - a partner event with no partner name.
- [ ] **Step 2: Run** `npx vitest run src/app/admin/view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, then the screen and its wiring.
- [ ] **Step 4: Run** `npm test` and `npm run build`. Expected: all pass, and the build succeeds.
- [ ] **Step 5: Check in the browser** against the dev server. Use the client's fake transport, or `supabase functions serve admin` if Docker is up.
  - The Events tile opens the screen.
  - Add one of each kind; edit; pin; and see the Meet up badge move.
  - Open bookings, remove one, and delete an event that has bookings.
  - A `javascript:` link shows the https line.
  - Take a screenshot at phone width.
- [ ] **Step 6: Commit** `git commit -m "Admin: Events screen (#100)"`

### Task 7: Remove the Legacy "Stepsisters & events" tab

**Files:** modify `src/app/components/AdminDashboard.tsx` (the `TabsTrigger value="stepsisters"`, its `TabsContent`, and the two imports). Delete `StepsistersManagement.tsx` and `WellnessCalendarManagement.tsx`.

- [ ] **Step 1: Check what uses them.**
  - Run `grep -rn "StepsistersManagement\|WellnessCalendarManagement\|value=\"stepsisters\"" src`. Expected: only the lines being removed.
  - Run `grep -rn "createEvent\|updateEvent\|deleteEvent\|createMoment\|updateMoment\|deleteMoment\|getRsvps\|deleteRsvp" src --include=*.ts --include=*.tsx`. Remove those `wellnessApi` helpers only if nothing else uses them.
  - Keep `getEvents`, `getMoments` and `uploadPhoto`, which the Member side or the Directory use.
- [ ] **Step 2: Remove** them.
- [ ] **Step 3: Run** `npm test` and `npm run build`. Expected: pass.
- [ ] **Step 4: Commit** `git commit -m "Legacy admin: drop the Stepsisters & events tab, replaced by Events (#100)"`

### Task 8: Review, then release (each step needs Khairul's yes)

No code here. This is the order and the proof for each step. Stop and ask before every numbered step that touches live.

- [ ] **Step 1: Review the whole branch.**
  - `npm test` and `npm run build` pass.
  - `git diff main -- supabase/functions/server supabase/migrations` is empty.
  - `git grep -n -i -E "@(gmail|hotmail|oriri)\." -- supabase/functions/admin src/app/admin` finds no real address added by this branch.
  - A code review on the branch, against the Review Focus list.
- [ ] **Step 2: Push the branch and open the PR** (yes). Bind it with the ccd_pr tools.
- [ ] **Step 3: Deploy `admin`** from the branch with `deploy-function.yml`, function `admin` (yes).
  - Before it, check `git diff f4da4f8 HEAD -- supabase/functions/admin`: every change should be this branch's. `f4da4f8` is the live `admin` v2.
  - Record the deployed commit.
  - The Legacy page keeps working throughout, because `server` is unchanged.
- [ ] **Step 4: Merge** (yes), so the site goes to staging. On `new.oriri.me/admin`:
  - Add a Stepsisters meet-up dated in 2 days, called "Test meet-up, please ignore". Pin it, and check that it shows on the Member Meet up card.
  - Book it from the Member side with an `example.test` email. See the booking in Admin, remove it, then book again.
  - Delete the event. Check the booking is gone, and that the Meet up card no longer shows it.
  - Upload a photo, and check that a pasted outside URL is refused.

  Staging and production share the KV, so the test event is live for Members while it exists. Keep it to minutes, and Khairul decides the time.
- [ ] **Step 5: Production** (yes). Check that `www.oriri.me/admin` opens Events and lists the real events.
- [ ] **Step 6: Close out.**
  - Comment on #100 with what shipped.
  - Update the vault (`state.md` and the session note).
  - The Legacy `server` routes for events and RSVPs stay until the cleanup redeploy. Note this in #100's comment.

## As built (2026-11-26, tasks 1–7; task 8 waits for Khairul)

- **Tests:**
  - `npm test` passes all 593.
  - `npm run build` succeeds.
  - `tsc` is clean for every file this branch touches. Its one error, `AdminDashboard.tsx` `totalViews`, is already on `main`.
  - Deno isn't installed on this machine, so `deno check` wasn't run.
- **Mutation checks:**
  - With the stale check removed, the 409 test fails.
  - Matching a booking by key prefix instead of the whole email fails a new test ("ana@example.test" against "ana@example.testing").
- **Wording added to Task 1:** "Pick a category." and "Pick meet-up or recap.". "Pick a photo." is used when the upload has no file.
- **The plan's example date was wrong.** 29 Nov 2026 is a Sunday; the helper and its tests are right.
- **Live data checked read-only:** the 2 live events (1 partner, 1 Stepsisters) pass every new rule, so nothing existing gets locked against edits.
- **The Legacy tab also held `EventBookings`,** an all-bookings list with a CSV download. It's removed, and Events replaces it per event, with "Copy emails" instead of CSV.
- **Legacy `/admin/legacy`** now opens on the Directory by default.
- **Browser check:** the screen was driven in the dev server with the admin client's calls faked in the page. Live wasn't touched.
  - It ran at 375 px.
  - Covered: list, add, a `javascript:` link refused with its wording, save, bookings view, and delete with the "Its booking will be removed too" confirm.
  - Every form field has its label.

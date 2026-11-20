# Plan: #72 Completing with Proof

Branch `feat/72-completing-with-proof`. Sub-issue of #67. Rules: DEC-003, plus the #72 grilling on 2026-11-20 (below).
Nothing here touches the live project `lemtlurqzmjdahbhunhz` until step 5/6, each with Khairul's yes.

## Decisions from the grilling (2026-11-20, all accepted)

1. **Scope.** Completions only. No points (#73 adds the ledger and the undo's reversing entry), no QR (#76), no Wrap-up (#74).
2. **Time gate.** Per Suggestion, using the item's own `duration_min`, the same rule for every Pillar. The clock starts when she was shown it: the Check-in for the original plan, the swap for a swapped-in pick (`suggestions.created_at`). A two-Pillar item has one gate. Gates don't add up. Only on the plan's Dubai date.
3. **Meal cap.** One Meal Completion per mealtime, by Dubai clock time when she ticks: breakfast before 11:00, lunch 11:00–16:00, dinner from 16:00. Snacks count. Any item whose Pillars include Meal counts.
4. **Reach-out cap.** One live Completion of a `kind = 'reach_out'` item per Dubai day, across Check-ins. An undo frees it.
5. **Suspicious.** Flag when 3 or more live Completions fall within 10 minutes **and** the last of them comes less than 15 minutes after the earliest time she could have done them back to back (earliest `created_at` among their Suggestions plus the sum of their durations). Every Completion in the burst gets `flagged = true`, `flag_reason = 'too_fast'`. She sees nothing different.
6. **Undo.** Same Dubai day only. The row stays with `undone_at` set. The Suggestion goes back to `shown` (or to `replaced` if its plan was replaced since), and can be completed again under the same gate and caps. The photo is deleted straight away. A flag stays on the undone row. Undone rows don't appear in the Journal.
7. **Photos.** A private bucket `bestie-photos`, created by the migration. The path is `{member_id}/{completion_id}.jpg`, the upload goes through the edge function only, 5 MB at most, viewed through short-lived signed URLs. Location stripping has two locks: the browser redraws the photo as a JPEG up to 1600 px, and the server accepts JPEG only and removes every metadata segment. She can delete a photo from the Journal. The 12-month sweeper is its own ticket.
8. **Reflection.** Required for Mindset only. Not blank after trimming, up to 280 characters.

## Two calls I made, for you to check

- **Journal placement.** Q1 said "on Profile", but a signed-in Member has no Profile page yet (#92 sends her to her Day plan, and the Profile screen arrives in #73). So the Journal goes on `/plan/day` as a "Your Journal" section under today's plan, showing the last 30 days. #73 can move it.
- **Engine version stays `bestie-2`.** Completion rules don't change how a plan is fitted (GLOSSARY: Engine version). The existing fingerprint test will prove the fitting output is unchanged.

## 1. Migration `supabase/migrations/20261120000100_bestie_completions_proof.sql`

- `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('bestie-photos', 'bestie-photos', false, 5242880, '{image/jpeg}') on conflict (id) do nothing;`
  No `storage.objects` policies, so only `service_role` can read or write it.
- `alter table bestie.completions add constraint completions_reflection_len check (reflection is null or char_length(reflection) between 1 and 280);`
- `create index completions_member_live_idx on bestie.completions (member_id, completed_at) where undone_at is null;` (the caps and the flag read live Completions by day).
- Twin only: `supabase/twin/00_supabase_shim.sql` gains a minimal `storage.buckets` table that mirrors the hosted columns, so the migration runs on the twin. This is a test file and never goes to live.
- Preflight on live (shown at step 5): the bucket doesn't exist yet, no Completion row breaks the new check, and the index name is free.

## 2. Bestie module (`supabase/functions/server/bestie.ts` + a new `proof.ts`)

**New module actions:**
- `complete(store, user, suggestionId, { reflection? }, now)`
- `undoCompletion(store, user, completionId, now)`
- `attachPhoto(store, photos, user, completionId, bytes, now)`
- `deletePhoto(store, photos, user, completionId)`
- `journal(store, photos, user, now)`

**What `complete` returns:**
- `planned`, with the plan.
- Or one of these refusals: `notJoined`, `notFound`, `tooSoon { readyAt }`, `reflectionNeeded`, `mealCapped { mealtime }`, `reachOutCapped`.

**What `proof.ts` holds:** the pure rules, with no I/O:
- `mealtimeOf(now)`
- `gateOpensAt(shownAt, minutes)`
- `burstFlags(completions)`
- `stripJpegMetadata(bytes)`

`stripJpegMetadata` checks the JPEG start marker, drops the APP1–APP15 and COM segments (this removes EXIF and GPS) and keeps the image data. It refuses anything that isn't a JPEG.

**What changes in the plan view:**
- `SuggestionView` gains `done: { completionId, at } | null` and `readyAt` (when the gate opens), so the card can say "ready at 10:45".
- `SuggestionRow` gains `created_at`.

**New store methods** (memory adapter + Postgres adapter in `index.tsx`):
- `suggestionToComplete(memberId, id)`: the Suggestion with `created_at`, its plan date and status, the item, and the outcome.
- `liveCompletionsBetween(memberId, fromIso, toIso)`: today's live Completions, each with its Suggestion's item and `created_at`.
- `recordCompletion({ memberId, suggestionId, proofKind, reflection, at, flagIds })`: one transaction. It locks the member row, moves the Suggestion `shown/accepted → completed` with a conditional update, inserts the Completion, and sets the flags. It returns null if the Suggestion is no longer open.
- `undoCompletion(memberId, completionId, at)`: one transaction. It sets `undone_at` and moves the Suggestion `completed → shown`, or `→ replaced` if its plan isn't active. It returns the photo path so the module can delete the photo.
- `setPhoto(memberId, completionId, path | null)`, `journal(memberId, sinceIso)`.

**A port for photos:** `PhotoStore { put(path, bytes), remove(path), signedUrl(path, seconds) }`. It has a memory adapter for tests and a Supabase Storage adapter (service role) in `index.tsx`.

**Learning comes for free.** `personalWeight` already scores `completed` at +3. An undo moves the outcome back, so the +3 drops too.

**Known limit, written in the code:** the caps are checked before the transaction. Two Meal or reach-out Suggestions can't both be open at once, because a re-Check-in replaces the old ones, so two taps can't race past a cap. Two taps on the same Suggestion are stopped by the existing unique index.

## 3. Edge function routes (`index.tsx`, same shape as swap and skip)

- `POST /bestie/suggestions/:id/complete` `{ reflection? }`. Gives back `{ plan }`, or a refusal with a kind and a gentle message:
  - 409 for `tooSoon` / `mealCapped` / `reachOutCapped`
  - 400 for `reflectionNeeded`
  - 404 for `notFound`
- `POST /bestie/completions/:id/undo` gives back `{ plan }`.
- `POST /bestie/completions/:id/photo`: the raw body is `image/jpeg`, 5 MB at most. Gives back `{ ok }`.
- `DELETE /bestie/completions/:id/photo`
- `GET /bestie/journal`: the last 30 days, with 10-minute signed photo URLs.

To check during the build: the Relay (`public/api/fn.php`) must pass a binary body through unchanged. If it can't, the photo upload alone goes directly to the function, and I'll say so in the PR.

## 4. Client

- **Function client** (`functionClient/bestie.ts`) gains five actions: `complete`, `undo`, `addPhoto`, `deletePhoto`, `journal`.
- **`photo.ts`:** redraws the chosen image on a canvas as a JPEG up to 1600 px at quality 0.85. The browser decodes iPhone HEIC photos itself. The size maths is a pure function, so it can be tested.
- **Day screen, Member cards:**
  - **Done** replaces the local tick. On Mindset it opens a one-line "What stayed with you?" box (280 characters).
  - Before the gate opens, the card says "Ready at 10:45".
  - When she's done, the card offers **Add a photo** (optional, "no points, private, location removed") and **Undo**.
  - Refusals appear inline, in Bestie's voice, with no accusing words.
  - The progress ring counts server Completions.
  - Visitors keep today's browser tick (ADR-0003).
- **"Your Journal"** on `/plan/day`: the last 30 days of Completions, with each Reflection and photo, and a "Remove photo" button.

## 5. Tests first, in this order (each one red, then green)

1. **`proof.test.ts`** (pure):
   - The mealtime boundaries (10:59, 11:00, 15:59, 16:00, Dubai not UTC).
   - `gateOpensAt`.
   - `burstFlags`: 3 within 10 minutes at the gate gets flagged; the same 3 in an evening Wrap-up doesn't; 2 don't; a two-Pillar item counts once.
   - `stripJpegMetadata`: a fixture JPEG with GPS EXIF comes out with no EXIF and its image data intact; PNG and random bytes are refused.
2. **`bestie.completion.test.ts`** (module + memory store):
   - Only her own, today's, open Suggestion: another Member's, yesterday's, swapped, skipped and not-picked are all `notFound`.
   - Gate: 1 minute early gives `tooSoon` with `readyAt`; on time passes; a swapped-in pick's clock starts at the swap.
   - Mindset: a blank Reflection gives `reflectionNeeded`; 281 characters is refused; a good one is stored.
   - Meal cap: a second Meal at lunch is refused after a re-Check-in; a snack counts; a lunch then a dinner both pass.
   - Reach-out cap across a re-Check-in; an undo frees it.
   - Undo:
     - The same day works and the next day is refused.
     - The Suggestion goes back to `shown`, or to `replaced` after a re-Check-in.
     - She can complete it again.
     - The Journal hides the undone row.
     - The photo is removed.
   - **The prototype scenario "Trying to game it", end to end:**
     - Low, 30 minutes, free.
     - Ticking Move straight away is blocked by the gate.
     - At 30 minutes, ticking all four gets them flagged.
     - A re-Check-in and a second reach-out are refused.
     - The replies look the same whether or not she's flagged.
   - Learning: a completed item's personal weight rises, and after an undo it falls back.
   - Photos: a photo on someone else's Completion is `notFound`; over 5 MB is refused; the stored bytes carry no EXIF.
3. **`supabase/tests/completion_store.test.sql`** (twin): replays the exact SQL of the Postgres store.
   - The bucket exists and is private.
   - `authenticated` can't insert Completions or write the bucket.
   - The Reflection check and the live-Completion unique index hold.
   - The undo statement moves the outcome back.
4. **Client:** `functionClient/bestie.test.ts` for the five actions (paths, method, binary body); `photo.test.ts` for the size maths.
5. **Then:** `pnpm test`, `pnpm build` and `bash supabase/twin/run.sh` all green, and the PR is opened. Nothing is applied or deployed.

## Out of scope (with where it goes)

- Points and the undo's reversing entry: #73.
- QR and the Met at Oriri badge: #76.
- Wrap-up: #74.
- The 12-month photo sweeper: a **new ticket**. I'd open it on GitHub at step 4 with your yes. The first photo can't expire before 2027-11.
- Rewards and Ren's review of flagged Completions: none exist yet. The flag is recorded so they can be built later.

## What touches live, later (steps 5 and 6)

1. Apply the migration: the bucket, the check and the index.
2. Deploy the edge function.

Both are on the shared project, so both go live for staging and production at the same moment. The new routes are only called by the new front end, so production's front end at `cc8dd03` keeps working until its own deploy. The production front-end deploy is a separate yes.

# FOLLOW-UP FIX — Push toggle stuck "off" and un-clickable

## Context
After shipping Part 4 (Web Push), clicking the **Settings → Push Notifications** toggle leaves it
stuck off and disabled. Root cause: the service worker is intentionally **not registered** in the
Figma Make preview iframe (`serviceWorker.ts:33` — `window !== window.top`), on localhost dev, and
on non-HTTPS. In those environments `navigator.serviceWorker.ready` is a promise that **never
resolves**. `notificationService.subscribeToPush()` awaits it (`notificationService.ts:182`), so the
handler hangs; the `finally { setPushBusy(false) }` in `SettingsScreen.handleTogglePush` never runs,
leaving `disabled={pushBusy}` permanently `true`. Push genuinely cannot work in the preview — only on
the published HTTPS deployment — but the UI should degrade clearly instead of hanging.

## Fix (2 files, all read-only-safe / additive)

**`src/app/utils/notificationService.ts`**
- Add a private helper `getReadyRegistration(): Promise<ServiceWorkerRegistration | null>` that can
  never hang: `Promise.race([navigator.serviceWorker.ready, timeout(3000)])`, falling back to
  `navigator.serviceWorker.getRegistration()`, returning `null` if neither yields a registration.
- Use it in `getPushSubscription()` and `subscribeToPush()` in place of the bare
  `await navigator.serviceWorker.ready`; if it returns `null`, return `null`/`false` (soft fail) so
  callers always settle and `pushBusy` resets.
- Tighten `isPushSupported()` to also return `false` when running in an iframe
  (`window.top !== window.self`, wrapped in try/catch for cross-origin), since the SW is deliberately
  not registered there — this makes the toggle show the existing "not supported on this device"
  toast immediately instead of appearing broken.

**`src/app/components/SettingsScreen.tsx`**
- Reword the unsupported-environment toast to set expectations, e.g. "Push works on the published
  Oriri site, not the in-app preview." No structural change — the existing `finally` already resets
  `pushBusy` once the awaits can no longer hang.

## Verification
- In the Make **preview**: toggling now shows the informational toast and the switch stays
  interactive (never greys out permanently).
- On the **published HTTPS site** with VAPID secrets set: toggle → browser permission prompt →
  "enabled"; a `push_sub_<uid>` record is written; admin `POST /push/send` delivers a notification.
- Confirm no regression to other Settings toggles and that the audio player / episode feed are
  untouched.

---

# Oriri — Engagement "Habit Loop" Plan (retention + re-engagement + gamification)

## Context

Oriri has strong acquisition and content surfaces but the **retention loop leaks**: no
"Continue Listening" (playback position lives only in memory), saved episodes are mock
(`ProfileScreen.tsx`), search is fake (`SearchScreen.tsx` filters a hardcoded list), there is
no web push, and gamification is siloed in Nourish. Goal: turn one-time visitors into weekly
returners with five additive features, built foundations-first.

---

## ⚠️ Platform-safety guarantee (read first)

The platform has broken before when changes touched the **Spotify/YouTube episode PULL**. That
pull is `podcastAPIOrchestrator.syncAllPlatforms()` (`podcastOrchestrator.ts:523`) — a live
3-platform ingestion (Spotify OAuth + Apple + YouTube `search.list`, each with a 15s timeout and
no rate limiting). It is invoked on every call to `GET /podcast/search` (`index.tsx:2540`) and
`GET /podcast/episodes` (`index.tsx:2507`). YouTube `search.list` costs 100 quota units/call
(~10k/day cap), so any high-frequency user-facing path that reaches `syncAllPlatforms()` risks
quota exhaustion and cascade failure.

**This plan does NOT call `syncAllPlatforms()` anywhere.** Every new feature either:
- creates brand-new, per-user KV keys and routes (`listen_progress_*`, `savedEpisode_*`,
  `push_sub_*`, `journey_*`) that never touch episode ingestion, OR
- reads the already-cached episode store `managed_episode_*` (served by `GET /episodes`,
  `index.tsx:806`) — a pure KV read with zero external calls.

Nothing here writes to `managed_episode_*` or the episode API clients. Search is explicitly
re-pointed off the fragile route (see Part 3). All new calls from the audio player are
fire-and-forget and `mountedRef`-guarded so they can never block or crash playback.

---

## Shared conventions (reuse verbatim — confirmed in code)

- **Route prefix** `/make-server-a278ea32` in `supabase/functions/server/index.tsx`.
- **Auth gate**: reuse `nourishUserId(c)` (`index.tsx:4302`) → user id or `null` (→ 401).
- **KV** (`kv_store.tsx`, protected — do not edit): `get/set/del/mget/mset/getByPrefix`;
  `mset(keys[], values[])` is two parallel arrays; user lists via `getByPrefix(\`x_${uid}_\`)`.
- **Server-authoritative streak**: `nourishStreak(prev, last, current)` (`index.tsx:4315`) —
  same period → unchanged, prev → +1, gap/first → 1. Never trust client counts.
- **Frontend wrapper**: clone `src/app/utils/nourishApi.ts` — generic `request<T>()` that never
  throws, resolves `{ ok, data?, error? }`, `Authorization: Bearer ${token || publicAnonKey}`.
- **Hook pattern**: clone `src/app/hooks/useNourish.tsx` — `useAuth()` for token + `isLoggedIn`,
  optimistic state with `mountedRef` guard, fire-and-forget or rollback-on-failure.

---

## Part 1 — Continue Listening (resume playback) — SAFE (new KV only)

**Server** (`index.tsx`, near Nourish routes):
- `POST /listen/progress` (authed) `{episodeId, position, duration, title, image}`. Skip if
  `position<5`; **delete** key when `position/duration>0.97`. KV
  `listen_progress_${uid}_${episodeId}` = `{episodeId, position, duration, updatedAt, title, image}`.
- `GET /listen/progress` (authed) → `getByPrefix(\`listen_progress_${uid}_\`)`, sort desc, slice 10.
- `GET /listen/progress/:episodeId` (authed) — resume-on-load lookup.
- `DELETE /listen/progress/:episodeId` (authed).

**New** `src/app/utils/listeningApi.ts` — `saveProgress`, `getProgress`, `getProgressFor`, `removeProgress`.

**Modify** `src/app/hooks/useGlobalAudioPlayer.tsx`: add `useAuth()` in the provider; throttle a
save (~10s) in `handleTimeUpdate` + on pause/ended/unmount (fire-and-forget, never block
`play()`/`load()`); in `loadEpisode`, `getProgressFor` then a one-shot `loadedmetadata` handler
calling the existing `seek()` (`~line 364`, clamps to duration); guard against re-seeking a replay.

**Modify** `src/app/components/HomeScreen.tsx`: a "Continue Listening" row as the FIRST section
above Featured Episodes (`~line 636`), loaded via `listeningApi.getProgress` when `isLoggedIn`,
`Progress` bar at `position/duration`, tap → `playEpisode`. Hidden when empty/logged-out.

---

## Part 2 — Real saved episode library — SAFE (new KV only)

**Server** (mirror `/nourish/favorites` `~index.tsx:4459`):
- `GET /saved-episodes` (authed) → `getByPrefix(\`savedEpisode_${uid}_\`)`.
- `POST /saved-episodes` (authed) `{episode, episodeId, action:'add'|'remove'}`. Key
  `savedEpisode_${uid}_${episodeId}`; `add` stores denormalised `{episodeId, episode, savedAt}`
  (renders without a lookup, same as Nourish favorites); `remove` = `kv.del`.

**New** `src/app/utils/savedEpisodesApi.ts` + `src/app/hooks/useSavedEpisodes.tsx` (state `saved`,
derived `savedIds` Set, optimistic toggle + rollback, gated on `isLoggedIn`).

**Modify** `ProfileScreen.tsx` (drop `mockFavorites` ~95 + local `favorites` ~221; back section ~500
and remove handler ~343 with the hook); `UnifiedEpisodeDetailScreen.tsx` (bookmark toggle beside
Heart/Share, login-gated via existing `authModalAction`); `EpisodeCard.tsx` (small bookmark button).

---

## Part 3 — Wire real search — REWORKED FOR SAFETY (no sync pull)

**Do NOT use `GET /podcast/search`** — it calls `syncAllPlatforms()` on every request (the
platform-breaking path). Instead:

**Server** — add `GET /episodes/search?q=&limit=` (public, anon key): read
`kv.getByPrefix('managed_episode_')` (the cached source of truth already served by `/episodes`,
`index.tsx:806`) and apply the same title/description `.filter()` + `.slice(limit)` logic that
`/podcast/search` uses at `index.tsx:2543-2546`, **but over KV data — zero external calls, zero
sync, zero quota**. (Alternatively filter `/episodes` client-side; a dedicated route keeps payloads
small.)

**Modify** `src/app/components/SearchScreen.tsx`: remove `mockResults` (~63); in the existing
debounced `useEffect` (~135), fetch the new `/episodes/search` route, map results into the current
`SearchResult` shape, add a request-id ref to drop stale responses. Keep loading/empty/recent-search
states intact.

---

## Part 4 — Web Push — SAFE (new KV only); highest build risk, do LAST

> `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` are Supabase Edge env secrets only (like `SPOTIFY_*`), never
> in the bundle; the public key is served from a route. Generate a keypair once
> (`npx web-push generate-vapid-keys`) and set secrets before send works. Deno has no native sender —
> use a Deno-compatible `web-push` lib (esm.sh) or manual VAPID ES256 + aes128gcm. Test one sub first.

**SW** `src/app/public/sw.js`: add `push` (→ `showNotification` with `data.url`) and
`notificationclick` (focus/`openWindow`) listeners; bump cache version.

**Server**: `GET /push/vapid-public-key` (public); `POST`/`DELETE /push/subscribe` (authed, KV
`push_sub_${uid}`); `POST /push/send` (**admin** — reuse the `/admin/episodes` admin check) →
`getByPrefix('push_sub_')`, sign+send, prune 404/410. Trigger on new-episode publish / live start.

**Frontend**: extend `src/app/utils/notificationService.ts` with `subscribeToPush` /
`unsubscribeFromPush` / `urlBase64ToUint8Array` (reuse `serviceWorkerManager`); opt-in via a
`SettingsScreen.tsx` toggle + a one-time soft prompt after first `playEpisode` (localStorage flag).

---

## Part 5 — Unified "Oriri Journey" gamification — SAFE, strictly additive

Do **not** touch `nourishStreak`/`nourish_state_*`. Add a parallel record; display both streaks.

**Server**: helper `journeyStreak(prev, lastListenDate, today)` (nourishStreak logic at day
granularity, UTC `YYYY-MM-DD`); `GET /journey` (authed → `journey_${uid}` + read
`nourish_state_${uid}` for both streaks); `POST /journey/listen` (authed → recompute streak,
`totalListens+=1`, evaluate badges, append newly-earned). KV `journey_${uid}` =
`{version:1, listenStreak, lastListenDate, totalListens, badges:[{id,earnedAt}], updatedAt}`.
Badge milestones aggregate cross-domain server-side (`journey_*`, `nourish_state_*`, `episode_like_*`).

**New** `src/app/utils/journeyApi.ts` + `src/app/hooks/useJourney.tsx` +
`src/app/components/JourneyStreakBadge.tsx`.

**Modify** `useGlobalAudioPlayer.tsx` (on first play/episode/day call `journeyApi.recordListen`,
deduped, fire-and-forget, shares Part 1 token); `ProfileScreen.tsx` ("Oriri Journey" section:
listen streak, total listens, badge grid, Nourish streak side-by-side); optional
`JourneyStreakBadge` in the `HomeScreen.tsx` header.

---

## Build order

1. Foundations — auth token in `GlobalAudioProvider`; `listeningApi.ts`; `/listen/progress` routes.
2. Part 1 end-to-end; verify no audio-player regressions.
3. Part 3 (search) — add `/episodes/search`, repoint SearchScreen. Smallest, isolated.
4. Part 2 (saved episodes).
5. Part 5 (journey).
6. Part 4 (web push) — last; VAPID secrets → sw.js → subscribe → Settings/soft prompt → admin send.

## Verification

- **Regression-first**: confirm the episode feed, `/episodes`, Home carousel, and episode detail all
  still load, and that NO new code path calls `syncAllPlatforms()` (`grep` the new routes).
- Play 15s, leave, reopen → resumes; Home "Continue Listening" correct; finishing removes it.
- Play/pause/seek/queue auto-advance, error fallback, offline audio caching all still work.
- Save/unsave persists across reload; Profile reads real data; no `mockFavorites` remain.
- Search returns cached results, debounced, stale-guarded; `/episodes/search` makes zero external calls.
- Push: single prompt, sub in `push_sub_<uid>`, admin send opens the right episode; no VAPID private key in bundle.
- Journey: streak +1/day, resets after gap, `totalListens` accurate, badges award; Nourish streak untouched.

## Risks & mitigations
- **Episode PULL fragility** — mitigated by design: nothing here invokes `syncAllPlatforms()`; search
  reads cached `managed_episode_*` only.
- **Audio player is load-bearing** (Parts 1 & 5): all new calls fire-and-forget, `mountedRef`-guarded,
  never blocking `play()`/`load()`.
- **Web push**: Deno has no native sender; secrets must be set before send — treat send as its own phase.
- **Nourish streak** untouched; journey writes only `journey_<uid>`.
- Edge routes go live on publish/sync, not file save; until then surfaces degrade gracefully.

---

## Previously completed (reference)
Social integration (link-in-bio `/links`, follow surfaces, curated showcase, share-to-grow loop,
admin Social tab) and the Nourish engagement build are done and shipped.
</content>

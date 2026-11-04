# Nourish by Oriri — Engagement Enhancement Plan

Adds persistence, personalization, streaks, saved meals, and episode cross-linking
to the currently static/stateless Nourish meal planner. Reuses the existing
Hono + KV + Supabase-auth backend patterns and preserves the guest auth-gate and
sage/cream aesthetic.

---

## (a) Data model additions

All state lives under one primary per-user KV key plus two collections. Keeping the
active plan in a single blob (`nourish_state_${user.id}`) makes load/save one round trip;
favorites use a prefix collection so they scale independently of the active plan.

### KV keys
- `nourish_state_${user.id}` — the user's active plan + quiz + checklist + streak (single blob).
- `nourish_fav_${user.id}_${mealId}` — one record per favorited meal (prefix-scanned for the Saved view).
- `nourish_episode_map` — (optional, admin-seeded) curated GoalKey→episodeId map. Falls back to keyword matching if absent.

### TypeScript shapes (add to `src/app/data/nourishPlans.ts`)
```ts
export type DietPreference = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian';

export interface NourishQuiz {
  diet: DietPreference;
  exclusions: string[];   // lowercase ingredient keywords to avoid, e.g. ['dairy','nuts','eggs']
  servings: number;       // 1..6
  maxCookMinutes: number; // e.g. 10 | 20 | 30
}

export interface GroceryCheckState {
  // key = stable grocery item id (category + slug of name); value = checked
  [itemId: string]: boolean;
}

export interface NourishState {
  version: 1;
  goal: GoalKey;
  isoWeek: string;          // e.g. "2026-W29" — the week this plan was generated for
  quiz: NourishQuiz | null; // null until intake completed
  checklist: GroceryCheckState;
  streakCount: number;      // consecutive engaged ISO weeks
  lastEngagedWeek: string;  // ISO week of last save/interaction
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteMeal {
  mealId: string;   // slug of meal.name (globally unique enough within Nourish)
  goal: GoalKey;
  meal: Meal;       // denormalized snapshot so Saved view needs no plan lookup
  savedAt: string;
}
```

Add stable id helpers in `nourishPlans.ts`:
- `groceryItemId(category, name)` → `${category}:${slug(name)}`
- `mealId(name)` → `slug(name)`

Note: quiz-driven filtering does NOT mutate the hardcoded PLANS. It's applied at
render time by a pure `adaptPlan(plan, quiz)` selector (see (d.3)).

---

## (b) New server routes (`supabase/functions/server/index.tsx`)

All follow the existing auth-gate pattern (Authorization Bearer → `supabase.auth.getUser` →
401 if no user). Prefix `/make-server-a278ea32`.

| Method | Path | Purpose |
|---|---|---|
| GET  | `/nourish/state` | Return `nourish_state_${user.id}` (or `{ data: null }` if none). Also computes `newWeekAvailable` by comparing stored `isoWeek` to current server ISO week. |
| PUT  | `/nourish/state` | Upsert full NourishState (goal, quiz, checklist, isoWeek). Server stamps `updatedAt`, recomputes `streakCount`/`lastEngagedWeek` (see streak logic in d.4) so streaks can't be spoofed. |
| PATCH| `/nourish/checklist` | Body `{ itemId, checked }`. Toggles one grocery item in the stored checklist (avoids sending whole blob on every tap). Returns updated checklist + progress. |
| POST | `/nourish/regenerate` | Body `{ goal }`. Sets a fresh `isoWeek` = current week, clears checklist, bumps streak if new week. Used by "Refresh this week". |
| GET  | `/nourish/favorites` | `kv.getByPrefix('nourish_fav_${user.id}_')` → list of FavoriteMeal. |
| POST | `/nourish/favorites` | Body `{ meal, goal, action:'add'|'remove' }`. add → `kv.set`; remove → `kv.del`. |
| GET  | `/nourish/episodes/:goal` | Returns episodes mapped to a goal. Server reads existing episode sources (`managed_episode_`) + optional `nourish_episode_map`, applies keyword match, returns top N. |

Streak recompute lives server-side in PUT + POST /regenerate so it's authoritative.

---

## (c) Frontend files to create / modify

### Create
- `src/app/utils/nourishApi.ts` — thin fetch wrapper. One function per route
  (`getState`, `saveState`, `toggleChecklistItem`, `regenerate`, `getFavorites`,
  `toggleFavorite`, `getGoalEpisodes`). Reads `projectId`/`publicAnonKey` from
  `utils/supabase/info`. Takes `accessToken` arg. Every function wrapped so a
  network/500 error resolves to `{ ok:false }` rather than throwing (graceful degradation).
- `src/app/hooks/useNourish.tsx` — mirrors `useCommunityProfile` structure. Owns
  `state`, `loading`, `favorites`, `newWeekAvailable`. Exposes actions:
  `setGoalAndGenerate`, `saveQuiz`, `toggleGroceryItem`, `regenerateWeek`,
  `toggleFavorite`, `changeGoal`. Uses `useAuth()` for `session.access_token`.
  Implements optimistic local updates + backend sync; on failure keeps local state
  (degradation). Provides a `groceryProgress` derived value.
- `src/app/components/nourish/NourishQuiz.tsx` — intake quiz UI (4 questions:
  diet radio, exclusions multi-chip, servings stepper, max cook time segmented).
- `src/app/components/nourish/GroceryItemRow.tsx` (or extend `GroceryGrid.tsx`) —
  tappable checkable row.
- `src/app/components/nourish/GroceryProgressBar.tsx` — sticky progress bar.
- `src/app/components/nourish/SavedMealsView.tsx` — favorites list + empty state.
- `src/app/components/nourish/GoalEpisodes.tsx` — "Listen while you cook" section.
- `src/app/components/nourish/StreakBadge.tsx` — streak pill.

### Modify
- `src/app/data/nourishPlans.ts` — add types above, id helpers, and `adaptPlan(plan, quiz)`
  + `WEEKLY_META`/goal→keyword tags used for episode matching.
- `src/app/components/nourish/NourishScreen.tsx` — replace local-only `useState`
  flow with `useNourish()`. New screen states: `home | quiz | loading | results | saved`.
  Returning user with saved state lands directly on `results`. Wire StreakBadge,
  GoalEpisodes, refresh button, saved-meals nav.
- `src/app/components/nourish/GroceryGrid.tsx` — accept `checklist` + `onToggle`,
  render checkable rows; render progress bar.
- `src/app/components/nourish/MealCard.tsx` — add a favorite (heart) toggle.
- `src/app/components/HomeScreen.tsx` (~L542-600 card) — when logged in and
  `newWeekAvailable`, show a "New week ready 🌿" nudge badge on the Nourish card
  (the in-app "reminder").

---

## (d) End-to-end wiring per feature

### 1. Persistence & "My Plan"
On mount of NourishScreen (logged in), `useNourish` calls `GET /nourish/state`.
If state exists → skip goal selection, render `results` for `state.goal` with saved
checklist. If null → show `NourishHome`. Generating a plan calls the loading
animation then `PUT /nourish/state`. This save is the primary data-collection point
(goal + quiz + engagement cadence).

### 2. Interactive grocery checklist
`GroceryGrid` renders each item with a checkbox keyed by `groceryItemId`. Tap →
optimistic local flip + `PATCH /nourish/checklist`. `GroceryProgressBar` shows
`checked/total`. Progress persists via the checklist map in NourishState.

### 3. Personalization intake quiz
After first goal selection (or via "Personalize" button), show `NourishQuiz`.
On submit → stored in `state.quiz` via PUT. Rendering applies pure
`adaptPlan(PLANS[goal], quiz)`:
- Filter grocery items + meals whose ingredient text contains any `exclusion` keyword.
- Diet filter: drop meals/items tagged with animal proteins for vegan/vegetarian
  (needs a small `ANIMAL_KEYWORDS`/`FISH_KEYWORDS` set matched against names).
- `servings` → annotate/scale the grocery subtitle (display-only, no quantity data exists).
- `maxCookMinutes` → hide meals whose `time` exceeds it (parse leading integer of `meal.time`).
If filtering would empty a section, keep original + show an "adapted for you" tag
rather than an empty list (edge case, see (e)).

### 4. Weekly refresh + streaks & reminders
ISO week computed both client (display) and server (authoritative). `GET /nourish/state`
returns `newWeekAvailable = currentIsoWeek !== state.isoWeek`. When true, results
screen shows a "Refresh this week's plan" CTA → `POST /nourish/regenerate`.
Streak: on regenerate/save, server compares `lastEngagedWeek`:
- same week → no change
- exactly previous week → `streakCount++`
- gap > 1 week → reset to 1.
`StreakBadge` renders `state.streakCount`. HomeScreen card reads `newWeekAvailable`
(via a lightweight `useNourish` call or cached state) to show the in-app nudge.

### 5. Save/favorite meals
`MealCard` heart → `useNourish.toggleFavorite(meal, goal)` → optimistic +
`POST /nourish/favorites`. `SavedMealsView` lists `GET /nourish/favorites`
(denormalized snapshots, so it renders without a plan). Reachable via a nav entry
in the Nourish top bar.

### 6. Cross-link goals to episodes
`GoalEpisodes` calls `GET /nourish/episodes/:goal`. Server strategy (hybrid):
1. If `nourish_episode_map[goal]` curated ids exist, resolve those first.
2. Fill remainder by keyword-matching goal tags (e.g. gut_health → ["gut","bloat",
   "microbiome","digest"]) against episode `title`/`description` from existing
   `managed_episode_` + spotify/youtube caches.
Rendered as a "Listen while you cook" section in results, styled with sage palette.
If no matches → hide the section (graceful).

---

## (e) Risks / edge cases
- **ISO week calc**: use a single shared helper (Thursday-based ISO 8601). Do the
  authoritative calc server-side to avoid client clock skew; year boundary
  (W52/W53→W01) must use ISO year, not calendar year.
- **Quiz filtering hardcoded plans**: aggressive exclusions can empty a meal list or
  leave meals referencing removed grocery items. Mitigations: keyword match is
  substring/lowercase; never render an empty section (fall back + "adapted" tag);
  keep filtering display-only so PLANS stay intact and are reversible.
- **Diet detection is heuristic** (name-keyword based) — may misclassify. Keep the
  keyword sets small and conservative; annotate rather than hard-hide when unsure.
- **Episode mapping drift**: keyword matching can surface irrelevant episodes; curated
  map takes priority and caps the keyword fallback count.
- **Stale checklist after regenerate**: `POST /nourish/regenerate` must clear checklist
  and stamp new isoWeek atomically.
- **Guest gate**: all new UI stays behind `isLoggedIn`; `NourishAuthGate` unchanged.
- **Degradation**: every `nourishApi` call swallows errors to `{ ok:false }`; hook keeps
  last-known local state so the planner remains usable offline (just non-persistent).
- **id stability**: `groceryItemId`/`mealId` are derived from names — renaming a plan
  item orphans saved checklist/favorite entries (acceptable; snapshots protect favorites).

---

## (f) Build / verification approach
1. Backend first: add the 8 routes; verify each with `curl` using a real Bearer token
   (401 without, 200 with). Confirm KV round-trips via GET after PUT.
2. Add types + `adaptPlan` + id helpers to `nourishPlans.ts`; unit-reason through
   adaptPlan with an all-exclusions quiz to confirm no empty sections.
3. Build `nourishApi.ts` + `useNourish.tsx`; log state load on NourishScreen mount.
4. Wire features incrementally in this order: persistence → checklist → quiz →
   streak/refresh → favorites → episodes (each independently testable).
5. Manual verification per feature: reload page → saved plan returns; check items →
   reload → checkmarks persist; complete quiz → excluded ingredient disappears;
   simulate previous-week isoWeek → streak increments + nudge appears on HomeScreen;
   favorite a meal → appears in Saved view after reload; open a goal → relevant
   episodes listed.
6. Degradation test: block the functions domain in devtools → planner still renders
   from local state without crashing.
7. Visual QA against tokens: Cormorant Garamond headings, DM Sans body, #7A8C6E /
   #4A5C3E / #FAF7F2.

---

## Critical Files for Implementation
- /workspaces/default/code/supabase/functions/server/index.tsx
- /workspaces/default/code/src/app/data/nourishPlans.ts
- /workspaces/default/code/src/app/components/nourish/NourishScreen.tsx
- /workspaces/default/code/src/app/hooks/useNourish.tsx (new)
- /workspaces/default/code/src/app/utils/nourishApi.ts (new)

# Day plan revamp: a living Catalogue and a new engine (design)

**Date:** 2026-11-22 · **Status:** approved by Khairul, 2026-11-22 · **Replaces:** engine `bestie-3` (DEC-007 fitting rules)

## Why

Khairul ran today's engine against real Check-ins and it doesn't work:

- **Location is ignored.** The area is saved, but nothing uses it. Dubai Marina and Deira get the same plan.
- **It spends as much as it can.** "Higher cost wins" turns AED 1000 and 4 hours in July into a AED 920 spa day and a long lunch.
- **Her Goal barely counts.** It ranks fourth, behind heat, history and two-Pillar items. In November the run club wins almost every plan.
- **Move eats first.** Pillars are filled one at a time in a fixed order, so Move takes the time and money first.
- **It always gives the same answer.** The same Check-in gives the same plan, and ties are broken alphabetically.
- **The Catalogue is 29 generic items with no places**, so it can't say what's really near her.

Ren can't keep a real Catalogue up to date by hand. It has to fill itself.

## What success looks like

1. **Plans match her Check-in.** Every Suggestion she can act on is near her, the whole plan fits her time (travel included), stays within her budget and makes good use of it, leans towards her Goal and suits her energy. These are automatic checks, run over thousands of made-up Check-ins.
2. **She completes more.** The Completion rate per Suggestion goes up compared with `bestie-3`, and the swap-and-skip rate goes down. Take a `bestie-3` baseline before anything changes. Live numbers are small, so (1) carries the weight at first.

## Goals

- Bestie suggests **activities** (Yoga at a studio, a sound bath, a slow brunch), each with **up to 3 real places nearby** she can pick from.
- **Location:** her area is the centre, not a fence. Places within **5 km** count (Dubai Marina → JBR).
- **Time and budget work together.** Time is the hard limit. The budget is a ceiling, and the plan should use it sensibly ("close enough"), not max it out or ignore it.
- **Mood:** her Goal decides the *kind* of activity (unwind → relaxing). Her energy decides how *intense* it is.
- **A Catalogue that keeps itself fresh:** an AI sweep **every Saturday** finds new and changed places and activities around Dubai, including events and social activities. It lists them for Admin, and Admin selects and approves. Recipes, podcasts and videos are refreshed in the same run.
- **Events and social activities are activities.** A run club, a beach clean-up or a pop-up market can be suggested like any other activity. When it's time-sensitive, the card says so in a short remark ("Saturdays, 7 am", "On until 30 Nov"). It isn't fitted to a schedule.

## Non-goals (for now)

- **Fitting her plan to a clock.** Bestie suggests "Yoga at a studio", not "the 6:30 pm Vinyasa", and she isn't asked *when* she's free. Time-sensitive activities carry a remark instead.
- **A daily sweep.** It's weekly to keep cost low at this stage. Daily can come once Oriri has traction and revenue.
- **Writing daily lines by hand, or an Admin screen for them.** Lines become automatic under #101, a separate ticket (see "Related work").
- **Promoting businesses.** Monetisation comes later. Shape the data so a "promoted" flag can be added later, but the v1 engine has none.
- **Star ratings** shown to her or used in ranking.
- **A model trained on outcomes**, or a model choosing the plan. Maybe later, on top of this.

## Anti-goals (a failure even if it works)

- A Suggestion she can't act on: no real place near her, or over her time or budget.
- A business ranked up quietly, through paid placement, ratings, or a source's own ordering.
- An agent's find shown to Members before Admin approves it, when it's a place, an event or a social activity.
- An event still suggested after it has ended.
- Content that breaks the voice rules: weight, diet, food rules, medical or supplement claims.
- Breaking a source's terms: scraping against them, faking a browser, storing what we may not store, or rewarding YouTube views.

## Constraints

- **Cost:** Oriri is early. The sweep is weekly, and on a small model, to keep the running cost small and predictable.
- **Live is shared.** Supabase `lemtlurqzmjdahbhunhz` and the `server` edge function serve both staging and production. Nothing is applied, deployed or merged without Khairul's yes. The agents run in a **new, separate function**, never inside `server`.
- **Decisions that stay** unless reopened:
  - one Suggestion per Pillar
  - light versions when time runs short, counting against her time
  - a 30-minute minimum Check-in
  - swap and skip (DEC-008)
  - outcomes feed learning
  - Proof scales with reward (DEC-003, DEC-010)
  - Levels and Status (DEC-011)
  - the engine version recorded on every Suggestion
- **Past plans stay as they were.** Old Suggestions keep `bestie-3`. The new engine gets a new version (`bestie-4`) and the fingerprint test is updated.
- **Platform terms:**
  - YouTube: no points for watching, no paywall, official player only. Points come from her reflection (see the gotcha `youtube-terms-forbid-rewarding-or-gating-views`).
  - Places APIs: check how long each one lets us store what it returns (Google limits most fields; place IDs can be kept). This decides what we store and what we fetch again.
  - Venue websites: read only the venue's own site, as a normal visitor, respecting robots.txt. No faked user agents.
- **Privacy:** her area is already recorded under the Terms (DEC-007). Nothing new about her is collected. Location means her chosen area, not GPS.
- **Personal history** is used only with her personalisation Consent (#102). The new History term follows that rule from day one.

## Approaches

### The engine

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Hard limits filter, a weighted score ranks, then the best **whole plan** is chosen, with a little variety | Predictable, testable, weights in one place. Wording of "why" lines is plainer. |
| B | A model picks from a filtered shortlist | Flexible, nicer words. But it varies on every call, is hard to test, costs money on every Check-in, and must be checked against the limits anyway. Kept for wording "why" lines later (#101). |
| C | A model trained on outcomes | Needs thousands of Completions we don't have. A later layer on A. |

### The Catalogue agents: where from

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Official sources and APIs, plus an AI step that tags each item and screens content. Prices come from the venue's own website. | Accurate locations and fair terms. Prices need the extra venue-site step, and each source's storage terms must be checked. |
| B | AI agents researching the open web | Wider coverage, but less accurate, more terms risk, and costlier. Used only for the narrow venue-website step, and for finding events and social activities that no places API lists. |
| C | Venues add themselves | Fits the business stage. Starts too slowly to rely on now. |

### The Catalogue agents: how often

| | Approach | Trade-off |
|---|---|---|
| Daily AI sweep | The freshest data | An ongoing cost that's a burden at this stage |
| **Weekly AI sweep, Saturdays (chosen)** | One run a week, AI tagging, Admin approves | Small, predictable cost. Data is at most a week old, which is enough: location, price, duration and open-or-closed change slowly. |
| Seed once, check monthly, Members flag | Near-free | Prices entered by hand in Admin. Slower to pick up new things. |
| Hand-curated, or OpenStreetMap | Free | Too slow and patchy for Dubai. OpenStreetMap's licence may require sharing our place database. |

Khairul picked **A for the engine**, **A for the sources**, and **a weekly Saturday sweep** (2026-11-22).

## The design

### 1. What an activity is (the shared shape)

The Catalogue becomes **activities** backed by **places**:

- **Activity:** a kind of thing to do: "Yoga class", "Sound bath", "Slow brunch", "10-minute veggie omelette", "Tea for Two episode", "Sunset walk".
  - Carries: Pillar(s); Goals; energy fit; a typical duration; whether it **needs a place**; outdoor or not; light version or not.
  - Activities that need a place are suggested only when there are approved places near her.
  - Activities that don't need one (recipes, podcasts, videos, a walk, a stretch, a message to a Stepsister) carry their own cost (usually free) and duration, and may link to content.
  - **Events and social activities** found by the sweep are activities too, tied to their place. They may carry a **time remark** ("Saturdays, 7 am") and an **end date**. After the end date they drop out on their own. The remark is shown on the card and never used to fit the plan.
- **Place:** a real venue: name, location (lat/lng), area, the source's ID, the activities it offers, a **price range in AED per activity**, opening hours, and a status of `pending`, `approved`, `rejected` or `closed`.
- **Content item:** a recipe, podcast episode or video: source, link, duration, the activity it belongs to, tags, and a screen result of `passed` or `held`.

**Today's 29 items carry over** as the first activities, with the same rows and IDs, so her history and "ever shown" continue. Items like yoga, massage and reformer are marked as needing a place.

The existing `bestie.catalogue_items` already has `google_place_id`, `content_url`, `area` and `partner_id`. The builder decides whether to extend it or add `places` and `content_items` alongside it. Either way, Suggestions keep pointing at an **activity**, and history and learning stay per activity.

### 2. The area map

Each of the 40-odd Home areas (`HOME_AREAS` in `join.ts`) gets a centre point. "Within 5 km" is the straight-line distance from her area's centre to the place.

**"Somewhere else"** has no centre. A Member whose area is "Somewhere else" is asked at Check-in to pick the nearest listed area for today (Khairul, 2026-11-22). Her Home area is unchanged.

Travel time is estimated from distance with a simple Dubai rule. The proposal is about 3 minutes per km by car, with a minimum of 10 minutes, counted each way. It's tunable and doesn't need a maps API on every Check-in.

### 3. The engine (`bestie-4`)

**Input:** energy, minutes, budget in AED, area, and an optional Goal. Same as today.

**Step 1: hard limits.** An activity is a candidate for a Pillar only if:
- it suits her energy;
- if it needs a place, **at least 2 approved, open places within 5 km** offer it, and the cheapest of them fits her budget;
- its time (duration + travel to the nearest fitting place, both ways) fits;
- it wasn't in yesterday's plan;
- Connect-only activities appear only when her Goal is Connect (kept from today).

**Each place-needing activity's anchor place.** For each such activity, the anchor is the **nearest approved place whose price range top fits her budget**. Its range top is the activity's cost, so the plan never runs over, as today's seed does. The anchor's travel (both ways) plus the activity's duration is the activity's time. So cost and time always come from one real place.

**Step 2: score each candidate activity (0 to 1).** This ranks activities on their own, before any plan exists:
```
activity score = 0.45 × Goal fit     1 if it carries her Goal, 0 if not; with no Goal, all score 0.5
               + 0.20 × Energy fit   how well its intensity matches her energy (low → gentle, high → intense)
               + 0.20 × History      her recent outcomes on it, fading over 30 days (only with personalisation Consent, #102; otherwise 0.5)
               + 0.15 × Freshness    1 if not shown to her in 14 days, scaling down to 0 if shown yesterday
               − 0.15 × Heat         outdoor, May to October
```
Each part is normalised to 0 to 1. The weights live in one constant and are part of `bestie-4`.

**Budget use** is a property of the whole plan, judged in Step 3. A plan that spends between about **40% and 90%** of her budget scores 1. Below 40% it scales down linearly to 0 at no spend. Over budget is never allowed. With a budget of 0, free plans score 1. This is how AED 1000 and 2 hours gets a massage, while AED 1000 and 10 minutes doesn't get pushed into spending.

**Step 3: choose the whole plan.**
- Take the top 8 candidates per Pillar by activity score.
- Try every combination that covers each Pillar once. A two-Pillar activity covers both but is **counted once**, so it can't outscore a plan by doubling up (the run-club problem).
- Keep only combinations within her time and budget.
- **Plan score = 0.85 × (mean of its activity scores) + 0.15 × Budget use.**
- If a Pillar has nothing that fits, its light version fills in, as today.

**Step 4: variety.**
- Pick at random among plans within **5%** of the best.
- Seed the randomness with her Member ID and the Dubai date, so a reload shows the same plan and tests are repeatable.

**The places shown:**
- Up to 3 per Suggestion: approved, open, within 5 km, and fitting what's left of her budget and time **after the rest of the plan**. The anchor is always one of them.
- **Nearest first**, with no other ranking.
- Each shows its name, area, distance and price range, and opens the place in a map.
- **Display only in v1.** Tapping a place is not a recorded choice, and Proof is unchanged. The places shown, in order, **are saved on the Suggestion**, so we can check later that nothing was ranked up.

**Content activities** (recipe, podcast, video): the Suggestion carries **one specific content item**, recorded on the Suggestion. It's chosen as the best tag match she hasn't been shown in 30 days, then the newest. Freshness for the activity is still tracked per activity.

**New for you:** kept from today. One Suggestion is marked new if she's never seen that activity, leaning towards her weakest Pillar one day in three.

**"Why" line:** built from the part of the score that counted most, plus the heat or sunset hint, like today.

**Swap:** alternatives come from the same candidates and scores, excluding what's already in her plan.

**Visitors:** visitors who haven't joined get the same engine without history or Consent-based terms. The browser's copy (`src/app/wellness/bestie/engine.ts`) is retired. Visitor plans stay unrecorded (ADR-0003).

### 4. The Catalogue agents

They run **every Saturday** as a scheduled job in a **new edge function**, kept apart from `server`. Scope is Dubai, matching the Home areas.

| Content | Source (to confirm per terms) | Goes live |
|---|---|---|
| Places | A places API: Google Places or Foursquare. Gives location, type, hours and status. Searched per area for each activity that needs a place. | After **Admin approval**, once per place |
| Events and social activities | Official listings that allow it (an events API, or a venue's or organiser's own page), found and read by the AI step | After **Admin approval**, each one |
| Prices and durations | The venue's own website, read by an agent, giving an AED range per activity | Shown to Admin with the place. After approval, updates flow without review. |
| Recipes | A licensed recipe API (Edamam or Spoonacular) | Straight in, after the automatic screen |
| Podcasts | Podcast Index, or Apple's podcast search | Straight in, after the automatic screen |
| Videos | YouTube Data API, played in the official player | Straight in, after the automatic screen. Points from her reflection only. |

**Each Saturday run:**
1. Fetch new and changed items from each source.
2. An AI step tags each item with activity, Pillar, Goals, energy, duration, price range and, for events, the time remark and end date. It uses the Claude API, on the cheapest current model that tags accurately in tests, to keep the weekly cost small.
3. Screen videos, recipes and podcasts against the voice rules (no weight, diet, food rules, medical or supplement claims, no news). Anything that fails is `held` and visible in Admin. Nothing waits on a person.
4. New places go to `pending`. Approved places get their updates (hours, prices, closed) applied without review. A place the source reports closed becomes `closed` and drops out.
5. Re-fetch or expire stored fields as each source's terms require.
6. Log what changed, so a bad run can be seen and undone.

**What the sweep needs from Admin** (an input to the Admin scoping, not its design):
- A list of the week's findings: new places, events and social activities, with map location, source link, the activities, prices and time remarks found, and the evidence.
- Select and approve, reject, or edit then approve.
- A separate list of held content, to release or remove.

A **full Admin page** replaces today's Legacy `/admin`. It is scoped as its own project next (Khairul, 2026-11-22), with no daily-lines screen.

### 5. The order of the build

1. **The shape and the area map:** activities, places and content items; area centres; the `bestie-3` baseline numbers.
2. **The Saturday sweep,** with one source per kind to start, and growth from there. Its findings need the Admin review lists, so this step lands with, or after, that part of the full Admin page.
3. **The engine `bestie-4`:** server engine, swap, visitors, why lines, places on the Suggestion card, and the switch-over.

Each step is its own ticket or tickets under a new parent issue in `Krackie8/oriri-web`. Each is shippable alone.

**Switch-over:** `bestie-3` stays live until approved places are enough that, for every Home area with a centre, made-up Check-ins at AED 100, 300 and 1000 with 2 hours get a place-backed Move without a light version. Only then does `bestie-4` go live, with Khairul's yes.

**Admin sign-in** is already decided: a magic link to her email (DEC-009).

## Related work (not in this design)

- **The full Admin page:** scoped next as its own project.
- **Automatic daily lines (#101):** Bestie learns Ren's voice from the 64 approved lines and writes new ones, with no manual writing.
  - New lines pass the same automatic rules (`lineProblems`), or they're dropped.
  - Model-written lines show unsigned. "· Ren" stays only on lines Ren wrote or approved.
  - Learning which lines land needs a signal that doesn't exist yet, for example a small tap on the line.

## Calls made by Claude (to check)

- Distance is straight-line from area centres. Travel time is estimated, not taken from a maps API.
- At least 2 nearby fitting places before an activity can be suggested. Show up to 3, nearest first.
- Activity score weights: Goal 0.45, Energy 0.20, History 0.20, Freshness 0.15, minus 0.15 for heat. Plan score = 0.85 × the mean activity score + 0.15 × Budget use, with a sweet spot of 40–90%. A two-Pillar activity counts once.
- An activity's cost and time come from one anchor place: the nearest whose price-range top fits.
- Places shown are display only, but recorded in order on the Suggestion. A content Suggestion records its specific item.
- Today's 29 items carry over as activities (same IDs), and `bestie-3` stays live until the switch-over test passes.
- Variety: within 5% of the best, seeded by Member and day.
- The sweep runs in a new function, every Saturday, with the cheapest Claude model that tags accurately. Recipes, podcasts and videos are refreshed in the same run.
- Approval is once per place. Each event is approved on its own. Podcasts go straight in like videos.
- Events carry a time remark and an end date, and drop out after it. Ratings aren't shown or used.

## Left to the builder

- The exact tables and columns, and whether to extend `catalogue_items` or add new tables.
- Which places API to use, after checking terms and cost.
- The activity list itself (the first full set of activity types and their tags), proposed for Khairul's review.
- How the Suggestion card shows places on phones.
- The test set of made-up Check-ins and the checks that prove "plans match her Check-in".

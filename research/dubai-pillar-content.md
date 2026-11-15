# Research: content sources for Dubai Suggestions per Pillar

Ticket: #59 · Date: 2026-11-15 · Sources: repo at `main` + primary Google/YouTube policy pages.

## Answer in brief

v1 can ship on content Oriri already owns or links to: Ren's guides directory and the hand-curated `VENUES` list (Move, Meal), Tea for Two plus linked books/podcasts (Mindset), and Stepsisters moments plus Oriri events (Meet up). Keep places as **Google Maps links (Maps URLs)**, not Places API data, so no caching or attribution rules apply. Use YouTube only through the official embedded player. **Meet up is the gap**: it has one option and falls back to nothing when no event is scheduled.

## What exists today (Dubai)

Engine options, from `src/app/wellness/bestie/engine.ts` (`OPTIONS`, 30 total; `kind` maps to a Pillar at line ~247):

| Pillar | Engine options (kinds) | Named venues (`src/app/wellness/bestie/venues.ts`) |
|---|---|---|
| Move | 16: workout 6 (matpilates, runclub, hotclass, reformer, strength, swim), gentle 3 (stretch, walk, yoga), recovery 4 (sauna, soundbath, massage, spaday), treat manipedi + friendwalk | 41 venues across 12 keys (walk 7, spaday 4, reformer/strength/yoga/hotclass/soundbath 3 each, swim/sauna/massage/manipedi 2 each) |
| Meal | 8: meal 6 (fridge, oats, glowbowl, bowl, brunch, lunch), snack 2 (smoothiehome, juice) | 16 (brunch 5, lunch 4, juice 4, bowl 3) |
| Mindset | 6: teafortwo, podcast, book, sleep, journal + treat bookshop | 3 bookshops |
| Meet up | **1**: stepsisters | 0 |

- 10 of the 54 venues are `ren: true` (from Ren's directory). Venues are tagged by zone (west/central/east via `ZONE_OF`).
- Homepage teaser picks: 2 per Pillar, hard-coded in `src/app/wellness/bestie/picks.ts`.
- Guides directory: `WellnessGuide` in `src/app/utils/wellnessApi.ts` (`GUIDE_CATEGORIES` Move/Meal/Mindset/Meetup, `GUIDE_CITIES` Dubai/Kuala Lumpur, `PRICE_LEVELS` Free→AED AED AED, fields `area`, `maps`, `instagram`). It is served live from `/wellness/guides`. `public/data/guides.json` is a snapshot written at deploy time and **is not in the repo**, and `https://oriri.me/data/guides.json` did not return JSON when fetched. So the live per-category count was not checked. Next step: run `getGuides()` against prod and count Dubai rows that are not hidden, by category × price.
- Events (`WellnessEvent`: date, startTime, category, partner) and `StepsistersMoment` (upcoming/recap, link to RSVP or WhatsApp) are also served live by the API. They are dated, so on many days Meet up has nothing to offer.

## Google Maps / Places terms

Source: https://developers.google.com/maps/documentation/places/web-service/policies (and the Maps Service Specific Terms it links to).

- Place IDs may be stored indefinitely. Lat/lng may be cached for at most 30 consecutive days. Do not "copy and save business names, addresses, or user reviews", and do not pre-fetch, index or store other Maps content.
- Anywhere Places content is shown off a Google map, show Google Maps attribution (the logo, 16–19dp, never hidden or changed). Credit the authors of photos and reviews, and link through `googleMapsUri`.
- Do not create content derived from Maps content.
- **Implication:** Oriri's own curated name, area, price and note are Oriri content, so they can live in Supabase. Store `place_id` next to them if Places is used. Fetch live hours, rating and photos at view time and show them with attribution, never store them. Today's approach (a `links.maps(...)` search URL / Maps URL) calls no API, so none of these limits apply. Keep it that way for v1.

## YouTube terms

Source: https://developers.google.com/youtube/terms/developer-policies

- Use the official embedded player only. Do not overlay, modify or block it, its links or its ads (§III.I.4–6). No background play (§III.I.9). Do not cache or store the audiovisual content (§III.E.1).
- **Do not charge users to watch in an embedded player** or gate playback behind any action beyond play (§III.F.3.a–b). So a "members-only" Mindset video cannot be a paywalled YouTube embed: link out instead, or host members-only content yourself.
- No rewards for watching, liking or subscribing (§III.F.3.c). This matters if Completions or Levels are awarded for a watched video: count the Completion as self-reported reflection, not as a watch event.
- API metadata (titles, stats) can be cached for at most 30 days. Storing only the video ID plus Oriri's own title or note avoids this.
- Set autoplay off to limit data sharing before the user plays. The privacy policy must disclose the embed (§III.A.2, §III.E.4.i).

## How much content is needed so energy × time × budget is never empty

The engine filters by `fit[energy] > 0`, `min <= room`, `needs <= minutes` and `maxOf(o) <= cap` (engine.ts ~line 311). The cells to cover are 3 energies (Low/Steady/High) × 2 budgets (free / paid) × 2 times (short <30 min / long ≥60 min) = **12 cells per Pillar**.

- **Floor (never empty):** at least one **free, ≤15-min, home or anywhere** option per Pillar that fits every energy level. Move, Meal and Mindset already have one (stretch/walk, fridge/oats/smoothie, journal/sleep/podcast). **Meet up has none.** It needs an evergreen free option (for example "message a friend for a walk", or a standing Stepsisters WhatsApp group) so the Pillar does not depend on a dated event.
- **Variety (so Swap still works):** about 3 options per cell. That is roughly 12×3, about 25–35 options per Pillar once options that cover several cells are counted once.
- **Venues:** for each Move/Meal venue key, at least 1 non-chain venue per zone (3 zones) or 1 chain. That is about 3 per key. Today these keys are thin: swim, sauna, massage and manipedi (2 each).
- **Mindset:** about 10–15 items (Tea for Two episodes by topic, plus curated YouTube IDs and books), split by length (≤10 / 25 / 45+ min) and energy (calm vs. thinking).
- **Meet up:** at least 1 evergreen free option, plus a target of ≥2 dated events a week (Oriri + partner events + Stepsisters) so most days have a real one.

Gap summary: Meet up (1 option, 0 venues) is the blocker. Mindset is thin on video. Move and Meal are adequate, but four venue keys are below 3.

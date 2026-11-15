# Glossary

Domain language for Oriri. Use these terms in code, issues and reviews.

**Wellness site**: the live Oriri product, routed by `WellnessSite.tsx` (home, Plan, Bestie, Membership, Shop, Podcast, About, Profile). All new work targets it. Podcast and Nourish will return as features *inside* the Wellness site.
_Avoid_: "the new app".

**Legacy app**: the older podcast/Nourish/VIP app rendered by `App.tsx` for any non-Wellness path. Frozen: no new features, not migrated to the Function client; its features get rebuilt inside the Wellness site.
_Avoid_: "the old site", "AppLayout".

**Function client**: the single client module through which the Wellness site talks to the edge function `make-server-a278ea32`. Callers use named domain actions; only the Function client knows paths, auth and the Relay.

**Relay**: the same-origin path `/api/fn/*` (`.htaccess` → `public/api/fn.php`) that proxies calls to the edge function, because iPhone Safari drops some cross-site requests after preflight. Falls back to a direct call when broken.

**Free day**: the one free Bestie day a visitor claims with an email. Claims that fail to send are queued locally and retried on the next visit, so the plan still unlocks.

**Bestie**: Oriri's recommendation engine and the heart of the product. From a member's Check-in it suggests one thing per Pillar for her current city, then learns from what she accepts, skips and completes.
_Avoid_: "the AI", "the algorithm".

**Member**: a woman with an Oriri account. Her Free day is the first day of her membership history, not a separate lead.
_Avoid_: "user" in product copy, "lead" once she has an account.

**Check-in**: what a Member tells Bestie before it suggests: her energy (mood), the time she has and her budget.

**Pillar**: one of the four areas Bestie suggests in and a Member grows in: **Move** (activity), **Meal** (a place to eat or something to eat), **Mindset** (a video or podcast to watch or listen to), **Meet up** (a social or community connection).

**Day plan**: the four Suggestions Bestie makes from one Check-in, fitted together into her time and budget. A Member has one active Day plan per day; checking in again replaces it.

**Suggestion**: one thing Bestie offers for one Pillar after a Check-in. A Member accepts, swaps or skips it.

**Completion**: a Member marking a Suggestion as done, with Proof. Only Completions grow her Profile.

**Proof**: what backs up a Completion. How strict it must be depends on what the Completion unlocks: a light check (tick, optional photo, sanity limits) for Levels; strong evidence (venue location, QR code at a Meet up, health data) where a real reward is at stake.

**Reflection**: the one line a Member writes to complete a Mindset Suggestion. It is what earns the Completion, not the watching or listening.

**Journal**: a Member's private record of her Completions, photos and Reflections.

**Met at Oriri**: the badge a Member earns by scanning the QR code at an Oriri or partner Meet up. It is the only trust mark other Members see by default.

**Morning with Bestie**: the daily card (a line from Ren, today's hints, this week's Meet up) with the Check-in underneath. The reason to open Oriri each morning.

**Wrap-up**: the evening moment when a Member ticks off her Completions and writes her Reflection.

**Streak**: the run of days on which a Member completed at least one Suggestion, with one free rest day per week. It never affects Levels.

**Profile**: a Member's growth across the four Pillars, shown as a spider chart.

**Level**: a Member's standing in one Pillar (1–10), earned through Completions. Levels never go down.

**Status**: the title a Member's Levels give her, made of a Shape and a Tier (e.g. "Radiant Social Mover"). Names to be decided.

**Shape**: the part of a Status that says where a Member is strongest: one Pillar, a pair of Pillars, or Balanced.

**Tier**: the part of a Status that says how far a Member has grown overall, from her total Levels.

**City**: where Suggestions come from, taken from the Member's current location. Dubai only for now.

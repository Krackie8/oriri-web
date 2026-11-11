# Wellness Bestie by ORIRI: design guidelines

## Scope
- Marketing app lives in `src/app/wellness/` and renders standalone (no podcast header, tab bar, splash or onboarding).
- Routes: `/` Homepage · `/plan` Options · `/plan/inputs` Input · `/plan/day` Curated day · `/membership` Membership preview · `/about` · `/privacy`. `/pilot` (old waitlist form) redirects to `/plan/inputs` with its UTMs.
- Say "waitlist", never "founding". ONE sign-up: the free day gate IS the waitlist form (email, optional Instagram handle, how they heard, consent; never phone). Every "Join the waitlist" button is `WaitlistLink` (kit.tsx): it opens the planner, or shows "You're on the waitlist" once this device has signed up.
- Homepage order: hero "Your wellness plan, curated for you." → How it works (Check in · Get your planner · Tap & track) → Ren's picks directory (no times or prices; Meetup card holds Stepsisters + upcoming events) → plum band. No header CTA.
- One shared bottom tab bar (`components/BottomTabBar.tsx`: Home `/`, Plan, Episodes, Shop, Profile) on the Wellness Bestie pages and the podcast-app pages. `/podcast` redirects to `/`. The podcast app uses the same ivory/plum/gold tokens (`src/styles/globals.css`) and Bodoni Moda display font.
- Waitlist profile collects Move (workouts), Meal and Mindset tags; one shared tag is enough to match.
- Prices: recipes, videos, podcasts and books are Free. Paid venues show an average range ("AED 50–80"); budget checks use the top of the range.
- Swipe for a bestie: a mutual "Say hi" connects both on Instagram first (handles hidden until mutual).
- Tap & track: ticks and weekly stats are stored on-device (`bestie/tracker.ts`), shown as thin rings with pillar icons. `/bestie` and `/nourish*` redirect.
- Podcast-app screens (episodes, shop, profile, community, admin) share the ivory/plum/gold theme.
- Mobile web app: content sits in a 390–430px column (`Screen` in `bestie/kit.tsx`).

## Positioning
- Never name a city in copy (we will scale). City-specific data (currency, areas, budget chips) lives only in `bestie/config.ts`.

## Style: quiet-luxury editorial
- Ivory `#F7F3EE` background (`wb-paper`), cards `#FFFDFA` (`wb-shell`), plum `#4A2C3D` primary (`wb-plum`), gold `#C9A46A` accent (`wb-gold`, decorative only: hairlines, icons, selected outlines; never body text).
- Headings: Bodoni Moda Regular (400). Body/UI: Figtree. No italics anywhere.
- Minimum text size 14px. Pill buttons. Cards 16–20px radius. Real photos (Unsplash IDs or uploaded files) via `Photo`.
- Pillar icons are thin line icons (`PillarIcon`), never emoji.

## Content
- Pillars: Move (studios & recovery), Meal (cafés, restaurants, recipes), Mindset (podcasts by category incl. Tea for Two, books, articles), Meetup (Stepsisters free events + swipe for a bestie).
- Homepage picks (2 per pillar) are edited in `bestie/picks.ts`. Plan options are in `bestie/engine.ts`.

## Free day plan
- Flexible checklist, no clock times. Item durations add up exactly to the visitor's time (min 30 min). One Meal; extras are Move or Mindset.
- Meetup is never a checklist item. A Stepsisters event shows as a separate "Happening today" card only when one is scheduled for today (`/wellness/moments`).
- Every item must have a follow-through link (map search to find & book, recipe, video, episode, book) or in-app steps. Links are built in `bestie/config.ts` (`links.*`); Tea for Two always goes to `/episodes`.
- The last item is locked until the email gate.

## Free day + leads
- One free day per email. Gate = waitlist sign-up: email + Instagram + heard_from + consent → `POST /bestie/free-day` (KV `bestie:freeday:<email>`, Google Sheet tab "Free days", notifies account@oriri.me). 409 `used` → "already on the waitlist". Also tracked on-device.
- Lead email checks: format, throwaway domains, and the domain must accept mail (MX lookup; `domainAcceptsMail` in `utils/emailCheck.ts` on the client, `leadEmailProblem` on the server). Lookups fail open.
- Admin › Sign-ups › Wellness Bestie waitlist merges free day leads + old `/pilot` applications by email. Test leads (own email, example/test domains, "test" in the address, "+" copies, no mail server, or marked by hand via `/bestie/lead-flags`) are left out of the count.
- No phone numbers on the free-day gate.

## Analytics
- Never add raw GA4/Clarity snippets; IDs live in `analytics/config.ts` and load only after consent.
- Use helpers in `analytics/track.ts`: `cta_click`, `card_click` (box: move/meal/mindset/meetups), `form_submit` (form_name `free_day`), `plan_start`, `plan_inputs_done`, `membership_prompt_view`, `pattern_keep/change`, `bestie_swipe`.

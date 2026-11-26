# Oriri: guidelines

These are the rules for any change to Oriri. They hold until a ruling changes them. For what things are called and how they work, use the sources below. Don't copy their contents in here: copies go stale.

- **Words:** `GLOSSARY.md`, which covers Member, Join, Check-in, Pillar, Day plan, Suggestion, Completion, Proof, Level, Status and more. Use its terms in code, copy, issues and reviews.
- **Decisions about how it's built:** `docs/adr/`.
- **How a feature should work:** its spec in `docs/superpowers/specs/` and its GitHub issue (Bestie v1 is #67).
- **The look:** `src/styles/wellness.css`. Its values are the source of truth, and the token names are historical. `wb-plum` and `wb-gold` are no longer plum or gold.

## What Oriri is

- **Oriri is a wellness app for women.** Bestie suggests one thing per Pillar (Move, Meal, Mindset, Meet up) from a Member's Check-in, and learns from what she does.
- **Joining is free, with daily Bestie included.** Membership is the paid tier on top.
- **The Wellness site** (`src/app/wellness/`, routed by `WellnessSite.tsx`) is the product, and all new work targets it.
- **The Legacy app** (`App.tsx` for other paths, and `/admin/legacy`) is frozen. Don't add to it. Its features get rebuilt in the Wellness site or the new Admin.
- **The Admin** is at `/admin` (`src/app/admin/`) and is for the team only. It talks to its own edge function, `admin`, never to `make-server-a278ea32`.

## Copy and voice

- **Say "Join" and "Member".** A woman Joins Oriri and becomes a Member.
  - Never say "waitlist", "founding", "user", "lead" (once she has an account), "premium" or "VIP".
  - Some visitor screens still say "Join the waitlist". That copy goes with #82. Don't add more of it.
- **Call it Bestie.** Never "the AI" or "the algorithm".
- **Never name a city in copy.** Oriri will scale beyond its first city.
  - On the site, city data lives in `src/app/wellness/bestie/config.ts`: currency, areas and budget chips.
  - On the server, it's in `supabase/functions/server/join.ts` (`HOME_AREAS`).
- **Write short, plain and warm,** in Ren's voice. Write in sentences, with no jargon, IDs or codes on screen.
  - Dates read like "Sun 29 Nov", and times are local ("7:30 pm").
- **Ask for as little as possible.** Never ask for a phone number to Join.
- **Every Suggestion has a follow-through:** a link to find, book, cook, watch or listen, or in-app steps.

## Look: soft mocha, editorial

- **Colours, fonts and sizes come from the `wb-*` tokens** in `wellness.css`. Don't hard-code colours on Wellness pages.
  - The Admin uses the same palette, plus its blush accent `#C98A90` for buttons and focus rings.
- **Headings** are uppercase Red Hat Display (`font-wb-serif`). **Body and UI** are Figtree. Bodoni Moda is for the ORIRI wordmark only.
- **No italics anywhere.** The minimum text size is 14px.
- **Shapes:** pill buttons; cards with a 16–20px radius on a white shell.
- **Photos are real photos** (`Photo`). Pillar icons are thin line icons (`PillarIcon`), never emoji.
- **Mobile first:** content sits in a 390–430px column (`Screen` in `bestie/kit.tsx`). Every screen must work on a phone.
- **Accessibility:**
  - every form field has a label;
  - every control can be reached by keyboard and shows a focus ring;
  - errors are announced (`role="alert"` or `aria-live`).

## How it's built

- **The Wellness site talks to the server only through the Function client** (`src/app/wellness/functionClient/`). Callers use named actions; only the client knows paths, auth and the Relay.
- **Every write goes through an edge function.** The `bestie` schema isn't exposed to the browser (ADR-0002). Bestie's data lives in Postgres tables (ADR-0001).
- **A visitor's plan stays in her browser, and only Members' Check-ins are recorded** (ADR-0003).
- **Consent decides what may be recorded or learned.**
  - Terms is required to Join, and every other Consent is optional and starts off.
  - Bestie learns from a Member only with her personalisation Consent.
- **Being an admin** means a live `admin` row in `public.user_roles`, checked on the server for every request. Never `user_metadata`, and never an email address.
- **Analytics:** never add raw GA4 or Clarity snippets.
  - The IDs live in `wellness/analytics/config.ts` and load only after consent.
  - Track events with the helpers in `wellness/analytics/track.ts`.
- **Tests:**
  - Rules live in pure modules tested with vitest (`npm test`).
  - SQL is tested on the local Postgres copy (`bash supabase/twin/run.sh`, which needs Docker).
  - A change to the plan-fitting rules bumps the engine version (`BESTIE_ENGINE_VERSION`).
- **The repo is public.** No real email address, key or secret goes in a committed file. Use `example.test` addresses in fixtures.

## Releasing

- **One database and two edge functions serve both staging and production.** The database is `lemtlurqzmjdahbhunhz`; the functions are `make-server-a278ea32` and `admin`.
- **A push to `main` deploys staging** (`new.oriri.me`).
- **Production** (`www.oriri.me`), **every edge-function deploy, every migration on the live database and every merge** happen only with Khairul's yes.
- **Granting or removing an admin** happens on the Admin's Team screen, with Khairul's approval. Auth settings are his to change.

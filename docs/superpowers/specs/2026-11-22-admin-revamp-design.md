# Admin revamp: design (#100)

**Date:** 2026-11-22 · **Ticket:** #100 (under #67) · **Status:** design, piece one detailed

## Intent

Ren runs Oriri.me the way she would run a blog. She sees the big picture, and she updates the parts that are hers: events, the Catalogue, the Shop and the site's words. She never touches anything technical. Khairul uses the same Admin.

Today's Admin is the Legacy podcast app's `/admin`. It has 15 tabs, about 15,500 lines, and data that #68 deleted. It covers none of Bestie, and it is too complicated. Its admin check could also be faked; that hole was closed in PR #105 (function v156, 2026-11-22).

## Goals

- A **proper admin login of its own** at `oriri.me/admin`, not `/join`.
- **A new, much simpler look.** It is a **Home of tiles** (chosen by Khairul): one home page, where each tile shows what is waiting in its section.
- These sections, each shipped on its own:
  1. **Overview:** traffic, sign-ups and the main numbers.
  2. **Members:** look a Member up and manage her.
  3. **Events (Stepsisters):** Ren adds and updates Stepsisters events.
  4. **Catalogue:** mostly review of the Saturday AI sweep's findings (approve, reject, or edit then approve), plus places and activities Ren adds herself, plus held content to release or remove. Approval rules are in `docs/superpowers/specs/2026-11-22-day-plan-revamp-design.md` ("What the sweep needs from Admin").
  5. **Shop:** affiliate products where **Ren types every detail**: the link, photo, title and price. Uploading her own products comes later.
  6. **Membership and money:** free, trial and paying Members, revenue and cancellations. It is look-only and waits for #79.
  7. **Leads and invites:** the old waitlist, who has been invited, who joined, and Ambassador credit (#99).
  8. **Bestie at a glance:** plain charts showing what Members do most, what gets skipped, and how Streaks are going.
  9. **Site content:** the homepage headline, banners and "what's on" text, edited in simple forms.
  10. **Team:** who is an admin. Add or remove a person here; the role is held on the server.
  11. **Photo reports:** hide a reported Proof or Meet up photo.

## Non-goals

- **Daily lines.** They are written by a model in Ren's voice (#101). There is no lines screen.
- **Anything from the Legacy app that isn't listed above:** Podcast/Content, Platforms, VIP, Social, Store orders, Revenue as it is today, Analytics as it is today.
- **Detailed traffic analytics.** The Overview links out to Google Analytics for detail.
- **Importing Amazon products automatically.** Amazon's product API is closed to accounts without recent sales, and scraping its pages breaks its terms.
- **Ren's own products and checkout** (later).

## Anti-goals (a failure even if it works)

- Ren has to understand a technical word, an ID or an error code to do her job.
- Admin can be reached, or a role gained, by anything a Member controls: `user_metadata`, an email typed into a form, a request body.
- An Admin change redeploys or breaks the function every Member uses.
- Ren loses a way to update something she updates today (events, the Directory) before its new section exists.

## Constraints

- **Live is shared.** Supabase `lemtlurqzmjdahbhunhz` serves staging and production. Nothing is applied, deployed or merged without Khairul's yes.
- **Everything goes through an edge function** as `service_role` (ADR-0002). The `bestie` schema is not exposed.
- **Admin = a live `admin` row in `public.user_roles`**, checked on the server on every request (`supabase/functions/server/adminRole.ts`). Never `user_metadata`, never an email.
- **The repo is public.** Admin emails go in no committed file. Team changes happen through the Team screen, or by one-off SQL until it exists.
- **The site deploys staging on push to `main`** and production by hand (`deploy.yml`). An edge function deploys by hand (`deploy-function.yml`). A merge that needs a function or migration releases that first.
- **Two admins today:** Ren and Khairul. More are added later through Team.

## Approaches

| | Where the Admin's code lives | Trade-off |
|---|---|---|
| **A. New `/admin` section of the site + its own `admin` edge function (chosen)** | A fresh `/admin` part of the existing site, loaded only when opened. A new `admin` function serves it, apart from `server`. | Admin changes never redeploy the Member function. It starts clean. Costs: a second function to deploy, and shared code (`adminRole.ts`, `kv_store.tsx`, the Postgres connection) moved to a shared folder both import. |
| B. New `/admin` section served by the existing `server` function | The same page, with its routes added to `server`. | One function and one deploy. But every Admin change redeploys the live Member function, and an already ~9,000-line file grows. |
| C. Separate admin app on its own subdomain | A second build and hosting setup. | Rejected: Khairul asked for `oriri.me/admin`, and a second pipeline for two users isn't worth it. |

Khairul picked **A** (2026-11-22).

**Login method:** Khairul picked **A, an email link for the team only**, with **an authenticator code added later**. These were rejected:
- **Email and password:** passwords get reused and leaked, and Supabase's leaked-password check is off on the current plan (#86).
- **Google:** a different Google address lands in a separate account that isn't an admin (DEC-009).

## Delivery: in pieces

Each piece gets a short design pass of its own just before it is built.

1. **Foundation:** the login, the `admin` function, the Home of tiles and the Overview. Legacy moves to `/admin/legacy`. *(Detailed below.)*
2. Members + Team
3. Events
4. Catalogue. This goes with, or before, the Saturday sweep (day plan revamp, step 2).
5. Shop
6. Site content
7. Leads and invites
8. Bestie at a glance
9. Photo reports
10. Membership and money (after #79)

Each section that ships replaces its Legacy tab, and that tab is deleted.

## Piece one: the foundation (decided)

### Login at `oriri.me/admin`

- The page shows the Oriri wordmark, "Admin", an email field, a "Send me a sign-in link" button and the line "Only Oriri's team can sign in here." It has no Google, no password and no link to `/join`.
- **Sending the link happens on the server.** `POST /admin/sign-in-link` in the `admin` function, with body `{ email }`:
  - It looks the email up (case-insensitive) in `auth.users` and checks for a live admin row in `user_roles`.
  - **Only if both hold** does it make a magic link for that existing account (`auth.admin.generateLink`, type `magiclink`, redirect `oriri.me/admin`), which **never creates a user**. It sends the link in **its own Admin email** ("Sign in to Oriri Admin") from `account@oriri.me`, through the SMTP the function already uses for sign-up mail (`SMTP_*`). *(Builder's call: Ren gets an email worded for Admin, not the Member sign-in email; no Supabase Auth template or setting changes; and Supabase's built-in mail limits don't apply.)*
  - **It always answers the same way:** the same status, the same body and roughly the same time, whether or not a link was sent. Nobody can learn who is an admin.
  - It is rate-limited per email and per IP, so it can't be used to flood an inbox.
- **When she arrives** from the link, the page has a session and asks `GET /admin/me`. That answers `{ isAdmin, name }` from `user_roles`. If `isAdmin` is true, the Home loads. Otherwise she sees the login page, with no error. This covers a Member who is signed in and wanders to `/admin`.
- **Every Admin route** checks the role again on the server (the `hasAdminRole` helper). The page hiding things is never the guard.
- **Sign out** is in the "Ren ▾" menu at the top right.
- **Later:** an authenticator code (Supabase MFA, TOTP) as a second step after the link. This is not in piece one, but the routes are shaped so that requiring it later is one check.

### Home of tiles

```
oriri admin                                   Ren ▾
Good morning, Ren
248 Members · 3.1k visits this week · 3 things waiting

[ Overview ] [ Members ] [ Events   ] [ Catalogue ] [ Shop ]
[ Site content ] [ Leads ] [ Bestie ] [ Reports ] [ Team ]
```

- **The look** comes from Oriri's own palette in `src/styles/wellness.css` (paper `#FAF8F5`, shell, stone, sand, taupe, ink `#2B2522`) with blush `#C98A90` for counts. A serif is used for headings. It is calm, with generous space and few words.
- **Each tile** shows its name and one line of what is waiting ("12 to review", "2 end soon"). A blush pill marks things that need her.
- **The greeting** uses Dubai time and her first name, taken from `profiles.display_name` only when that is a name rather than an email. Otherwise it reads "Good morning", with no name. `GET /admin/me` returns that first name or null. *(Builder's call.)*
- **In piece one, only Overview opens.** Every other tile reads "Coming soon" and can't be pressed. It turns on when its section ships.
- Opening a tile shows that section with "← Home". It works on a phone and on a laptop.

### Overview

| Number | Source |
|---|---|
| Visits, 7 and 30 days, with the trend against the previous period | The first-party cookieless counts the site already records (KV `stats:hit:*` / `stats:day:*`, read today by `GET /wellness/stats`), plus a link to Google Analytics |
| Members: total, new this week, new this month | `bestie.members` |
| Active this week: Members who checked in | `bestie.check_ins` |
| Leads not yet Members | The lead stores in KV (`waitlist:bestie:*`, `plan:signup:*`, `nourish:lead:*`). The count is unique emails, case-insensitive, with no Member account yet, leaving out emails flagged as test in `bestie:leadflag:*`. |
| Paying | Shows "After Membership" until #79 |

- **Who is counted.** Members and "Active" leave out admins (`adminUserIds`) and accounts whose email is flagged as test in `bestie:leadflag:*`. With few Members, the team's own accounts would skew the numbers. *(Builder's call.)*
- **Leads aren't marked "invited" yet.** No invite record exists. The tile reads "leads not yet Members"; recording who was invited belongs to Leads and invites (piece 7). *(Builder's call.)*
- Weeks and months follow Dubai time. Numbers show as plain words ("248 Members"), with nothing technical.

### Legacy

- The Legacy dashboard moves to **`/admin/legacy`** and stays reachable by admins only, so Ren keeps editing events and the Directory there until those sections ship. Home has a small "Old admin" link to it.
- As each new section ships, its Legacy tab and that tab's server routes are deleted.
- Tabs with nothing to keep, whose data is gone or which are out of scope (Content, Platforms, VIP, Social, Store, Revenue, Analytics), are deleted from the page in piece one.
- **Their server routes stay until a separate cleanup.** That cleanup is one later `server` redeploy that removes the dead Legacy routes together. Piece one deploys only the new `admin` function and the site. *(Builder's call: it keeps piece one off the Member function entirely.)*

### The `admin` function

- It is a new edge function. **Piece one doesn't change or redeploy `server`.** The `admin` function imports the code it shares (`adminRole.ts`, `kv_store.tsx`) by relative path from `supabase/functions/server/`. Moving shared code into a `_shared` folder waits for the Legacy cleanup redeploy. *(Builder's call.)*
- `deploy-function.yml` gains a choice of which function to deploy.
- Its routes in piece one: `POST /admin/sign-in-link`, `GET /admin/me`, `GET /admin/overview`.

## Left to the builder

- That the Supabase bundler accepts the `admin` function's relative imports from `../server/`. If it doesn't, copy those few files into the `admin` function and add a test that keeps the copies identical.
- The Admin email's wording, kept short and plain.
- The rate limit's numbers and where it is stored.
- How the same-answer, same-time rule for the sign-in link is made true. A short fixed delay is fine.
- The component layout of the `/admin` section, and how it is lazy-loaded.
- How the Overview reads KV and Postgres. Reuse `kv_store.tsx` and the existing Postgres connection pattern.
- Which Legacy tabs are deleted in piece one, within the rule above, and whether `/admin/legacy` reuses the current `AdminProtectedRoute`. That route must check `user_roles` through the server, never metadata.
- The Supabase Auth redirect allow-list must include `https://oriri.me/admin`, `https://www.oriri.me/admin` and `https://new.oriri.me/admin`. Check it, and ask Khairul before changing an Auth setting.

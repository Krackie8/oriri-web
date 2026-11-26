# Admin piece 3: Events (design)

**Date:** 2026-11-26 · **Ticket:** #100 (under #67) · **Parent spec:** `2026-11-22-admin-revamp-design.md` · **Status:** design, not built

## Intent

Ren adds and keeps up the events Members see, all in the new Admin: Stepsisters meet-ups and their photo recaps, and partner events.
She sees who has booked each one.

Today this lives in one Legacy tab, "Stepsisters & events" (`StepsistersManagement.tsx` and `WellnessCalendarManagement.tsx`).
That tab goes once this ships.

## Rulings (Khairul, 2026-11-26)

1. **Both kinds go in one Events section:** Stepsisters (meet-ups and recaps) and partner events (the old Wellness Calendar). Both Legacy screens are replaced.
2. **They're kept in the KV entries already used:** `wellness:moment:<id>` and `wellness:event:<id>`. There's no migration.
   The Meet up card (`thisWeeksMeetUp`, #74), the homepage and bookings already read these entries, so whatever Ren adds shows up there with no change to `server`.
   Moving events to Postgres waits for #81 (Privacy) or the Legacy cleanup redeploy of `server`.
3. **Bookings:** Ren sees who booked each event (name, email, WhatsApp, spots) and can remove a booking.

## Goals

- Ren can:
  - add, edit and delete a Stepsisters meet-up or recap;
  - add, edit and delete a partner event;
  - each with photos.
- **She sees what Members will see.** Each upcoming event within the next 7 days is marked "Shows in Meet up this week", or "Pinned for Meet up".
- She sees the bookings for each event and can remove one.
- **The Events tile** on Home reads "3 coming up · 7 bookings". It has a pill when an event in the next 7 days has new bookings since she last opened Events.

## Non-goals

- Changing how the Meet up card picks an event. That stays as it is in #74:
  - in the next 7 days, upcoming only;
  - pinned first, then Stepsisters, then partner events;
  - earliest first.
- Taking bookings, and the booking email to the team. Both stay in `server`, unchanged.
- The Directory (`wellness:guide:`). That belongs to Catalogue, piece 4.
- Importing an event's details from a link (Instagram, Eventbrite). The Legacy "quick link" only filled the link field, and the plain link field does that.

## Anti-goals

- **No route in `server` changes.** The Legacy write routes keep working until the cleanup redeploy, but no page calls them once the tab is gone.
- **No email address or name of a guest appears outside the bookings list.** Not in the tile, the URL or the logs.
- **A link that isn't `https://` is never saved.** The Member pages render `link` as a link, so a `javascript:` value would run on the site. Legacy accepts any string today.

## Constraints

- Live is shared: `lemtlurqzmjdahbhunhz`, `make-server-a278ea32` and `admin` serve both staging and production. Nothing is deployed or merged without Khairul's yes.
- Admin means a live `admin` row in `public.user_roles`, checked on every request (`hasAdminRole`, DEC-015).
- The `admin` function already imports `../server/kv_store.tsx` (piece one). Events use that same import.
- The Member side reads these fields, so their names and meaning stay as they are:
  - **Moment:** `id`, `title`, `date` (YYYY-MM-DD), `startTime`, `location`, `type` (`upcoming` or `recap`), `description`, `link`, `photos[]`, `pinned`, `createdAt`, `updatedAt`.
  - **Partner event:** `id`, `title`, `date`, `startTime`, `location`, `category`, `description`, `link`, `image`, `partner`, `pinned`, `createdAt`, `updatedAt`.
- **Bookings** are `rsvp:<ref>:<email>`. `ref` is `m-<moment id>` or `e-<event id>`.
  A record holds `name`, `email`, `phone`, `guests`, `eventTitle`, `eventDate`, `wb_source`, `bookedAt` and `updatedAt`.

## The screen

**Events, with "← Home":**
- Two lists: **Coming up** (date today or later, soonest first) and **Past** (latest first; only the 20 most recent, with "Show more").
- Each row shows:
  - the title, the date in plain words ("Sat 29 Nov, 7:30 pm"), the location;
  - a kind label, "Stepsisters" or the partner's name;
  - "Shows in Meet up this week" on the one event the Meet up card will pick (the same function the server uses);
  - its booking count ("4 booked · 6 spots").
- **"Add an event"** asks which kind first: Stepsisters meet-up, Stepsisters recap, or Partner event. Then it shows that kind's form.

**The form (one, with fields by kind):**
- **Title:** required, up to 120 characters.
- **Date:** required for every kind, a date picker. The Legacy server required it only for partner events.
- **Start time:** optional, HH:MM.
- **Location:** optional, up to 120 characters.
- **Description:** optional, up to 1,000 characters.
- **Link:** optional, `https://` only, up to 500 characters.
- **Stepsisters only:**
  - meet-up or recap;
  - photos, up to 12 (a recap is mostly photos).
- **Partner only:**
  - partner name and category, from the Legacy list `EVENT_CATEGORIES` (Movement, Mind, Food, Beauty, Workshop, Pop-up, Community);
  - one image.
- **"Pin for Meet up"**, a yes or no.
  - The Meet up card already honours `pinned`, but nothing could set it until now.
  - A pinned event still shows only in the week it falls in.
- Deleting asks "Delete this event? Its N bookings will be removed too." The event and its `rsvp:` entries go together, so no booking is left pointing at nothing.

**Bookings (opened from an event's row):**
- Shows name, email, WhatsApp, spots and when booked, newest first.
- **"Remove"** deletes that one booking, after a confirm.
- **"Copy emails"** puts the list on her clipboard, for messaging the guests herself. Nothing is sent from Admin.

The screen works on a phone and on a laptop, in Oriri's own palette, like Members and Team.

## The `admin` function

Its new routes check `hasAdminRole` on every request, the same as the others. Suggested names:

| Route | Does |
|---|---|
| `GET /admin/events` | Both kinds, with each event's booking count, and which one the Meet up card picks this week |
| `POST /admin/events` | Create. The body carries `kind: 'moment' \| 'event'` |
| `PUT /admin/events/:kind/:id` | Edit. It sends the `updatedAt` it loaded. If the stored one differs, it's refused with "Someone else changed this event. Reload to see it" |
| `DELETE /admin/events/:kind/:id` | Delete the event and its bookings |
| `GET /admin/events/:kind/:id/bookings` | That event's bookings |
| `DELETE /admin/events/:kind/:id/bookings/:email` | Remove one booking |
| `POST /admin/events/photo` | Upload one photo to `make-a278ea32-wellness` and return its public URL |

**Checks on every write (in one module, `events.ts`, with unit tests):**
- Only the known fields are kept, as listed under Constraints. `hidden` isn't offered: nothing reads it for events.
- Dates must be real calendar dates. Times are HH:MM. Text is trimmed and length-capped.
- **Links:** must parse as `https:` URLs.
- **Photos:**
  - every photo and image URL must be a public URL in the `make-a278ea32-wellness` bucket of this project;
  - an upload must be a JPEG, PNG or WebP of at most 8 MB, checked by its bytes and not its name;
  - the file name is generated.
- **The id** in a path must match the shape `rsvpEvent` accepts (`[A-Za-z0-9-]{6,64}`), so bookings keep finding their event.

**A record of changes:**
- Each create, edit, delete and booking removal writes `admin:eventlog:<ISO time>:<random>` to KV: who did it, what (kind, id, action) and when.
- It holds no guest details. A removed booking is logged as "1 booking removed from <event id>".
- It's read only by a later Admin view. No migration is needed.

**The tile:**
- It counts what's coming up and the bookings for those events.
- "New since she last opened Events" uses a per-admin KV marker, `admin:seen:events:<user id>`, set when she opens the section.

## Release order

1. Merge with Khairul's yes. The PR has the `admin` function, `/admin` Events, and the Legacy tab removed.
2. Deploy the `admin` function, with his yes.
3. Ship the site to staging on merge, then check it:
   - add, edit and pin a test event;
   - see it on the Meet up card;
   - book it as a Member, see the booking, and remove it;
   - delete the event.
4. Production, with his yes.

`server` isn't touched, and there's no migration.

## Left to the builder

- Whether the "Shows in Meet up this week" mark calls `thisWeeksMeetUp` from `../server/morning.ts` (preferred, since it's the one rule) or a copy. A copy needs a test that pins it to the original.
- How the list loads bookings without reading every `rsvp:` entry once per event. One `getByPrefix('rsvp:')`, then group by `ref`.
- **The Legacy tab:** remove "Stepsisters & events" and its two components from `AdminDashboard.tsx`, along with the `wellnessApi` write helpers nothing else uses.
  The Directory tab stays until Catalogue.
- The short wording on each screen, plain and in Oriri's voice.

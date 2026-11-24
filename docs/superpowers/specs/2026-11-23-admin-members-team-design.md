# Admin piece 2: Members + Team (design)

**Date:** 2026-11-23 · **Ticket:** #100 (under #67) · **Builds on:** piece one (#106, `e63ec72`), DEC-014, DEC-015, DEC-016 · **Parent spec:** `2026-11-22-admin-revamp-design.md`

## Intent

- **Members:** when a Member has a problem with her account, Ren finds her and sees her details. *(Khairul: "she just needs to see details of the user in case there's any problem with her account.")* It is a place to look, not to act.
- **Team:** who is an admin. Any admin can add or remove a person, with guards. More team members are added here from now on, not by SQL.

Members + Team replaces Legacy's **Users** tab (placeholder buttons only) and **Admin** tab (it calls the routes #105 removed, so it's already broken). Both tabs and `AdminManagement.tsx` are deleted.

## Goals

- Find a Member by part of her name or email, and open her details.
- See the admin list, add a person by email, and remove one.
- A Team change can't be made by someone who simply has an admin's open session long after she signed in, and every change is seen by every admin.

## Non-goals

- Changing anything about a Member: no edit, block, delete, password or email change. Problems that need a change go to Khairul, as today.
- Proof photos and Reflections. They're personal; Photo reports (piece 9) handles reported photos.
- Membership details beyond "Free" until #79.
- Roles other than admin (`user`, `vip` are left alone).
- An authenticator code (later, per the parent spec).

## Anti-goals

- A Member can gain admin by anything she controls. This includes her write grant on `user_roles`, which only the row rules hold back today.
- Ren sees an ID, a technical word or an error code.
- The team can be left with no admin, or an admin can lock herself out by accident.
- A Team change happens silently.
- An admin email is written into a committed file (the repo is public).
- The Member function `make-server-a278ea32` is changed or redeployed.

## Constraints

- Live is shared: `lemtlurqzmjdahbhunhz`, `make-server-a278ea32` and `admin` serve staging and production. Nothing is applied, deployed or merged without Khairul's yes. Granting or removing an admin role outside the Team screen is Khairul's to approve. Auth settings are his to change.
- Admin = a live `admin` row in `public.user_roles`, checked on every request (`hasAdminRole`). Never `user_metadata`, never an email.
- `service_role` can't select `auth.users`. Emails and sign-in times are read as the connection user in `sql.begin('read only', …)` (DEC-016 ruling 1).
- `profiles` links to the auth user by `user_id`, not `id`.

## What's live today (read on 2026-11-23, read-only)

- 10 accounts, 5 Members, 2 admins (Khairul, Ren). `user_roles` has 12 rows: those 2 admin rows plus `user`/`vip` rows.
- `user_roles`: `unique (user_id, role)`, FK to `auth.users` on delete cascade, row rules on with one read-own-row policy. **`authenticated` still holds INSERT (and the default grants).** Only the missing insert policy stops a Member adding her own admin row.
- `handle_new_user` (the sign-up trigger) writes the `user` row as its owner, so revoking `authenticated`'s grants doesn't affect it.
- The main account (Oriri's own mailbox) has **no Oriri account yet**, which is why its sign-in link never came. Khairul will register it on the main site. Its admin row is then granted by one-off SQL with his yes (it's the last grant made that way).

## Approaches

| | How | Trade-off |
|---|---|---|
| **A. New routes in the `admin` function + two screens on `/admin` (chosen)** | Same shape as piece one. | `server` stays untouched. Costs one `admin` deploy, one site release, one small migration. |
| B. A function per section | `admin-members`, `admin-team`. | More deploys and duplicated auth plumbing for two users. Dropped. |
| C. Team as a Postgres function called from the browser | An RPC that writes `user_roles`. | Goes against ADR-0002 (everything through an edge function) and puts a role-granting path on the Data API. Dropped. |

**Who may change the team (Khairul):** any admin, guarded. The rejected option was only the main account (tightest, but every change waits on whoever holds that inbox).

**How a change proves it's that admin (Khairul):** a recent sign-in. The rejected option was an email confirm link per change (stronger, but an extra email per change and more to build).

## Members

```
← Home                                         [ Search name or email ]
Members · 5
  Sara A.     sara@…      Joined 14 Nov   Last seen today
  Ren         ren…        Joined 14 May   Last seen 2 days ago   Team
  …
──────────────────────────────────────────────────────────────
Sara A. · sara@…
Account     Joined 14 Nov · Email confirmed · Last sign-in today 09:12
            Signs in with email link · Not blocked
Profile     Area Marina · Instagram @sara · Confirmed she's 18+
Consents    Terms ✓ · Location ✓ · Wellness ✓ · Personalisation ✓ · Push ✗ · Marketing ✗
Bestie      Last check-in yesterday · 12 check-ins · 9 done
            Streak 3 days · Status Glowing Explorer · 1 photo reported
Membership  Free
```

- **The list** holds every Member, newest first. Search matches part of a name or an email, case-insensitively. *(My call: with 5 Members the server returns at most 50 matches and the page doesn't paginate. Paging is added when the list outgrows it.)*
- **Tags:** "Team" for admins, "Test" for emails flagged as test in `bestie:leadflag:*`. They stay in the list so Ren can still look them up. *(My call.)*
- **The details** are what the sketch shows:
  - Account: from `auth.users`, read-only.
  - Name: `profiles.display_name` by `user_id`, only when it isn't an email (the same rule as `firstNameOf`).
  - Profile: from `bestie.members`.
  - Consents: the latest row per purpose, shown as given/not given/not asked.
  - Bestie numbers: from check-ins and live completions.
  - Streak: `streakOf`. Status: the same level/status code the Member app uses, imported from `server/` as pure modules (as piece one imports `adminRole.ts`).
  - Reported photos: count of flagged live completions.
  - Membership: "Free" unless a `bestie.memberships` row exists, in which case its status in plain words.
- **"Blocked"** is shown when the account is banned. There's no unblock button.
- **Words only:** dates as "14 Nov", times in Dubai time, no IDs on screen.
- An account with no Member profile (e.g. an admin added through Team) appears in Members only if it has a `bestie.members` row. *(My call: Members is about Members.)*

## Team

```
← Home
Team · 3
  Khairul    khairul…    Admin since 22 Nov   Last sign-in today
  Ren        ren…        Admin since 22 Nov   Last sign-in 2 days ago
  Oriri      oriri…      Admin since 23 Nov   Last sign-in never      [Remove]
[ Add a person: email ]  [ Add ]

Recent changes
  23 Nov 10:02  Khairul added oriri…
```

- **Add a person** by email:
  - If an account with that email exists, it gets a live admin row (insert, or clear an expired one).
  - If none exists, Team creates a plain sign-in account for that email (`auth.admin.createUser`, email confirmed, no password, no Member profile) and gives it the role. *(Needed: an outsider helper may have no account, as the main account didn't.)*
  - The new admin gets an email: "You've been added to Oriri Admin", with the `/admin` address. She signs in there with the usual link.
- **Remove:**
  - The admin row is deleted; the account and any Member profile are left alone.
  - **Not yourself, and never the last admin.** *(My call: removing yourself is the easiest accident, and another admin can do it.)* The button doesn't show on your own row; the server refuses anyway.
- **The guards, all on the server:**
  1. **Recent sign-in.** A change goes through only if the token's newest sign-in entry (`amr`, any method except a token refresh) is under **10 minutes** old. Otherwise the answer is "sign in again", and the screen reads: "For safety, sign in again to change the team", with a button that sends the usual link back to `/admin` (Team opens after sign-in).
  2. **Every admin is told.** After each change, an email goes to every admin, including the one added or removed: "Ren added Sara to Oriri Admin" / "Ren removed Sara from Oriri Admin". It is sent from Oriri's usual sender address through the same SMTP as the sign-in link.
  3. **A record of every change.** A new append-only table holds who, what, whom and when. It's shown under "Recent changes" (last 20).
  4. **Roles are only re-checked live.** The actor's admin role is checked on the request, as on every route.
- **The email address is checked** for shape only. Adding someone who's already an admin answers "already on the team" and changes nothing.

## The migration (needs Khairul's yes)

1. `revoke insert, update, delete on public.user_roles from anon, authenticated` (the second lock; reads keep the own-row policy).
2. A table for Team changes in the private `bestie` schema:
   - Columns: actor, target, target email, action `add`/`remove`, time.
   - No foreign keys, so deleting an account never tries to rewrite history.
   - Insert and select for `service_role` only, none for `anon`/`authenticated`.
   - A trigger refuses update and delete.

Verified on the local twin first, then on live with Khairul's yes, before the `admin` deploy that uses it.

## Release order

1. Migration (yes).
2. `admin` function deploy (yes).
3. Site to staging on merge (yes), check, then production (yes).
4. Grant the main account its admin row by one-off SQL once it's registered (yes).

`server` is not touched.

## Left to the builder

- **Reading the sign-in time:**
  - Read `amr` from the verified token: `getClaims`, or decode after `getUser` succeeds.
  - Check on staging that a magic-link sign-in gives an entry with its own timestamp, and that a token refresh keeps it.
  - If refresh drops it, fall back to the session's `created_at` read-only, and say so.
- **Route names and shapes.** Suggested:
  - `GET /admin/members?q=`
  - `GET /admin/members/:id`
  - `GET /admin/team`
  - `POST /admin/team`
  - `DELETE /admin/team/:userId`

  The `:id` is an opaque value the list hands back, never shown.
- **The SQL for the Members list and details.** Prefer one read-only statement each, kept in a module with a twin test (like `overviewQuery.ts`).
- **How the last-admin check stays true** under two removals at once, e.g. the count and delete in one transaction with a row lock.
- **The email wording**, short and plain.
- **Tile lines:** Members "5 Members"; Team "3 admins". No pill, since nothing waits on her here.
- **Legacy cleanup:** delete the Users and Admin tabs and `AdminManagement.tsx` from the page. The server's `list-admins`/`check-admin` routes wait for the later `server` cleanup redeploy.

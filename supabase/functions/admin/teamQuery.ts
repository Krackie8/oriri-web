/**
 * The four statements behind the Team page. A live admin row is public.user_roles with role 'admin'
 * and no expiry, or an expiry still ahead (as in has_role and adminRole.ts).
 *
 * TEAM_LIST_SQL: no parameters. The live admins, oldest first. Read-only, as the connection user
 *   (service_role cannot select auth.users).
 * TEAM_CHANGES_SQL: no parameters. The last 20 Team changes, newest first. The actor's email and name
 *   come from a left join, so a deleted account still shows; the target is the email recorded at the
 *   time. Read-only, as the connection user.
 * TEAM_GRANT_SQL: $1::uuid actor, $2::uuid target, $3::text target email. One statement, one column
 *   `result`. The actor's own live admin row is taken FOR SHARE (so it waits for a concurrent remove's
 *   FOR UPDATE); without it the answer is 'notActor' and nothing is written. Otherwise 'granted': the
 *   target gets a live admin row (insert, or clear the expiry of an existing one; an expired row also
 *   restarts its created_at, a live one keeps it) and an 'add' is recorded.
 *   Runs as service_role, so it never touches auth.users; the email is passed in.
 * TEAM_REMOVE_SQL: $1::uuid actor, $2::uuid target, $3::text target email. One statement, one column
 *   `result`: 'notActor' when the actor herself has no live admin row, 'notAdmin' when the target has
 *   none, 'last' when she is the only live admin, otherwise 'removed' after deleting her admin row
 *   and recording a 'remove'. The live admin
 *   rows are locked FOR UPDATE first (in a CTE: FOR UPDATE can't sit on an aggregate), so two removes
 *   at once are serialised and the second one counts what the first left: the last admin is never
 *   removed. Runs as service_role.
 *
 * supabase/tests/admin_team.test.sql embeds this text unchanged; teamQuery.test.ts keeps them identical.
 */
export const TEAM_LIST_SQL = `select r.user_id, u.email, p.display_name, r.created_at as since, u.last_sign_in_at
from public.user_roles r
join auth.users u on u.id = r.user_id
left join public.profiles p on p.user_id = r.user_id
where r.role = 'admin' and (r.expires_at is null or r.expires_at > now())
order by r.created_at, r.user_id`

export const TEAM_GRANT_SQL = `with actor as (
  select user_id from public.user_roles
  where user_id = $1::uuid and role = 'admin' and (expires_at is null or expires_at > now())
  for share
),
granted as (
  insert into public.user_roles as r (user_id, role, expires_at)
  select $2::uuid, 'admin', null where exists (select 1 from actor)
  on conflict (user_id, role) do update
    set expires_at = null,
      created_at = case when r.expires_at is null or r.expires_at > now() then r.created_at else now() end
  returning r.user_id
),
recorded as (
  insert into bestie.team_changes (actor_id, target_id, target_email, action)
  select $1::uuid, g.user_id, $3::text, 'add' from granted g
)
select case when exists (select 1 from actor) then 'granted' else 'notActor' end as result`

export const TEAM_REMOVE_SQL = `with live as (
  select user_id from public.user_roles
  where role = 'admin' and (expires_at is null or expires_at > now())
  for update
),
verdict as (
  select case
    when not coalesce(bool_or(user_id = $1::uuid), false) then 'notActor'
    when not coalesce(bool_or(user_id = $2::uuid), false) then 'notAdmin'
    when count(*) < 2 then 'last'
    else 'removed'
  end as result
  from live
),
gone as (
  delete from public.user_roles
  where user_id = $2::uuid and role = 'admin'
    and (select result from verdict) = 'removed'
  returning user_id
),
recorded as (
  insert into bestie.team_changes (actor_id, target_id, target_email, action)
  select $1::uuid, g.user_id, $3::text, 'remove' from gone g
)
select result from verdict`

export const TEAM_CHANGES_SQL = `select c.actor_id, a.email as actor_email, p.display_name as actor_name, c.target_email, c.action, c.created_at
from bestie.team_changes c
left join auth.users a on a.id = c.actor_id
left join public.profiles p on p.user_id = c.actor_id
order by c.created_at desc, c.id desc
limit 20`

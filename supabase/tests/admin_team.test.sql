-- Admin piece 2 (Members + Team), twin tests. Each part is its own begin ... rollback block that
-- seeds its own rows, so later tasks can append their own blocks to this file.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Part 1: grants, the user_roles lock and the append-only Team record.
begin;
select pg_temp.check(not has_table_privilege('authenticated','public.user_roles','insert'), 'authenticated cannot insert user_roles');
select pg_temp.check(not has_table_privilege('authenticated','public.user_roles','update'), 'authenticated cannot update user_roles');
select pg_temp.check(not has_table_privilege('authenticated','public.user_roles','delete'), 'authenticated cannot delete user_roles');
select pg_temp.check(not has_table_privilege('anon','public.user_roles','insert'), 'anon cannot insert user_roles');
select pg_temp.check(not has_table_privilege('anon','public.user_roles','update'), 'anon cannot update user_roles');
select pg_temp.check(not has_table_privilege('anon','public.user_roles','delete'), 'anon cannot delete user_roles');
select pg_temp.check(has_table_privilege('authenticated','public.user_roles','select'), 'authenticated can still select user_roles');

select pg_temp.check(has_table_privilege('service_role','bestie.team_changes','insert'), 'service_role can insert team_changes');
select pg_temp.check(has_table_privilege('service_role','bestie.team_changes','select'), 'service_role can select team_changes');
select pg_temp.check(not has_table_privilege('authenticated','bestie.team_changes','select'), 'authenticated cannot select team_changes');
select pg_temp.check(not has_table_privilege('authenticated','bestie.team_changes','insert'), 'authenticated cannot insert team_changes');
select pg_temp.check(not has_table_privilege('anon','bestie.team_changes','select'), 'anon cannot select team_changes');

-- The sign-up trigger (handle_new_user, security definer) still writes the 'user' role.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000b0001', 'signup@example.test');
select pg_temp.check((select count(*) from public.user_roles
  where user_id = '00000000-0000-0000-0000-0000000b0001' and role = 'user') = 1, 'sign-up still creates the user role');

set local role service_role;
insert into bestie.team_changes (actor_id, target_id, target_email, action)
  values ('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-0000000b0002', 'target@example.test', 'add');
select pg_temp.check((select count(*) from bestie.team_changes where target_email = 'target@example.test') = 1, 'service_role can insert and read a team change');

-- service_role has no update or delete privilege at all (grants are select, insert only).
select pg_temp.check(not has_table_privilege('service_role','bestie.team_changes','update'), 'service_role cannot update team_changes');
select pg_temp.check(not has_table_privilege('service_role','bestie.team_changes','delete'), 'service_role cannot delete team_changes');
reset role;

-- The trigger is the backstop for any role that does hold the privilege (here the table owner).
do $$ begin
  begin
    update bestie.team_changes set action = 'remove';
    raise exception 'update was allowed';
  exception when others then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;
  begin
    delete from bestie.team_changes;
    raise exception 'delete was allowed';
  exception when others then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;
  raise notice 'ok - team_changes refuses update and delete';
end $$;
rollback;

-- Part 2: the Members list and detail queries (MEMBERS_LIST_SQL and MEMBER_DETAIL_SQL in
-- supabase/functions/admin/membersQuery.ts). The statements are embedded unchanged;
-- supabase/functions/admin/membersQuery.test.ts keeps them identical to the TypeScript strings.
begin;
-- Clear Members other parts left behind; it all rolls back.
delete from bestie.members;

-- Dates are relative to the Dubai date. d(n) = noon Dubai time, n Dubai days ago.
create or replace function pg_temp.d(n int) returns timestamptz language sql stable as $$
  select (((now() at time zone 'Asia/Dubai')::date - n)::timestamp + interval '12 hours') at time zone 'Asia/Dubai'
$$;

-- c1 Sara, c2 a Member whose display name is her email, c3 no profile name and nothing else,
-- c4 an auth user who is not a Member.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000c0001', 'sara@example.test'),
  ('00000000-0000-0000-0000-0000000c0002', 'noor@example.test'),
  ('00000000-0000-0000-0000-0000000c0003', 'empty@example.test'),
  ('00000000-0000-0000-0000-0000000c0004', 'visitor@example.test');
update public.profiles set display_name = 'Sara Ali' where user_id = '00000000-0000-0000-0000-0000000c0001';
update public.profiles set display_name = 'noor@example.test' where user_id = '00000000-0000-0000-0000-0000000c0002';
delete from public.profiles where user_id = '00000000-0000-0000-0000-0000000c0003';
update auth.users set email_confirmed_at = pg_temp.d(9), last_sign_in_at = pg_temp.d(1),
  banned_until = now() + interval '1 day',
  raw_app_meta_data = '{"provider":"email","providers":["email","google"]}'::jsonb
  where id = '00000000-0000-0000-0000-0000000c0001';
update auth.users set banned_until = now() - interval '1 day', raw_app_meta_data = '{}'::jsonb
  where id = '00000000-0000-0000-0000-0000000c0002';

insert into bestie.members (id, home_area, instagram_handle, adult_confirmed_at, created_at) values
  ('00000000-0000-0000-0000-0000000c0001', 'Jumeirah', 'sara.ali', now(), pg_temp.d(10)),
  ('00000000-0000-0000-0000-0000000c0002', null, null, null, pg_temp.d(5)),
  ('00000000-0000-0000-0000-0000000c0003', null, null, null, pg_temp.d(1));

-- Sara: 2 check-ins, 3 Completions on 3 Suggestions (two live, one of them flagged, and an undone one),
-- points, recorded levels, consents and a membership.
insert into bestie.catalogue_items (id, title, pillars, kind) values
  ('00000000-0000-0000-0000-0000000c00c1', 'Kite Beach walk', '{move}', 'activity');
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, created_at) values
  ('00000000-0000-0000-0000-0000000c00e1', '00000000-0000-0000-0000-0000000c0001', 'steady', 60, 0, pg_temp.d(3)),
  ('00000000-0000-0000-0000-0000000c00e2', '00000000-0000-0000-0000-0000000c0001', 'low', 30, 0, pg_temp.d(2));
insert into bestie.day_plans (id, member_id, check_in_id, plan_date) values
  ('00000000-0000-0000-0000-0000000c00d1', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00e1', current_date);
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, engine_version) values
  ('00000000-0000-0000-0000-0000000c00f1', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00d1', '00000000-0000-0000-0000-0000000c00e1', '00000000-0000-0000-0000-0000000c00c1', 'move', 'v1'),
  ('00000000-0000-0000-0000-0000000c00f2', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00d1', '00000000-0000-0000-0000-0000000c00e1', '00000000-0000-0000-0000-0000000c00c1', 'meal', 'v1'),
  ('00000000-0000-0000-0000-0000000c00f3', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00d1', '00000000-0000-0000-0000-0000000c00e1', '00000000-0000-0000-0000-0000000c00c1', 'mindset', 'v1');
-- Two live Completions on the same Dubai day (one day) plus an undone one on another day.
insert into bestie.completions (id, member_id, suggestion_id, proof_kind, flagged, completed_at, undone_at) values
  ('00000000-0000-0000-0000-0000000c00a1', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00f1', 'tick', false, pg_temp.d(2), null),
  ('00000000-0000-0000-0000-0000000c00a2', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00f2', 'tick', true, pg_temp.d(2) + interval '1 hour', null),
  ('00000000-0000-0000-0000-0000000c00a3', '00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-0000000c00f3', 'tick', false, pg_temp.d(4), now());
insert into bestie.points (member_id, pillar, amount, reason, completion_id) values
  ('00000000-0000-0000-0000-0000000c0001', 'move', 10, 'completion', '00000000-0000-0000-0000-0000000c00a1'),
  ('00000000-0000-0000-0000-0000000c0001', 'move', 5, 'completion', '00000000-0000-0000-0000-0000000c00a3'),
  ('00000000-0000-0000-0000-0000000c0001', 'meal', 7, 'completion', '00000000-0000-0000-0000-0000000c00a2');
insert into bestie.member_levels (member_id, kind, pillar, level, reached_at) values
  ('00000000-0000-0000-0000-0000000c0001', 'level', 'move', 2, pg_temp.d(2));
insert into bestie.member_levels (member_id, kind, status_shape, status_tier, reached_at) values
  ('00000000-0000-0000-0000-0000000c0001', 'status', 'move+meal', 'rising', pg_temp.d(1));
-- Two marketing rows: the later one (granted false) wins. terms has one row.
insert into bestie.consents (member_id, purpose, version, granted, recorded_at) values
  ('00000000-0000-0000-0000-0000000c0001', 'marketing', 'v1', true, pg_temp.d(8)),
  ('00000000-0000-0000-0000-0000000c0001', 'marketing', 'v2', false, pg_temp.d(3)),
  ('00000000-0000-0000-0000-0000000c0001', 'terms', 'v1', true, pg_temp.d(9));
insert into bestie.memberships (member_id, status) values ('00000000-0000-0000-0000-0000000c0001', 'trialing');

-- The list.
prepare ml(text) as
select m.id, u.email, p.display_name, m.created_at as joined, u.last_sign_in_at
from bestie.members m
join auth.users u on u.id = m.id
left join public.profiles p on p.user_id = m.id
where $1::text = ''
  or lower(u.email) like '%' || replace(replace(replace($1::text, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
  or lower(p.display_name) like '%' || replace(replace(replace($1::text, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
order by m.created_at desc, m.id
limit 50;

create temp table l_all as execute ml('');
select pg_temp.check((select count(*) from l_all) = 3, 'the empty search lists the 3 Members');
select pg_temp.check((select array_agg(id order by ord) from (select id, row_number() over () as ord from l_all) x)
  = array['00000000-0000-0000-0000-0000000c0003', '00000000-0000-0000-0000-0000000c0002', '00000000-0000-0000-0000-0000000c0001']::uuid[],
  'the list is newest first');
select pg_temp.check((select count(*) from l_all where id = '00000000-0000-0000-0000-0000000c0004') = 0,
  'an auth user with no Member row is not listed');
select pg_temp.check((select display_name from l_all where id = '00000000-0000-0000-0000-0000000c0001') = 'Sara Ali', 'the list carries the display name');
select pg_temp.check((select display_name from l_all where id = '00000000-0000-0000-0000-0000000c0003') is null, 'a Member with no profile has a null display name');
select pg_temp.check((select last_sign_in_at from l_all where id = '00000000-0000-0000-0000-0000000c0001') is not null, 'the list carries last_sign_in_at');

create temp table l_sara as execute ml('sara');
select pg_temp.check((select count(*) from l_sara) = 1 and (select id from l_sara) = '00000000-0000-0000-0000-0000000c0001', 'sara finds Sara');
create temp table l_sar as execute ml('sar');
select pg_temp.check((select count(*) from l_sar) = 1, 'the lower-cased SAR finds Sara');
create temp table l_email as execute ml('empty@');
select pg_temp.check((select id from l_email) = '00000000-0000-0000-0000-0000000c0003', 'a search matches the email');
create temp table l_pct as execute ml('%');
select pg_temp.check((select count(*) from l_pct) = 0, 'a percent sign matches literally, so nothing');
create temp table l_us as execute ml('_');
select pg_temp.check((select count(*) from l_us) = 0, 'an underscore matches literally, so nothing');
create temp table l_bs as execute ml('\');
select pg_temp.check((select count(*) from l_bs) = 0, 'a backslash matches literally, so nothing');

-- The detail.
prepare md(uuid) as
select u.email,
  p.display_name,
  m.created_at as joined,
  u.email_confirmed_at is not null as email_confirmed,
  u.last_sign_in_at,
  coalesce(u.banned_until > now(), false) as banned,
  array(select jsonb_array_elements_text(
    case when jsonb_typeof(u.raw_app_meta_data -> 'providers') = 'array' then u.raw_app_meta_data -> 'providers' else '[]'::jsonb end
  )) as providers,
  m.home_area,
  m.instagram_handle,
  m.adult_confirmed_at is not null as adult_confirmed,
  coalesce((
    select jsonb_object_agg(c.purpose, c.granted)
    from (
      select distinct on (purpose) purpose, granted
      from bestie.consents
      where member_id = m.id
      order by purpose, recorded_at desc, id
    ) c
  ), '{}'::jsonb) as consents,
  (select count(*)::int from bestie.check_ins where member_id = m.id) as check_ins,
  (select max(created_at) from bestie.check_ins where member_id = m.id) as last_check_in,
  (select count(*)::int from bestie.completions where member_id = m.id and undone_at is null) as completions,
  (select count(*)::int from bestie.completions where member_id = m.id and undone_at is null and flagged) as flagged,
  array(
    select distinct to_char(completed_at at time zone 'Asia/Dubai', 'YYYY-MM-DD')
    from bestie.completions
    where member_id = m.id and undone_at is null
    order by 1
  ) as completion_days,
  coalesce((
    select jsonb_object_agg(s.pillar, s.total)
    from (
      select pillar::text as pillar, sum(amount)::int as total
      from bestie.points
      where member_id = m.id
      group by pillar
    ) s
  ), '{}'::jsonb) as sums,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', l.kind, 'pillar', l.pillar, 'level', l.level,
      'shape', l.status_shape, 'tier', l.status_tier, 'reachedAt', l.reached_at
    ) order by l.reached_at, l.id)
    from bestie.member_levels l
    where l.member_id = m.id
  ), '[]'::jsonb) as recorded,
  (select status::text from bestie.memberships where member_id = m.id) as membership_status
from bestie.members m
join auth.users u on u.id = m.id
left join public.profiles p on p.user_id = m.id
where m.id = $1::uuid;

create temp table d_sara as execute md('00000000-0000-0000-0000-0000000c0001');
select pg_temp.check((select count(*) from d_sara) = 1, 'the detail returns one row');
select pg_temp.check((select email from d_sara) = 'sara@example.test' and (select display_name from d_sara) = 'Sara Ali', 'detail: email and name');
select pg_temp.check((select email_confirmed from d_sara) and (select banned from d_sara), 'detail: confirmed and banned');
select pg_temp.check((select providers from d_sara) = array['email', 'google'], 'detail: providers');
select pg_temp.check((select home_area from d_sara) = 'Jumeirah' and (select instagram_handle from d_sara) = 'sara.ali' and (select adult_confirmed from d_sara), 'detail: profile');
select pg_temp.check((select consents from d_sara) = '{"marketing": false, "terms": true}'::jsonb, 'detail: the later marketing consent wins');
select pg_temp.check((select check_ins from d_sara) = 2 and (select last_check_in from d_sara) = pg_temp.d(2), 'detail: check-ins and the latest');
select pg_temp.check((select completions from d_sara) = 2, 'detail: the undone Completion is not counted');
select pg_temp.check((select flagged from d_sara) = 1, 'detail: one flagged');
select pg_temp.check((select completion_days from d_sara) = array[to_char((now() at time zone 'Asia/Dubai')::date - 2, 'YYYY-MM-DD')],
  'detail: live Completions on one Dubai day give one day; the undone one adds none');
select pg_temp.check((select sums from d_sara) = '{"move": 15, "meal": 7}'::jsonb, 'detail: points summed per pillar');
select pg_temp.check(jsonb_array_length((select recorded from d_sara)) = 2
  and (select recorded -> 0 ->> 'kind' from d_sara) = 'level' and (select (recorded -> 0 ->> 'level')::int from d_sara) = 2
  and (select recorded -> 1 ->> 'shape' from d_sara) = 'move+meal' and (select recorded -> 1 ->> 'tier' from d_sara) = 'rising'
  and (select recorded -> 1 ->> 'reachedAt' from d_sara) is not null, 'detail: recorded levels');
select pg_temp.check((select membership_status from d_sara) = 'trialing', 'detail: membership status');

create temp table d_noor as execute md('00000000-0000-0000-0000-0000000c0002');
select pg_temp.check(not (select banned from d_noor) and not (select email_confirmed from d_noor), 'detail: an expired ban is not banned');
select pg_temp.check((select providers from d_noor) = '{}'::text[], 'detail: no providers gives an empty array');

create temp table d_empty as execute md('00000000-0000-0000-0000-0000000c0003');
select pg_temp.check((select check_ins from d_empty) = 0 and (select completions from d_empty) = 0 and (select flagged from d_empty) = 0, 'empty Member: no activity');
select pg_temp.check((select last_check_in from d_empty) is null, 'empty Member: no last check-in');
select pg_temp.check((select consents from d_empty) = '{}'::jsonb, 'empty Member: consents are {}');
select pg_temp.check((select membership_status from d_empty) is null, 'empty Member: no membership');
select pg_temp.check((select display_name from d_empty) is null, 'empty Member: no display name');
select pg_temp.check((select completion_days from d_empty) = '{}'::text[] and (select sums from d_empty) = '{}'::jsonb and (select recorded from d_empty) = '[]'::jsonb, 'empty Member: empty progress');

create temp table d_none as execute md('00000000-0000-0000-0000-0000000c0004');
select pg_temp.check((select count(*) from d_none) = 0, 'an auth user who is not a Member has no detail');
create temp table d_unknown as execute md('00000000-0000-0000-0000-0000000cffff');
select pg_temp.check((select count(*) from d_unknown) = 0, 'an unknown uuid returns no row');
rollback;

-- Part 3: the Team statements (TEAM_LIST_SQL, TEAM_GRANT_SQL, TEAM_REMOVE_SQL and TEAM_CHANGES_SQL in
-- supabase/functions/admin/teamQuery.ts). The statements are embedded unchanged;
-- supabase/functions/admin/teamQuery.test.ts keeps them identical to the TypeScript strings.
-- Grant and remove run after `set local role service_role`, as on live; the reads run as the
-- connection user.
begin;
-- Start from no admins; it all rolls back.
delete from public.user_roles where role = 'admin';

-- d1 Ada (the only admin to begin with), d2 Bea, d3 Cy (an expired admin row), d4 Dee (never an admin).
insert into auth.users (id, email, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000d0001', 'ada@example.test', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000d0002', 'bea@example.test', null),
  ('00000000-0000-0000-0000-0000000d0003', 'cy@example.test', null),
  ('00000000-0000-0000-0000-0000000d0004', 'dee@example.test', null);
update public.profiles set display_name = 'Ada Lovelace' where user_id = '00000000-0000-0000-0000-0000000d0001';
insert into public.user_roles (user_id, role, created_at) values
  ('00000000-0000-0000-0000-0000000d0001', 'admin', now() - interval '2 days');
insert into public.user_roles (user_id, role, expires_at, created_at) values
  ('00000000-0000-0000-0000-0000000d0003', 'admin', now() - interval '1 day', now() - interval '3 days');

prepare tl as
select r.user_id, u.email, p.display_name, r.created_at as since, u.last_sign_in_at
from public.user_roles r
join auth.users u on u.id = r.user_id
left join public.profiles p on p.user_id = r.user_id
where r.role = 'admin' and (r.expires_at is null or r.expires_at > now())
order by r.created_at, r.user_id;

prepare tg(uuid, uuid, text) as
with granted as (
  insert into public.user_roles (user_id, role, expires_at)
  values ($2::uuid, 'admin', null)
  on conflict (user_id, role) do update set expires_at = null
  returning user_id
)
insert into bestie.team_changes (actor_id, target_id, target_email, action)
select $1::uuid, g.user_id, $3::text, 'add' from granted g;

prepare tr(uuid, uuid, text) as
with live as (
  select user_id from public.user_roles
  where role = 'admin' and (expires_at is null or expires_at > now())
  for update
),
verdict as (
  select case
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
select result from verdict;

prepare tc as
select c.actor_id, a.email as actor_email, p.display_name as actor_name, c.target_email, c.action, c.created_at
from bestie.team_changes c
left join auth.users a on a.id = c.actor_id
left join public.profiles p on p.user_id = c.actor_id
order by c.created_at desc, c.id desc
limit 20;

-- The only admin can't be removed (Cy's expired row doesn't count), and nothing is written.
set local role service_role;
execute tr('00000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-0000000d0001', 'ada@example.test') \gset r1_
reset role;
select pg_temp.check(:'r1_result' = 'last', 'removing the only live admin answers last');
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0001' and role = 'admin') = 1,
  'the only admin is still an admin');
select pg_temp.check((select count(*) from bestie.team_changes where action = 'remove') = 0, 'a refused remove records nothing');

-- An expired admin and a never-admin are notAdmin.
set local role service_role;
execute tr('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0003', 'cy@example.test') \gset r2_
execute tr('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0004', 'dee@example.test') \gset r3_
reset role;
select pg_temp.check(:'r2_result' = 'notAdmin', 'removing an expired admin answers notAdmin');
select pg_temp.check(:'r3_result' = 'notAdmin', 'removing a non-admin answers notAdmin');
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0003' and role = 'admin') = 1,
  'notAdmin deletes nothing');

-- Granting Bea twice: one admin row, two add records.
set local role service_role;
execute tg('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0002', 'bea@example.test');
execute tg('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0002', 'bea@example.test');
reset role;
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0002' and role = 'admin' and expires_at is null) = 1,
  'granting twice leaves one live admin row');
select pg_temp.check((select count(*) from bestie.team_changes
  where target_id = '00000000-0000-0000-0000-0000000d0002' and action = 'add'
    and actor_id = '00000000-0000-0000-0000-0000000d0001' and target_email = 'bea@example.test') = 2,
  'granting twice records two adds');
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0002' and role = 'user') = 1,
  'granting leaves the user role alone');

-- Granting Cy clears her expiry.
set local role service_role;
execute tg('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0003', 'cy@example.test');
reset role;
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0003' and role = 'admin') = 1
  and (select expires_at from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0003' and role = 'admin') is null,
  'granting an expired admin makes her live again, in the same row');

-- The list: Cy, Ada, Bea by since (Cy's row keeps its old created_at).
create temp table t_list as execute tl;
select pg_temp.check((select array_agg(user_id order by ord) from (select user_id, row_number() over () as ord from t_list) x)
  = array['00000000-0000-0000-0000-0000000d0003', '00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0002']::uuid[],
  'the list is the live admins, oldest first');
select pg_temp.check((select email from t_list where user_id = '00000000-0000-0000-0000-0000000d0001') = 'ada@example.test'
  and (select display_name from t_list where user_id = '00000000-0000-0000-0000-0000000d0001') = 'Ada Lovelace'
  and (select last_sign_in_at from t_list where user_id = '00000000-0000-0000-0000-0000000d0001') is not null
  and (select since from t_list where user_id = '00000000-0000-0000-0000-0000000d0001') = now() - interval '2 days',
  'the list carries email, name, since and last sign-in');

-- With more than one admin, removing Bea works and records one remove; removing her again is notAdmin.
set local role service_role;
execute tr('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0002', 'bea@example.test') \gset r4_
execute tr('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0002', 'bea@example.test') \gset r5_
reset role;
select pg_temp.check(:'r4_result' = 'removed', 'removing one of several admins answers removed');
select pg_temp.check(:'r5_result' = 'notAdmin', 'removing her again answers notAdmin');
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0002' and role = 'admin') = 0,
  'her admin row is gone');
select pg_temp.check((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-0000000d0002' and role = 'user') = 1,
  'her user role and account stay');
select pg_temp.check((select count(*) from bestie.team_changes where action = 'remove') = 1
  and (select count(*) from bestie.team_changes where action = 'remove' and target_id = '00000000-0000-0000-0000-0000000d0002'
    and actor_id = '00000000-0000-0000-0000-0000000d0001' and target_email = 'bea@example.test') = 1,
  'one remove is recorded');

-- Down to two (Ada, Cy): removing Cy works, then Ada is the last one.
set local role service_role;
execute tr('00000000-0000-0000-0000-0000000d0001', '00000000-0000-0000-0000-0000000d0003', 'cy@example.test') \gset r6_
execute tr('00000000-0000-0000-0000-0000000d0003', '00000000-0000-0000-0000-0000000d0001', 'ada@example.test') \gset r7_
reset role;
select pg_temp.check(:'r6_result' = 'removed' and :'r7_result' = 'last', 'with two admins one can go, then the last stays');
select pg_temp.check((select count(*) from public.user_roles where role = 'admin' and (expires_at is null or expires_at > now())) = 1,
  'one live admin is left');

-- Changes: 21 more, all after the ones above; the last 20 come back newest first. One is by an actor
-- whose account is gone, so only the recorded target email shows.
insert into bestie.team_changes (actor_id, target_id, target_email, action, created_at)
select case when n = 21 then '00000000-0000-0000-0000-0000000dffff'::uuid else '00000000-0000-0000-0000-0000000d0001'::uuid end,
  '00000000-0000-0000-0000-0000000d0004', 'seed' || n || '@example.test', case when n % 2 = 0 then 'add' else 'remove' end,
  now() + n * interval '1 minute'
from generate_series(1, 21) n;
create temp table t_changes as execute tc;
select pg_temp.check((select count(*) from t_changes) = 20, 'changes are capped at 20');
select pg_temp.check((select array_agg(target_email order by ord) from (select target_email, row_number() over () as ord from t_changes) x)
  = (select array_agg('seed' || n || '@example.test' order by n desc) from generate_series(2, 21) n),
  'changes are newest first');
select pg_temp.check((select actor_email from t_changes where target_email = 'seed21@example.test') is null
  and (select actor_name from t_changes where target_email = 'seed21@example.test') is null,
  'a deleted actor still lists, with no email or name');
select pg_temp.check((select actor_email from t_changes where target_email = 'seed20@example.test') = 'ada@example.test'
  and (select actor_name from t_changes where target_email = 'seed20@example.test') = 'Ada Lovelace'
  and (select action from t_changes where target_email = 'seed20@example.test') = 'add'
  and (select actor_id from t_changes where target_email = 'seed20@example.test') = '00000000-0000-0000-0000-0000000d0001',
  'a change carries the actor email, name and action');
rollback;

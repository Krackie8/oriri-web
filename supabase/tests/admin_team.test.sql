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

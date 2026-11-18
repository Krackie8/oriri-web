-- #69 Join: the exact statements the edge function's Postgres store runs
-- (supabase/functions/server/index.tsx, postgresJoinStore), run as it runs them.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000001f', 'j@example.test');

-- 1. As service_role: the Member and her six consents go in together.
begin;
set local role service_role;
insert into bestie.members (id, city, home_area, instagram_handle, adult_confirmed_at)
values ('00000000-0000-0000-0000-00000000001f', 'dubai', 'Dubai Marina', null, '2026-11-16T08:00:00.000Z')
on conflict (id) do nothing returning id;
insert into bestie.consents (member_id, purpose, version, granted, recorded_at)
select '00000000-0000-0000-0000-00000000001f', p, '2026-11-16', p in ('terms', 'marketing'), '2026-11-16T08:00:00.000Z'
from unnest(array['terms','location','wellness_signals','personalisation','push','marketing']) p;
commit;
select pg_temp.check((select count(*) from bestie.consents where member_id = '00000000-0000-0000-0000-00000000001f') = 6,
  'service_role records the Member and six consents');

-- 2. Joining again inserts nothing.
begin;
set local role service_role;
create temp table again on commit drop as
  with i as (insert into bestie.members (id, city, home_area, instagram_handle, adult_confirmed_at)
             values ('00000000-0000-0000-0000-00000000001f', 'dubai', 'Deira', null, now())
             on conflict (id) do nothing returning id)
  select count(*) n from i;
select pg_temp.check((select n from again) = 0, 'a second join returns no row and leaves her home area');
commit;
select pg_temp.check((select home_area from bestie.members where id = '00000000-0000-0000-0000-00000000001f') = 'Dubai Marina',
  'her first home area stands');

-- 3. getMember as service_role reads her row.
begin;
set local role service_role;
select pg_temp.check((select adult_confirmed_at::text from bestie.members where id = '00000000-0000-0000-0000-00000000001f') is not null,
  'service_role reads her Member row');
rollback;

-- 4. The browser's role can't write either table, even for herself.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000001f', true);
select pg_temp.check(not has_table_privilege('bestie.members', 'insert'), 'authenticated cannot insert members');
select pg_temp.check(not has_table_privilege('bestie.consents', 'insert'), 'authenticated cannot insert consents');
rollback;

-- 5. An unknown consent purpose is refused by the table itself.
do $$ begin
  set local role service_role;
  insert into bestie.consents (member_id, purpose, version, granted)
  values ('00000000-0000-0000-0000-00000000001f', 'sell_my_data', '2026-11-16', true);
  raise exception 'not ok - unknown purpose accepted';
exception when check_violation then raise notice 'ok - unknown consent purpose refused';
end $$;

\echo JOIN STORE TESTS PASSED

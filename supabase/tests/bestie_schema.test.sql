-- Behaviour tests for ticket #68, run against the local twin after the migrations.
-- Run: bash supabase/twin/run.sh   (any failure raises and stops with a non-zero exit)
\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok - %', what;
end $$;

create or replace function pg_temp.raises(stmt text, what text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then raise notice 'ok - % (%)', what, sqlerrm; return; end;
  raise exception 'FAIL: % (statement succeeded: %)', what, stmt;
end $$;

set client_min_messages = notice;

-- 1. The bestie schema exists with every v1 table, and RLS is on for each one.
select pg_temp.check(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'bestie' and c.relkind = 'r'
      and c.relname in ('members','consents','catalogue_items','partners','check_ins','day_plans',
                        'suggestions','completions','points','member_levels','memberships','daily_lines')
      and c.relrowsecurity and c.relforcerowsecurity) = 12,
  'bestie has all 12 v1 tables, each with RLS enabled and forced');

select pg_temp.check(
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'bestie' and c.relkind = 'r' and not c.relrowsecurity),
  'no bestie table without RLS');

-- 2. anon has no way in at all.
select pg_temp.check(not has_schema_privilege('anon', 'bestie', 'usage'), 'anon cannot use the bestie schema');

-- Fixtures: two Members and one catalogue item, written as the owner.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'Jumeirah', now()),
  ('00000000-0000-0000-0000-00000000000b', 'Marina', now());
insert into bestie.catalogue_items (id, title, pillars, kind, cost_aed, duration_min)
  values ('00000000-0000-0000-0000-0000000000c1', 'Kite Beach walk', '{move}', 'activity', 0, 30);
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, area)
  values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', 'steady', 60, 50, 'Jumeirah'),
         ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000b', 'low', 30, 0, 'Marina');
insert into bestie.day_plans (id, member_id, check_in_id, plan_date)
  values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', current_date),
         ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000e2', current_date);
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, engine_version)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'move', 'v1'),
         ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'move', 'v1');
insert into bestie.points (member_id, pillar, amount, reason)
  values ('00000000-0000-0000-0000-00000000000a', 'move', 10, 'completion'),
         ('00000000-0000-0000-0000-00000000000b', 'move', 10, 'completion');

-- 3. Only one active Day plan per Member per day.
select pg_temp.raises(
  $q$insert into bestie.day_plans (member_id, check_in_id, plan_date)
     values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', current_date)$q$,
  'a second active Day plan for the same Member and day is refused');
update bestie.day_plans set status = 'replaced' where id = '00000000-0000-0000-0000-0000000000d1';
insert into bestie.day_plans (id, member_id, check_in_id, plan_date)
  values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', current_date);
select pg_temp.check(true, 'a new active plan is allowed once the old one is replaced');

-- 4. The points ledger is append-only, even for the owner and the edge function.
select pg_temp.raises($q$update bestie.points set amount = 999$q$, 'points rows cannot be updated');
select pg_temp.raises($q$delete from bestie.points$q$, 'points rows cannot be deleted');

-- 5. As Member A (authenticated), she reaches only her own rows.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select pg_temp.check((select count(*) from bestie.members) = 1, 'A sees only her own member row');
select pg_temp.check((select count(*) from bestie.check_ins) = 1, 'A sees only her own check-ins');
select pg_temp.check((select count(*) from bestie.day_plans) = 2, 'A sees only her own day plans');
select pg_temp.check((select count(*) from bestie.suggestions) = 1, 'A sees only her own suggestions');
select pg_temp.check((select count(*) from bestie.points) = 1, 'A sees only her own points');
select pg_temp.check((select count(*) from bestie.catalogue_items where slug is null) = 1, 'A can read the catalogue');
select pg_temp.raises(
  $q$insert into bestie.check_ins (member_id, energy, time_min, budget_aed) values ('00000000-0000-0000-0000-00000000000b', 'high', 60, 0)$q$,
  'A cannot write a check-in as B');
select pg_temp.raises(
  $q$insert into bestie.points (member_id, pillar, amount, reason) values ('00000000-0000-0000-0000-00000000000a', 'move', 100, 'self')$q$,
  'A cannot award herself points');
select pg_temp.raises(
  $q$insert into bestie.catalogue_items (title, pillars, kind) values ('x', '{move}', 'activity')$q$,
  'A cannot edit the catalogue');
rollback;

-- 6. Anonymous callers are refused outright.
begin;
set local role anon;
select pg_temp.raises($q$select * from bestie.members$q$, 'anon cannot read members');
rollback;

select pg_temp.raises($q$truncate bestie.points$q$, 'points cannot be truncated');
do $$ begin
  begin truncate bestie.points; exception when others then
    if sqlerrm not like '%append-only%' then raise exception 'FAIL: truncate refused for the wrong reason: %', sqlerrm; end if;
  end;
end $$;

-- 4b. A completion can be undone and the Suggestion completed again.
insert into bestie.completions (id, member_id, suggestion_id, proof_kind, undone_at)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000f2', 'tick', now());
insert into bestie.completions (id, member_id, suggestion_id, proof_kind)
  values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000f2', 'tick');
select pg_temp.check(true, 'a Suggestion can be completed again after an undo');
select pg_temp.raises(
  $q$insert into bestie.completions (member_id, suggestion_id, proof_kind) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000f2', 'tick')$q$,
  'only one live completion per Suggestion');
insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-00000000000b', 'move', 10, 'completion', '00000000-0000-0000-0000-0000000000a2');

-- 7. Deleting an account removes her personal rows and anonymises the learning log
--    (B now has a completion with points tied to it).
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check(not exists (select 1 from bestie.members where id = '00000000-0000-0000-0000-00000000000b'), 'deleted Member row is gone');
select pg_temp.check(not exists (select 1 from bestie.points where member_id = '00000000-0000-0000-0000-00000000000b'), 'deleted Member points are gone');
select pg_temp.check(not exists (select 1 from bestie.completions where member_id = '00000000-0000-0000-0000-00000000000b'), 'deleted Member completions are gone');
select pg_temp.check(exists (select 1 from bestie.suggestions where id = '00000000-0000-0000-0000-0000000000f2' and member_id is null), 'her suggestion survives, anonymised');
select pg_temp.check(exists (select 1 from bestie.check_ins where id = '00000000-0000-0000-0000-0000000000e2' and member_id is null), 'her check-in survives, anonymised');

-- 8. The 9 legacy tables and their now-orphaned types are gone; kv, profiles and user_roles stay.
select pg_temp.check(
  not exists (select 1 from pg_tables where schemaname = 'public' and tablename in
    ('episodes','live_sessions','community_posts','store_items','episode_interactions','post_interactions','orders','order_items','tips')),
  'the 9 legacy tables are dropped');
select pg_temp.check(
  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('kv_store_a278ea32','profiles','user_roles')) = 3,
  'kv_store, profiles and user_roles are kept');
select pg_temp.check(
  not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public'
               and t.typname in ('currency','episode_status','live_session_status','order_status')),
  'enum types used only by the legacy tables are dropped');

-- 9. handle_new_user and has_role cannot be called by anon or authenticated.
select pg_temp.check(not has_function_privilege('anon', 'public.handle_new_user()', 'execute'), 'anon cannot execute handle_new_user');
select pg_temp.check(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'authenticated cannot execute handle_new_user');
select pg_temp.check(not has_function_privilege('anon', 'public.has_role(uuid, public.app_role)', 'execute'), 'anon cannot execute has_role');
select pg_temp.check(not has_function_privilege('authenticated', 'public.has_role(uuid, public.app_role)', 'execute'), 'authenticated cannot execute has_role');

-- 10. Sign-up still works: the auth trigger still creates the profile and role.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'c@example.test');
select pg_temp.check(exists (select 1 from public.profiles where user_id = '00000000-0000-0000-0000-00000000000c'), 'sign-up still creates a profile');
select pg_temp.check(exists (select 1 from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000c'), 'sign-up still creates a user role');

-- 11. A signed-in Member can still read her own role without hitting has_role.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true);
select pg_temp.check((select count(*) from public.user_roles) = 1, 'authenticated reads her own user_roles row without error');
rollback;

\echo ALL TESTS PASSED

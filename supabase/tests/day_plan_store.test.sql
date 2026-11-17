-- #70 Check-in -> Day plan: the exact statements the edge function's Postgres store runs
-- (supabase/functions/server/index.tsx, postgresBestieStore), run as it runs them.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'p@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1', 'Dubai Marina', now());

-- 0. The seed: every Pillar has a light fallback, and slugs are unique.
select pg_temp.check((select count(*) from bestie.catalogue_items where slug is not null) = 29, 'the seed has 29 Catalogue items');
select pg_temp.check((select count(distinct p) from bestie.catalogue_items, unnest(pillars) p where is_light and is_fallback and cost_aed = 0) = 4,
  'every Pillar has a free light fallback');

-- 1. catalogue(city), as service_role.
begin;
set local role service_role;
create temp table cat on commit drop as
  select id, coalesce(slug, id::text) as slug, title, pillars::text[] as pillars, kind, cost_aed::float8 as cost_aed,
         duration_min, energy_fit::text[] as energy_fit, goals::text[] as goals, is_outdoor, is_light, is_fallback
  from bestie.catalogue_items where city = 'dubai' and retired_at is null order by slug;
select pg_temp.check((select count(*) from cat) = (select count(*) from bestie.catalogue_items where retired_at is null) and (select count(*) from cat) >= 29, 'service_role reads the live Catalogue');
select pg_temp.check((select pillars from cat where slug = 'runclub') = array['move','meet_up'], 'the run club counts for Move and Meet up');
select pg_temp.check((select cost_aed from cat where slug = 'reformer') = 200, 'cost comes back as a number');
commit;

-- 2. recordPlan, as service_role, twice on the same Dubai date: the second replaces the first.
create or replace function pg_temp.record_plan(energy text, mins int, budget numeric, goal text, at timestamptz, slugs text[]) returns uuid language plpgsql as $$
declare ci uuid; dp uuid;
begin
  -- the statements, in the order the store runs them in one transaction
  perform 1 from bestie.members where id = '00000000-0000-0000-0000-0000000000a1' for update;
  with old as (
    update bestie.day_plans set status = 'replaced', replaced_at = at
    where member_id = '00000000-0000-0000-0000-0000000000a1' and plan_date = '2026-11-16' and status = 'active'
    returning id)
  update bestie.suggestions set outcome = 'replaced', outcome_at = at
  where day_plan_id in (select id from old) and outcome in ('shown', 'accepted');
  insert into bestie.check_ins (member_id, energy, time_min, budget_aed, goal, city, area, created_at)
  values ('00000000-0000-0000-0000-0000000000a1', energy::bestie.energy, mins, budget, goal::bestie.goal, 'dubai', 'Dubai Marina', at)
  returning id into ci;
  insert into bestie.day_plans (member_id, check_in_id, plan_date, created_at)
  values ('00000000-0000-0000-0000-0000000000a1', ci, '2026-11-16', at) returning id into dp;
  insert into bestie.suggestions (member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, is_light, reason, engine_version, created_at)
  select member_id, day_plan_id, check_in_id, catalogue_item_id, pillar::bestie.pillar, is_light, reason, engine_version, created_at
  from jsonb_to_recordset((
    -- the JSON array the store sends, one object per Suggestion
    select jsonb_agg(jsonb_build_object('member_id', '00000000-0000-0000-0000-0000000000a1', 'day_plan_id', dp, 'check_in_id', ci,
      'catalogue_item_id', c.id, 'pillar', c.pillars[1], 'is_light', c.is_light, 'reason', 'because',
      'engine_version', 'bestie-1', 'created_at', at))
    from bestie.catalogue_items c where c.slug = any(slugs)))
    as s(member_id uuid, day_plan_id uuid, check_in_id uuid, catalogue_item_id uuid, pillar text, is_light boolean,
         reason text, engine_version text, created_at timestamptz);
  return dp;
end $$;

begin;
set local role service_role;
create temp table p1 on commit drop as select pg_temp.record_plan('steady', 120, 250, 'connect', '2026-11-16T05:00:00Z', array['runclub','brunch','podcast']) as id;
create temp table p1keep as select id from p1;
commit;
select pg_temp.check((select count(*) from bestie.suggestions where day_plan_id = (select id from p1keep) and outcome = 'shown') = 3,
  'the first plan records three Suggestions as shown');
select pg_temp.check((select c.goal::text from bestie.check_ins c join bestie.day_plans d on d.check_in_id = c.id
  where d.id = (select id from p1keep)) = 'connect', 'a Check-in with a Goal records it');
select pg_temp.check((select bool_and(engine_version = 'bestie-1') from bestie.suggestions where day_plan_id = (select id from p1keep)), 'each carries the engine version');

begin;
set local role service_role;
create temp table p2 on commit drop as select pg_temp.record_plan('low', 30, 0, null, '2026-11-16T06:00:00Z', array['walk','fridge','journal','reachout']) as id;
create temp table p2keep as select id from p2;
commit;
select pg_temp.check((select status from bestie.day_plans where id = (select id from p1keep)) = 'replaced', 'checking in again replaces the first plan');
select pg_temp.check((select bool_and(outcome = 'replaced' and outcome_at is not null) from bestie.suggestions where day_plan_id = (select id from p1keep)),
  'its Suggestions are marked replaced');
select pg_temp.check((select count(*) from bestie.suggestions where day_plan_id = (select id from p2keep) and outcome = 'shown') = 4,
  'the new plan records four Suggestions as shown');

-- 3. activePlan(member, date), as service_role: the plan, its Check-in, its Suggestions in Pillar order.
begin;
set local role service_role;
select pg_temp.check((select count(*) from bestie.day_plans
  where member_id = '00000000-0000-0000-0000-0000000000a1' and plan_date = '2026-11-16' and status = 'active') = 1,
  'exactly one active plan for the day');
select pg_temp.check((select array_agg(pillar::text order by pillar, created_at, id) from bestie.suggestions
  where day_plan_id = (select id from p2keep)) = array['move','meal','mindset','meet_up'], 'Suggestions come back in Pillar order');
select pg_temp.check((select budget_aed::float8 from bestie.check_ins c join bestie.day_plans d on d.check_in_id = c.id
  where d.id = (select id from p2keep)) = 0, 'the Check-in comes back with its budget');
rollback;

-- 4. A second active plan for the same day is refused by the table itself.
do $$ begin
  set local role service_role;
  insert into bestie.day_plans (member_id, check_in_id, plan_date)
  select member_id, check_in_id, plan_date from bestie.day_plans where status = 'active' limit 1;
  raise exception 'not ok - two active plans accepted';
exception when unique_violation then raise notice 'ok - two active plans for one day refused';
end $$;

-- 5. The browser's role cannot write a plan, even her own.
begin;
set local role authenticated;
select pg_temp.check(not has_table_privilege('bestie.check_ins', 'insert'), 'authenticated cannot insert check_ins');
select pg_temp.check(not has_table_privilege('bestie.suggestions', 'insert'), 'authenticated cannot insert suggestions');
select pg_temp.check(not has_table_privilege('bestie.catalogue_items', 'insert'), 'authenticated cannot insert catalogue items');
rollback;

\echo DAY PLAN STORE TESTS PASSED

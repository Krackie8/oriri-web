-- #73 Levels, Status and the spider chart: the ledger's bounds and the exact statements the edge
-- function's Postgres store runs for points (supabase/functions/server/index.tsx, postgresBestieStore).
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

-- Fixtures, every FK column filled in: one Member, a plan with two Suggestions, two Completions.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000007a1', 'p@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values ('00000000-0000-0000-0000-0000000007a1', 'Jumeirah', now());
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, area)
  values ('00000000-0000-0000-0000-0000000007c1', '00000000-0000-0000-0000-0000000007a1', 'steady', 120, 200, 'Jumeirah');
insert into bestie.day_plans (id, member_id, check_in_id, plan_date)
  values ('00000000-0000-0000-0000-0000000007d1', '00000000-0000-0000-0000-0000000007a1', '00000000-0000-0000-0000-0000000007c1', current_date);
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, outcome, engine_version)
select v.id::uuid, '00000000-0000-0000-0000-0000000007a1', '00000000-0000-0000-0000-0000000007d1', '00000000-0000-0000-0000-0000000007c1',
       c.id, c.pillars[1], 'completed', 'bestie-2'
from (values ('00000000-0000-0000-0000-0000000007e1', 'walk'), ('00000000-0000-0000-0000-0000000007e2', 'fridge')) v(id, slug)
join bestie.catalogue_items c on c.slug = v.slug;
insert into bestie.completions (id, member_id, suggestion_id, proof_kind) values
  ('00000000-0000-0000-0000-0000000007f1', '00000000-0000-0000-0000-0000000007a1', '00000000-0000-0000-0000-0000000007e1', 'tick'),
  ('00000000-0000-0000-0000-0000000007f2', '00000000-0000-0000-0000-0000000007a1', '00000000-0000-0000-0000-0000000007e2', 'tick');

-- 1. The checks bound every row a sum can read.
set role service_role;
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', 10, 'self', '00000000-0000-0000-0000-0000000007f1')$q$, 'an unknown reason is refused');
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', 0, 'completion', '00000000-0000-0000-0000-0000000007f1')$q$, 'a zero amount is refused');
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', 16, 'completion', '00000000-0000-0000-0000-0000000007f1')$q$, 'more than 15 is refused');
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', -10, 'completion', '00000000-0000-0000-0000-0000000007f1')$q$, 'a negative award is refused');
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', 10, 'undo', '00000000-0000-0000-0000-0000000007f1')$q$, 'a positive reversal is refused');
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', 10, 'completion')$q$, 'a row without a Completion is refused');

-- 2. recordCompletion's insert: one row per Pillar, at most once per (Completion, Pillar).
insert into bestie.points (member_id, pillar, amount, reason, completion_id, created_at)
select '00000000-0000-0000-0000-0000000007a1', p.pillar::bestie.pillar, p.amount, 'completion', '00000000-0000-0000-0000-0000000007f1', '2026-11-21T06:00:00Z'
from jsonb_to_recordset('[{"pillar":"move","amount":10}]'::jsonb) as p(pillar text, amount int);
insert into bestie.points (member_id, pillar, amount, reason, completion_id, created_at)
select '00000000-0000-0000-0000-0000000007a1', p.pillar::bestie.pillar, p.amount, 'completion', '00000000-0000-0000-0000-0000000007f2', '2026-11-21T06:00:00Z'
from jsonb_to_recordset('[{"pillar":"meal","amount":5}]'::jsonb) as p(pillar text, amount int);
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  values ('00000000-0000-0000-0000-0000000007a1', 'move', 10, 'completion', '00000000-0000-0000-0000-0000000007f1')$q$, 'a second award for the same Completion and Pillar is refused');

-- 3. undoCompletion's reversal: mirrors the award, exactly once.
insert into bestie.points (member_id, pillar, amount, reason, completion_id, created_at)
select member_id, pillar, -amount, 'undo', completion_id, '2026-11-21T08:00:00Z' from bestie.points
where completion_id = '00000000-0000-0000-0000-0000000007f1' and member_id = '00000000-0000-0000-0000-0000000007a1' and reason = 'completion';
select pg_temp.check((select sum(amount) from bestie.points where completion_id = '00000000-0000-0000-0000-0000000007f1') = 0, 'an undo nets the Completion to zero');
select pg_temp.check((select count(*) from bestie.points where completion_id = '00000000-0000-0000-0000-0000000007f1') = 2, 'and keeps both rows');
select pg_temp.raises($q$insert into bestie.points (member_id, pillar, amount, reason, completion_id)
  select member_id, pillar, -amount, 'undo', completion_id from bestie.points
  where completion_id = '00000000-0000-0000-0000-0000000007f1' and reason = 'completion'$q$, 'a second reversal is refused');

-- 4. progressRows: per-Pillar sums net of undos, all rows (null) or those before a time.
create or replace function pg_temp.sums(before text) returns jsonb language sql as $$
  select coalesce(jsonb_object_agg(pillar, total), '{}') from (
    select pillar::text as pillar, sum(amount)::int as total from bestie.points
    where member_id = '00000000-0000-0000-0000-0000000007a1' and (before::timestamptz is null or created_at < before::timestamptz)
    group by pillar) s $$;
select pg_temp.check(pg_temp.sums(null) = '{"move":0,"meal":5}'::jsonb, 'per-Pillar sums read the ledger net of undos');
-- The awards are stamped 06:00Z and the reversal 08:00Z. A cut-off between them reads the awards alone.
select pg_temp.check(pg_temp.sums('2026-11-21T07:00:00Z') = '{"move":10,"meal":5}'::jsonb, 'a cut-off reads only rows before it');
select pg_temp.check(pg_temp.sums('2000-01-01T00:00:00Z') = '{}'::jsonb, 'nothing before the cut-off reads as no rows');

-- settleProgress's writes, as the store runs them.
insert into bestie.member_levels (member_id, kind, pillar, level, reached_at)
select '00000000-0000-0000-0000-0000000007a1', 'level', l.pillar::bestie.pillar, l.level, '2026-11-21T08:00:00Z'
from jsonb_to_recordset('[{"pillar":"move","level":2},{"pillar":"move","level":3}]'::jsonb) as l(pillar text, level smallint);
insert into bestie.member_levels (member_id, kind, status_shape, status_tier, reached_at)
  values ('00000000-0000-0000-0000-0000000007a1', 'status', 'move', 'rising', '2026-11-21T08:00:00Z');
create temp table lv on commit preserve rows as
  select id::text as id, kind, pillar::text as pillar, level, status_shape as shape, status_tier as tier,
         to_json(reached_at) #>> '{}' as "reachedAt"
  from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1' and (null::timestamptz is null or reached_at < null::timestamptz);
select pg_temp.check((select count(*) from lv) = 3, 'progressRows reads her member_levels rows');
select pg_temp.check((select "reachedAt"::timestamptz = '2026-11-21T08:00:00Z' from lv limit 1), 'reachedAt comes back as a parseable ISO time');
delete from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1'
  and id::text = any(array(select id from lv where kind = 'status' or level = 3));
select pg_temp.check((select count(*) from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1') = 1, 'retracted rows are deleted, the rest kept');
delete from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1';

-- 5. member_levels stores keys, never display names; today's rows can be retracted.
insert into bestie.member_levels (member_id, kind, pillar, level, reached_at)
  values ('00000000-0000-0000-0000-0000000007a1', 'level', 'meal', 2, now());
insert into bestie.member_levels (member_id, kind, status_shape, status_tier, reached_at)
  values ('00000000-0000-0000-0000-0000000007a1', 'status', 'meal+meet_up', 'glowing', now()),
         ('00000000-0000-0000-0000-0000000007a1', 'status', 'balanced', 'rising', now());
select pg_temp.raises($q$insert into bestie.member_levels (member_id, kind, status_shape, status_tier)
  values ('00000000-0000-0000-0000-0000000007a1', 'status', 'Clean Eater', 'Glowing')$q$, 'a display name is refused as a Status');
select pg_temp.raises($q$insert into bestie.member_levels (member_id, kind, status_shape, status_tier)
  values ('00000000-0000-0000-0000-0000000007a1', 'status', 'meal', 'legendary')$q$, 'an unknown tier is refused');
delete from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1' and id = any(
  select id from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1' and kind = 'status' and status_tier = 'rising');
select pg_temp.check((select count(*) from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1') = 2, 'a provisional row can be retracted');
reset role;

-- 6. An authenticated Member reads her own points and levels but cannot write them.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000007a1', true);
select pg_temp.check((select count(*) from bestie.points) = 3, 'she reads her own points');
select pg_temp.check(not has_table_privilege('bestie.member_levels', 'insert'), 'she cannot insert member_levels');
select pg_temp.check(not has_table_privilege('bestie.points', 'insert'), 'she cannot insert points');
rollback;

-- 7. Account deletion, every FK filled in, still cascades cleanly.
delete from auth.users where id = '00000000-0000-0000-0000-0000000007a1';
select pg_temp.check(not exists (select 1 from bestie.points where member_id = '00000000-0000-0000-0000-0000000007a1'), 'her points go with her account');
select pg_temp.check(not exists (select 1 from bestie.member_levels where member_id = '00000000-0000-0000-0000-0000000007a1'), 'her Levels go with her account');
\echo POINTS AND LEVELS TESTS PASSED

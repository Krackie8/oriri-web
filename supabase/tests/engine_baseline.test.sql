-- Day plan foundation, Task 4: the bestie-3 baseline query (supabase/queries/engine_baseline.sql).
-- The twin pipes this file through stdin, so the query's exact statement is embedded below;
-- supabase/functions/server/engineBaseline.test.ts checks it is identical to the query file.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

begin;
-- Fixture engine versions are unique, so Suggestions other test files leave behind do not count; it all rolls back.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@example.test'),
  ('0b931b9c-0000-0000-0000-000000000001', 'tester@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'Dubai Marina', now()),
  ('00000000-0000-0000-0000-0000000000b2', 'Deira', now()),
  ('0b931b9c-0000-0000-0000-000000000001', 'Dubai Marina', now());
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, city, area, created_at) values
  ('00000000-0000-0000-0000-00000000b101', '00000000-0000-0000-0000-0000000000b1', 'low', 60, 0, 'dubai', 'Dubai Marina', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000b102', '00000000-0000-0000-0000-0000000000b2', 'low', 60, 0, 'dubai', 'Deira', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000b103', '0b931b9c-0000-0000-0000-000000000001', 'low', 60, 0, 'dubai', 'Dubai Marina', '2026-11-20T05:00:00Z');
insert into bestie.day_plans (id, member_id, check_in_id, plan_date, status, created_at) values
  ('00000000-0000-0000-0000-00000000bd01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000b101', '2026-11-20', 'active', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000bd02', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000b102', '2026-11-20', 'active', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000bd03', '0b931b9c-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000b103', '2026-11-20', 'active', '2026-11-20T05:00:00Z');

-- bestie-3x stands for bestie-3: completed, swapped, skipped and shown count (4 Suggestions, 2 Members).
-- Left out: replaced, not_picked, the test Member, a Suggestion with no Member. bestie-2 is its own row.
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, pillar, outcome, engine_version)
select v.id::uuid, v.member::uuid, v.plan::uuid, v.checkin::uuid, (enum_range(null::bestie.pillar))[1], v.outcome::bestie.suggestion_outcome, v.engine
from (values
  ('00000000-0000-0000-0000-00000000be01', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000bd01', '00000000-0000-0000-0000-00000000b101', 'completed', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be02', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000bd01', '00000000-0000-0000-0000-00000000b101', 'swapped', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be03', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000bd01', '00000000-0000-0000-0000-00000000b101', 'skipped', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be04', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000bd02', '00000000-0000-0000-0000-00000000b102', 'shown', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be05', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000bd02', '00000000-0000-0000-0000-00000000b102', 'replaced', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be06', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000bd02', '00000000-0000-0000-0000-00000000b102', 'not_picked', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be07', '0b931b9c-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000bd03', '00000000-0000-0000-0000-00000000b103', 'completed', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be08', null, '00000000-0000-0000-0000-00000000bd02', '00000000-0000-0000-0000-00000000b102', 'completed', 'bestie-3x'),
  ('00000000-0000-0000-0000-00000000be09', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000bd02', '00000000-0000-0000-0000-00000000b102', 'completed', 'bestie-2x')
) as v(id, member, plan, checkin, outcome, engine);

create temp table b as
select engine_version,
  count(*)::int as suggestions,
  round(count(*) filter (where outcome = 'completed')::numeric / count(*), 3) as completion_rate,
  round(count(*) filter (where outcome = 'swapped')::numeric / count(*), 3) as swap_rate,
  round(count(*) filter (where outcome = 'skipped')::numeric / count(*), 3) as skip_rate,
  count(distinct member_id)::int as members
from bestie.suggestions
where member_id is not null
  and member_id::text not like '0b931b9c%'
  and outcome not in ('replaced', 'not_picked')
group by engine_version
order by engine_version;

select pg_temp.check((select suggestions = 4 from b where engine_version = 'bestie-3x'), 'bestie-3 counts 4 Suggestions (not replaced, not_picked, the test Member or no Member)');
select pg_temp.check((select completion_rate = 0.25 from b where engine_version = 'bestie-3x'), 'bestie-3 completion_rate is 0.25');
select pg_temp.check((select swap_rate = 0.25 from b where engine_version = 'bestie-3x'), 'bestie-3 swap_rate is 0.25');
select pg_temp.check((select skip_rate = 0.25 from b where engine_version = 'bestie-3x'), 'bestie-3 skip_rate is 0.25');
select pg_temp.check((select members = 2 from b where engine_version = 'bestie-3x'), 'bestie-3 has 2 Members');
select pg_temp.check((select suggestions = 1 and completion_rate = 1.000 from b where engine_version = 'bestie-2x'), 'bestie-2 is its own row');
rollback;

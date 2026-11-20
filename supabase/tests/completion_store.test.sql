-- #72 Completing with Proof: the migration, and the exact statements the edge function's Postgres
-- store runs (supabase/functions/server/index.tsx, postgresBestieStore), run as it runs them.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'c@example.test'), ('00000000-0000-0000-0000-0000000000c2', 'd@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000c1', 'Dubai Marina', now()), ('00000000-0000-0000-0000-0000000000c2', 'Deira', now());

-- Setup: one active plan (Check-in 09:00 Dubai) with walk, fridge and journal shown, and a replaced plan with stretch.
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, city, area, created_at) values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-0000000000c1', 'low', 60, 0, 'dubai', 'Dubai Marina', '2026-11-20T05:00:00Z');
insert into bestie.day_plans (id, member_id, check_in_id, plan_date, status, created_at) values
  ('00000000-0000-0000-0000-00000000d101', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c101', '2026-11-20', 'replaced', '2026-11-20T04:00:00Z'),
  ('00000000-0000-0000-0000-00000000d102', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c101', '2026-11-20', 'active', '2026-11-20T05:00:00Z');
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, outcome, engine_version, created_at)
select v.id::uuid, '00000000-0000-0000-0000-0000000000c1', v.plan::uuid, '00000000-0000-0000-0000-00000000c101', c.id, c.pillars[1], v.outcome::bestie.suggestion_outcome, 'bestie-2', v.at::timestamptz
from (values
  ('00000000-0000-0000-0000-00000000e101', '00000000-0000-0000-0000-00000000d102', 'walk', 'shown', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000e102', '00000000-0000-0000-0000-00000000d102', 'fridge', 'shown', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000e103', '00000000-0000-0000-0000-00000000d102', 'journal', 'shown', '2026-11-20T05:00:00Z'),
  ('00000000-0000-0000-0000-00000000e104', '00000000-0000-0000-0000-00000000d101', 'stretch', 'completed', '2026-11-20T04:00:00Z')
) as v(id, plan, slug, outcome, at) join bestie.catalogue_items c on c.slug = v.slug;
insert into bestie.completions (id, member_id, suggestion_id, proof_kind, completed_at) values
  ('00000000-0000-0000-0000-00000000f104', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000e104', 'tick', '2026-11-20T04:30:00Z');

-- 0. The migration: a private, JPEG-only, 5 MB bucket that only service_role can reach.
select pg_temp.check((select not public and file_size_limit = 5242880 and allowed_mime_types = array['image/jpeg']
  from storage.buckets where id = 'bestie-photos'), 'the bestie-photos bucket is private, JPEG only, 5 MB');
select pg_temp.check(not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and (qual ilike '%bestie-photos%' or with_check ilike '%bestie-photos%' or qual is null or with_check is null)),
  'no storage policy opens bestie-photos (none names it, none is unconditional)');
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
do $$ begin
  insert into storage.objects (bucket_id, name) values ('bestie-photos', '00000000-0000-0000-0000-0000000000c1/x.jpg');
  raise exception 'authenticated wrote to bestie-photos';
exception when insufficient_privilege then raise notice 'ok - authenticated cannot write to bestie-photos';
end $$;
select pg_temp.check(not has_table_privilege('bestie.completions', 'insert'), 'authenticated cannot insert completions');
select pg_temp.check(not has_table_privilege('bestie.completions', 'update'), 'authenticated cannot update completions');
commit;

-- 1. suggestionToComplete
begin;
set local role service_role;
create temp table t1 on commit drop as
  select s.id, s.catalogue_item_id, s.pillar::text, s.is_light, s.is_new_for_you, s.reason, s.outcome::text, s.engine_version,
         s.replaces_id, to_json(s.created_at) #>> '{}' as created_at, d.plan_date::text, d.status = 'active' as plan_active
  from bestie.suggestions s join bestie.day_plans d on d.id = s.day_plan_id
  where s.id = '00000000-0000-0000-0000-00000000e101' and s.member_id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.check((select plan_active and plan_date = '2026-11-20' and outcome = 'shown' from t1), 'reads her Suggestion with its plan');
select pg_temp.check((select created_at::timestamptz = '2026-11-20T05:00:00Z' from t1), 'created_at comes back as a parseable ISO time');
select pg_temp.check((select count(*) from bestie.suggestions s join bestie.day_plans d on d.id = s.day_plan_id
  where s.id = '00000000-0000-0000-0000-00000000e101' and s.member_id = '00000000-0000-0000-0000-0000000000c2') = 0, 'not another Member''s');
commit;

-- 2. recordCompletion, as the store runs it in one transaction.
create or replace function pg_temp.record_completion(sid uuid, kind text, reflection text, flag_new boolean, flag_ids text[], at timestamptz) returns uuid
language plpgsql as $$
declare s uuid; c uuid;
begin
  perform 1 from bestie.members where id = '00000000-0000-0000-0000-0000000000c1' for update;
  update bestie.suggestions set outcome = 'completed', outcome_at = at
  where id = sid and member_id = '00000000-0000-0000-0000-0000000000c1' and outcome in ('shown', 'accepted')
  returning id into s;
  if s is null then return null; end if;
  if cardinality(flag_ids) > 0 then
    update bestie.completions set flagged = true, flag_reason = 'too_fast'
    where member_id = '00000000-0000-0000-0000-0000000000c1' and undone_at is null and id::text = any(flag_ids);
  end if;
  insert into bestie.completions (member_id, suggestion_id, proof_kind, reflection, flagged, flag_reason, completed_at)
  values ('00000000-0000-0000-0000-0000000000c1', sid, kind, reflection, flag_new, case when flag_new then 'too_fast' end, at)
  returning id into c;
  return c;
end $$;

begin;
set local role service_role;
create temp table walk_done on commit drop as select pg_temp.record_completion('00000000-0000-0000-0000-00000000e101', 'tick', null, false, '{}', '2026-11-20T05:30:00Z') as id;
select pg_temp.check((select id from walk_done) is not null, 'records the Completion');
select pg_temp.check((select outcome::text from bestie.suggestions where id = '00000000-0000-0000-0000-00000000e101') = 'completed', 'and marks the Suggestion completed');
select pg_temp.check(pg_temp.record_completion('00000000-0000-0000-0000-00000000e101', 'tick', null, false, '{}', '2026-11-20T05:31:00Z') is null,
  'a Suggestion already completed cannot be completed again');
select pg_temp.check(pg_temp.record_completion('00000000-0000-0000-0000-00000000e102', 'tick', null, true,
  array[(select id::text from walk_done)], '2026-11-20T05:32:00Z') is not null, 'records a flagged Completion');
select pg_temp.check((select count(*) from bestie.completions where flagged and flag_reason = 'too_fast') = 2, 'the burst it joins is flagged too');
commit;

do $$ begin
  insert into bestie.completions (member_id, suggestion_id, proof_kind, completed_at)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000e101', 'tick', now());
  raise exception 'a second live Completion was accepted';
exception when unique_violation then raise notice 'ok - one live Completion per Suggestion';
end $$;
do $$ begin
  perform pg_temp.record_completion('00000000-0000-0000-0000-00000000e103', 'reflection', '', false, '{}', '2026-11-20T05:40:00Z');
  raise exception 'a blank Reflection was accepted';
exception when check_violation then raise notice 'ok - a blank Reflection is refused';
end $$;
do $$ begin
  perform pg_temp.record_completion('00000000-0000-0000-0000-00000000e103', 'reflection', repeat('x', 281), false, '{}', '2026-11-20T05:40:00Z');
  raise exception 'a 281-character Reflection was accepted';
exception when check_violation then raise notice 'ok - a Reflection over 280 characters is refused';
end $$;
select pg_temp.check(pg_temp.record_completion('00000000-0000-0000-0000-00000000e103', 'reflection', repeat('x', 280), false, '{}', '2026-11-20T05:40:00Z') is not null,
  'a 280-character Reflection is kept');

-- 3. liveCompletionsBetween, completion and journal share one select.
create temp table today as
  select c.id, c.member_id, c.suggestion_id, s.catalogue_item_id, to_json(s.created_at) #>> '{}' as shown_at, c.proof_kind,
         c.reflection, c.photo_path, c.flagged, c.flag_reason, to_json(c.completed_at) #>> '{}' as completed_at,
         to_json(c.undone_at) #>> '{}' as undone_at
  from bestie.completions c join bestie.suggestions s on s.id = c.suggestion_id
  where c.member_id = '00000000-0000-0000-0000-0000000000c1' and c.undone_at is null
    and c.completed_at >= '2026-11-19T20:00:00.000Z' and c.completed_at < '2026-11-20T20:00:00.000Z'
  order by c.completed_at desc;
grant select on today to service_role;
select pg_temp.check((select count(*) from today) = 4, 'her live Completions today, across both plans');
select pg_temp.check((select shown_at::timestamptz from today where suggestion_id = '00000000-0000-0000-0000-00000000e104') = '2026-11-20T04:00:00Z',
  'each carries when its Suggestion was shown');

-- 4. The plan view: live Completions of this plan's Suggestions.
select pg_temp.check((select count(*) from bestie.completions c join bestie.suggestions s on s.id = c.suggestion_id
  where s.day_plan_id = '00000000-0000-0000-0000-00000000d102' and c.undone_at is null) = 3, 'the active plan shows its three Completions');

-- 5. undoCompletion, as the store runs it: back to shown on the active plan, to replaced on a replaced one.
create or replace function pg_temp.undo(cid uuid, at timestamptz) returns boolean language plpgsql as $$
declare sid uuid;
begin
  perform 1 from bestie.members where id = '00000000-0000-0000-0000-0000000000c1' for update;
  update bestie.completions set undone_at = at
  where id = cid and member_id = '00000000-0000-0000-0000-0000000000c1' and undone_at is null
  returning suggestion_id into sid;
  if sid is null then return false; end if;
  update bestie.suggestions s
  set outcome = case when d.status = 'active' then 'shown' else 'replaced' end::bestie.suggestion_outcome, outcome_at = at
  from bestie.day_plans d
  where s.id = sid and d.id = s.day_plan_id and s.outcome = 'completed';
  return true;
end $$;
begin;
set local role service_role;
select pg_temp.check(pg_temp.undo((select id from today where suggestion_id = '00000000-0000-0000-0000-00000000e101'), '2026-11-20T06:00:00Z'), 'an undo succeeds');
select pg_temp.check((select outcome::text from bestie.suggestions where id = '00000000-0000-0000-0000-00000000e101') = 'shown', 'and reopens the Suggestion');
select pg_temp.check((select undone_at is not null and flagged from bestie.completions where suggestion_id = '00000000-0000-0000-0000-00000000e101'),
  'the undone row stays as history, flag and all');
select pg_temp.check(not pg_temp.undo((select id from today where suggestion_id = '00000000-0000-0000-0000-00000000e101'), '2026-11-20T06:01:00Z'), 'an undone one cannot be undone again');
select pg_temp.check(pg_temp.undo('00000000-0000-0000-0000-00000000f104', '2026-11-20T06:02:00Z'), 'an undo on a replaced plan succeeds');
select pg_temp.check((select outcome::text from bestie.suggestions where id = '00000000-0000-0000-0000-00000000e104') = 'replaced', 'and sends it back to replaced');
select pg_temp.check(pg_temp.record_completion('00000000-0000-0000-0000-00000000e101', 'tick', null, false, '{}', '2026-11-20T06:05:00Z') is not null,
  'after an undo she can complete it again');
commit;

-- 6. setPhoto: only her own live Completion.
create or replace function pg_temp.set_photo(member uuid, cid uuid, path text) returns int language plpgsql as $$
declare n int;
begin
  update bestie.completions set photo_path = path
  where id = cid and member_id = member and undone_at is null;
  get diagnostics n = row_count;
  return n;
end $$;
begin;
set local role service_role;
select pg_temp.check(pg_temp.set_photo('00000000-0000-0000-0000-0000000000c1', (select id from today where suggestion_id = '00000000-0000-0000-0000-00000000e102'),
  '00000000-0000-0000-0000-0000000000c1/p.jpg') = 1, 'sets the photo on her live Completion');
select pg_temp.check(pg_temp.set_photo('00000000-0000-0000-0000-0000000000c2', (select id from today where suggestion_id = '00000000-0000-0000-0000-00000000e102'),
  'x.jpg') = 0, 'not on another Member''s');
commit;

-- 7. RLS: a Member reads only her own Completions.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select pg_temp.check((select count(*) from bestie.completions) = 0, 'another Member sees none of her Completions');
commit;

\echo 'COMPLETION STORE TESTS PASSED'

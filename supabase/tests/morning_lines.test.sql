-- #74 Morning with Bestie, Wrap-up and Streak: the daily line checks, member_lines, and the exact
-- statements the edge function's Postgres store runs (supabase/functions/server/index.tsx,
-- postgresBestieStore: completionDays, dailyLines, recentLines, recordLine, morningSignals).
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

-- Fixtures: two Members, one plan with two Suggestions, three Completions (one undone).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000008a1', 'm@example.test'),
  ('00000000-0000-0000-0000-0000000008a2', 'n@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at, created_at) values
  ('00000000-0000-0000-0000-0000000008a1', 'Jumeirah', now(), '2026-11-20T21:00:00Z'),
  ('00000000-0000-0000-0000-0000000008a2', 'Deira', now(), now());
insert into bestie.consents (member_id, purpose, version, granted, recorded_at) values
  ('00000000-0000-0000-0000-0000000008a1', 'personalisation', 'v1', true, '2026-11-20T21:00:00Z'),
  ('00000000-0000-0000-0000-0000000008a1', 'personalisation', 'v1', false, '2026-11-22T09:00:00Z'),
  ('00000000-0000-0000-0000-0000000008a2', 'personalisation', 'v1', true, now());
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, goal, area, created_at) values
  ('00000000-0000-0000-0000-0000000008c1', '00000000-0000-0000-0000-0000000008a1', 'steady', 120, 200, null, 'Jumeirah', '2026-11-23T04:00:00Z'),
  ('00000000-0000-0000-0000-0000000008c2', '00000000-0000-0000-0000-0000000008a1', 'low', 60, 0, 'unwind', 'Jumeirah', '2026-11-24T04:00:00Z');
insert into bestie.day_plans (id, member_id, check_in_id, plan_date)
  values ('00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000008c2', '2026-11-24');
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, outcome, engine_version)
select v.id::uuid, '00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000008d1', '00000000-0000-0000-0000-0000000008c2',
       c.id, c.pillars[1], 'completed', 'bestie-3'
from (values ('00000000-0000-0000-0000-0000000008e1', 'walk'), ('00000000-0000-0000-0000-0000000008e2', 'fridge'),
             ('00000000-0000-0000-0000-0000000008e3', 'reachout')) v(id, slug)
join bestie.catalogue_items c on c.slug = v.slug;
insert into bestie.completions (id, member_id, suggestion_id, proof_kind, completed_at, undone_at) values
  -- 23:59:59 in Dubai on the 24th, and 00:00:00 on the 25th.
  ('00000000-0000-0000-0000-0000000008f1', '00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000008e1', 'tick', '2026-11-24T19:59:59Z', null),
  ('00000000-0000-0000-0000-0000000008f2', '00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000008e2', 'tick', '2026-11-24T20:00:00Z', null),
  -- Undone on the 27th: never counts.
  ('00000000-0000-0000-0000-0000000008f3', '00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-0000000008e3', 'reach_out', '2026-11-27T08:00:00Z', '2026-11-27T08:05:00Z');

-- 1. The line checks accept a full row, then refuse what breaks them. The seed is in, signed Ren (2026-11-22).
set role service_role;
select pg_temp.check((select count(*) >= 60 and bool_and(author = 'ren') from bestie.daily_lines), 'the seed bank is in: 60 or more lines, all approved by Ren');
insert into bestie.daily_lines (id, body, author, goal, pillar, energy, moment, show_on) values
  ('00000000-0000-0000-0000-000000000801', 'Small and steady still counts.', 'bestie', null, null, null, 'any', null),
  ('00000000-0000-0000-0000-000000000802', 'Three days in a row. Look at you.', 'ren', 'glow', 'move', 'high', 'streak', null),
  ('00000000-0000-0000-0000-000000000803', 'A dated line.', 'bestie', null, null, null, 'any', '2026-12-25'),
  ('00000000-0000-0000-0000-000000000804', 'A retired line.', 'bestie', null, null, null, 'any', null);
update bestie.daily_lines set is_active = false where id = '00000000-0000-0000-0000-000000000804';
select pg_temp.check((select count(*) from bestie.daily_lines where id::text like '00000000-0000-0000-0000-00000000080%') = 4, 'a full, valid line is accepted');
select pg_temp.raises($q$insert into bestie.daily_lines (body, author) values ('x', 'amanda')$q$, 'an unknown author is refused');
select pg_temp.raises($q$insert into bestie.daily_lines (body, moment) values ('x', 'monday')$q$, 'an unknown moment is refused');
select pg_temp.raises($q$insert into bestie.daily_lines (body) values (repeat('a', 91))$q$, 'a line over 90 characters is refused');
select pg_temp.raises($q$insert into bestie.daily_lines (body) values ('   ')$q$, 'a blank line is refused');
select pg_temp.raises($q$insert into bestie.daily_lines (body) values ('Small and steady still counts.')$q$, 'the same line twice is refused');
select pg_temp.check((select author = 'bestie' and moment = 'any' from bestie.daily_lines where body = 'A dated line.'), 'a new line defaults to Bestie, any moment');

-- 2. dailyLines: the active lines, dates as text.
select pg_temp.check((
  select count(*) = 3 and bool_and(id <> '00000000-0000-0000-0000-000000000804')
     and max(show_on) = '2026-12-25'
  from (select id, body, author, goal::text as goal, pillar::text as pillar, energy::text as energy, moment,
               to_char(show_on, 'YYYY-MM-DD') as show_on
        from bestie.daily_lines where is_active and id::text like '00000000-0000-0000-0000-00000000080%') l), 'dailyLines reads the active lines with their tags');

-- 3. recordLine: one line per Member per Dubai day, and the first one stored wins a race.
insert into bestie.member_lines (member_id, line_id, shown_on)
  values ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-000000000801', '2026-11-25'::date)
  on conflict (member_id, shown_on) do nothing;
insert into bestie.member_lines (member_id, line_id, shown_on)
  values ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-000000000802', '2026-11-25'::date)
  on conflict (member_id, shown_on) do nothing;
select pg_temp.check((select line_id from bestie.member_lines where member_id = '00000000-0000-0000-0000-0000000008a1' and shown_on = '2026-11-25'::date)
  = '00000000-0000-0000-0000-000000000801', 'a second record the same day keeps the first line');
select pg_temp.raises($q$insert into bestie.member_lines (member_id, line_id, shown_on)
  values ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-000000000802', '2026-11-25')$q$, 'two lines for one Member on one day are refused');
insert into bestie.member_lines (member_id, line_id, shown_on)
  values ('00000000-0000-0000-0000-0000000008a1', '00000000-0000-0000-0000-000000000802', '2026-11-10'::date),
         ('00000000-0000-0000-0000-0000000008a2', '00000000-0000-0000-0000-000000000802', '2026-11-25'::date);

-- 4. recentLines: hers, from a date on.
select pg_temp.check((
  select array_agg(line_id::text || '@' || shown_on order by shown_on) = array['00000000-0000-0000-0000-000000000801@2026-11-25']
  from (select line_id, to_char(shown_on, 'YYYY-MM-DD') as shown_on from bestie.member_lines
        where member_id = '00000000-0000-0000-0000-0000000008a1' and shown_on >= '2026-11-11'::date) r), 'recentLines reads only her lines from the date on');

-- 5. completionDays: live Completions by Dubai day; 19:59:59Z is still the 24th.
select pg_temp.check((
  select array_agg(day order by day) = array['2026-11-24', '2026-11-25']
  from (select distinct to_char(completed_at at time zone 'Asia/Dubai', 'YYYY-MM-DD') as day
        from bestie.completions where member_id = '00000000-0000-0000-0000-0000000008a1' and undone_at is null) d),
  'completionDays splits at Dubai midnight and leaves out an undone Completion');

-- 6. morningSignals: joined day in Dubai, the latest personalisation Consent, the latest Check-in.
select pg_temp.check((
  select s.joined_on = '2026-11-21' and s.personal = false and s.energy = 'low' and s.goal = 'unwind'
  from (select to_char(m.created_at at time zone 'Asia/Dubai', 'YYYY-MM-DD') as joined_on,
               coalesce((select c.granted from bestie.consents c where c.member_id = m.id and c.purpose = 'personalisation'
                         order by c.recorded_at desc limit 1), false) as personal,
               ci.energy::text as energy, ci.goal::text as goal
        from bestie.members m
        left join lateral (select energy, goal from bestie.check_ins where member_id = m.id order by created_at desc limit 1) ci on true
        where m.id = '00000000-0000-0000-0000-0000000008a1') s),
  'morningSignals: joined on the Dubai day, a withdrawn Consent wins, the latest Check-in');

-- 6b. #102 personalisation: her latest row; a yes gives the Dubai date she gave it (the store's exact select).
create or replace function pg_temp.personalisation(mid uuid) returns table (granted boolean, since text) language sql as $$
        select c.granted, to_char(c.recorded_at at time zone 'Asia/Dubai', 'YYYY-MM-DD') as since
        from bestie.consents c
        where c.member_id = mid and c.purpose = 'personalisation'
        order by c.recorded_at desc limit 1
$$;
select pg_temp.check((select granted = false from pg_temp.personalisation('00000000-0000-0000-0000-0000000008a1')),
  'personalisation: a yes then a no reads as a no');
select pg_temp.check(not exists (select 1 from pg_temp.personalisation('00000000-0000-0000-0000-0000000008ff')),
  'personalisation: no Consent row reads as nothing');
select pg_temp.check((select granted and since = to_char(now() at time zone 'Asia/Dubai', 'YYYY-MM-DD') from pg_temp.personalisation('00000000-0000-0000-0000-0000000008a2')),
  'personalisation: a yes gives today in Dubai');
begin;
insert into bestie.consents (member_id, purpose, version, granted, recorded_at) values
  ('00000000-0000-0000-0000-0000000008a1', 'personalisation', 'v1', true, '2026-11-24T22:30:00Z');
select pg_temp.check((select granted and since = '2026-11-25' from pg_temp.personalisation('00000000-0000-0000-0000-0000000008a1')),
  'personalisation: no then yes at 22:30 UTC gives the next Dubai day');
rollback;
reset role;

-- 7. A signed-in Member reads only her own member_lines, and cannot write them.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000008a1', true);
select pg_temp.check((select count(*) from bestie.member_lines) = 2, 'she reads only her own lines shown');
select pg_temp.check(not has_table_privilege('bestie.member_lines', 'insert'), 'she cannot insert member_lines');
select pg_temp.check((select count(*) from bestie.daily_lines where id::text like '00000000-0000-0000-0000-00000000080%') = 3, 'she reads the active lines only');
rollback;

-- 8. Account deletion takes her member_lines with it.
delete from auth.users where id = '00000000-0000-0000-0000-0000000008a1';
select pg_temp.check(not exists (select 1 from bestie.member_lines where member_id = '00000000-0000-0000-0000-0000000008a1'), 'her lines shown go with her account');
select pg_temp.check(exists (select 1 from bestie.member_lines where member_id = '00000000-0000-0000-0000-0000000008a2'), 'another Member''s stay');

-- 9. Ren's approval (2026-11-22): the 64 seeded lines are hers; the fixtures above stay as written.
select pg_temp.check((select count(*) from bestie.daily_lines where author = 'ren' and id::text not like '00000000-%') = 64, 'the 64 approved lines are signed Ren');
select pg_temp.check(not exists (select 1 from bestie.daily_lines where author = 'bestie' and id::text not like '00000000-%'), 'no seeded line is left unsigned');
\echo MORNING LINES TESTS PASSED

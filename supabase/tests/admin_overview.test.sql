-- Admin foundation, Task 4: the Overview query (OVERVIEW_SQL in supabase/functions/admin/overviewQuery.ts).
-- The twin pipes this file through stdin, so the exact statement is embedded below;
-- supabase/functions/admin/overviewQuery.test.ts checks it is identical to the TypeScript string.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

begin;
-- Clear Members other test files left behind; it all rolls back.
delete from bestie.members;

-- Dates are relative to the Dubai date, so this does not rot. d(n) = noon Dubai time, n Dubai days ago.
create or replace function pg_temp.d(n int) returns timestamptz language sql stable as $$
  select (((now() at time zone 'Asia/Dubai')::date - n)::timestamp + interval '12 hours') at time zone 'Asia/Dubai'
$$;
-- 21:00 UTC on Dubai day (today - n - 1) is 01:00 on Dubai day (today - n): the UTC date is a day earlier.
create or replace function pg_temp.utc_edge(n int) returns timestamptz language sql stable as $$
  select (((now() at time zone 'Asia/Dubai')::date - n)::timestamp - interval '3 hours') at time zone 'UTC'
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000a0001', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000a0002', 'b@example.test'),
  ('00000000-0000-0000-0000-0000000a0003', 'c@example.test'),
  ('00000000-0000-0000-0000-0000000a0004', 'Admin@Example.test'),
  ('00000000-0000-0000-0000-0000000a0005', 'Test@Example.test'),
  ('00000000-0000-0000-0000-0000000a0006', 'e6@example.test'),
  ('00000000-0000-0000-0000-0000000a0007', 'e7@example.test'),
  ('00000000-0000-0000-0000-0000000a0008', 'e29@example.test'),
  ('00000000-0000-0000-0000-0000000a0009', 'e30@example.test'),
  ('00000000-0000-0000-0000-0000000a000a', 'edge@example.test'),
  ('00000000-0000-0000-0000-0000000a000b', 'adminonly@example.test'); -- an admin who is not a Member
-- a 3 days, b 20, c 40; e6 6 days, e7 7, e29 29, e30 30; edge = 01:00 Dubai 6 days ago (UTC date: 7 days ago).
-- admin (by id) and test (by email) are excluded from the counts.
insert into bestie.members (id, created_at) values
  ('00000000-0000-0000-0000-0000000a0001', pg_temp.d(3)),
  ('00000000-0000-0000-0000-0000000a0002', pg_temp.d(20)),
  ('00000000-0000-0000-0000-0000000a0003', pg_temp.d(40)),
  ('00000000-0000-0000-0000-0000000a0004', now()),
  ('00000000-0000-0000-0000-0000000a0005', now()),
  ('00000000-0000-0000-0000-0000000a0006', pg_temp.d(6)),
  ('00000000-0000-0000-0000-0000000a0007', pg_temp.d(7)),
  ('00000000-0000-0000-0000-0000000a0008', pg_temp.d(29)),
  ('00000000-0000-0000-0000-0000000a0009', pg_temp.d(30)),
  ('00000000-0000-0000-0000-0000000a000a', pg_temp.utc_edge(6));
-- Active: a (twice, counts once), b, e6 (6 days) and edge (UTC date 7 days ago, Dubai 6). Not: c (10), e7 (7), the excluded.
insert into bestie.check_ins (member_id, energy, time_min, budget_aed, created_at) values
  ('00000000-0000-0000-0000-0000000a0001', 'low', 60, 0, pg_temp.d(1)),
  ('00000000-0000-0000-0000-0000000a0001', 'low', 60, 0, pg_temp.d(2)),
  ('00000000-0000-0000-0000-0000000a0002', 'low', 60, 0, pg_temp.d(5)),
  ('00000000-0000-0000-0000-0000000a0003', 'low', 60, 0, pg_temp.d(10)),
  ('00000000-0000-0000-0000-0000000a0004', 'low', 60, 0, pg_temp.d(1)),
  ('00000000-0000-0000-0000-0000000a0005', 'low', 60, 0, pg_temp.d(1)),
  ('00000000-0000-0000-0000-0000000a0006', 'low', 60, 0, pg_temp.d(6)),
  ('00000000-0000-0000-0000-0000000a0007', 'low', 60, 0, pg_temp.d(7)),
  ('00000000-0000-0000-0000-0000000a000a', 'low', 60, 0, pg_temp.utc_edge(6));

prepare q(uuid[], text[]) as
with d as (
  select (now() at time zone 'Asia/Dubai')::date as today
), counted as (
  select m.id, lower(u.email) as email, (m.created_at at time zone 'Asia/Dubai')::date as joined
  from bestie.members m
  join auth.users u on u.id = m.id
  where m.id <> all($1::uuid[])
    and lower(coalesce(u.email, '')) <> all($2::text[])
)
select
  (select count(*) from counted) as members_total,
  (select count(*) from counted, d where joined > d.today - 7) as members_week,
  (select count(*) from counted, d where joined > d.today - 30) as members_month,
  (select count(distinct c.member_id) from bestie.check_ins c join counted on counted.id = c.member_id, d
    where (c.created_at at time zone 'Asia/Dubai')::date > d.today - 7) as active_week,
  (select coalesce(array_agg(email) filter (where email is not null), '{}'::text[]) from (
    select lower(u.email) as email from bestie.members m join auth.users u on u.id = m.id
    union
    select lower(email) from auth.users where id = any($1::uuid[])
  ) everyone) as non_lead_emails;

create temp table r as execute q(
  array['00000000-0000-0000-0000-0000000a0004', '00000000-0000-0000-0000-0000000a000b']::uuid[],
  array['test@example.test']::text[]
);

select pg_temp.check((select count(*) from r) = 1, 'one row');
select pg_temp.check((select members_total from r) = 8, 'members_total leaves out the excluded id and email');
select pg_temp.check((select members_week from r) = 3,
  'members_week: 3, 6 days ago and the 01:00 Dubai edge count; 7 days ago does not');
select pg_temp.check((select members_month from r) = 6,
  'members_month: 29 days counts, 30 days and 40 days do not');
select pg_temp.check((select active_week from r) = 4,
  'active_week: 6 days ago counts, 7 days ago does not; the Dubai-day edge counts; excluded do not');
select pg_temp.check(
  (select non_lead_emails from r) @> array['a@example.test', 'c@example.test', 'e30@example.test', 'admin@example.test', 'test@example.test', 'adminonly@example.test'],
  'non_lead_emails has every Member, the excluded Members and the admin even when not a Member');
select pg_temp.check(not ((select non_lead_emails from r) @> array['nobody@example.test']), 'non_lead_emails has no stranger');

-- Nothing excluded: the empty arrays are fine and every Member counts, with no admin-only email.
create temp table r2 as execute q(array[]::uuid[], array[]::text[]);
select pg_temp.check((select members_total from r2) = 10, 'with nothing excluded all 10 count');
select pg_temp.check(not ((select non_lead_emails from r2) @> array['adminonly@example.test']), 'with no ids, a non-Member is not in non_lead_emails');

rollback;

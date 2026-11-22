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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000a0001', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000a0002', 'b@example.test'),
  ('00000000-0000-0000-0000-0000000a0003', 'c@example.test'),
  ('00000000-0000-0000-0000-0000000a0004', 'admin@example.test'),
  ('00000000-0000-0000-0000-0000000a0005', 'Test@Example.test');
-- a: 3 days ago, b: 20 days ago, c: 40 days ago; admin (excluded by id) and test (excluded by email) just joined.
insert into bestie.members (id, created_at) values
  ('00000000-0000-0000-0000-0000000a0001', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000a0002', now() - interval '20 days'),
  ('00000000-0000-0000-0000-0000000a0003', now() - interval '40 days'),
  ('00000000-0000-0000-0000-0000000a0004', now()),
  ('00000000-0000-0000-0000-0000000a0005', now());
-- Inside 7 days: a (twice, counts once), b, and the excluded admin. Outside: c.
insert into bestie.check_ins (member_id, energy, time_min, budget_aed, created_at) values
  ('00000000-0000-0000-0000-0000000a0001', 'low', 60, 0, now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000a0001', 'low', 60, 0, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000a0002', 'low', 60, 0, now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000a0003', 'low', 60, 0, now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000a0004', 'low', 60, 0, now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000a0005', 'low', 60, 0, now() - interval '1 day');

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
  (select coalesce(array_agg(email) filter (where email is not null), '{}'::text[]) from counted) as member_emails;

create temp table r as execute q(
  array['00000000-0000-0000-0000-0000000a0004']::uuid[],
  array['test@example.test']::text[]
);

select pg_temp.check((select count(*) from r) = 1, 'one row');
select pg_temp.check((select members_total from r) = 3, 'members_total leaves out the excluded id and email');
select pg_temp.check((select members_week from r) = 1, 'members_week counts the Member from 3 days ago');
select pg_temp.check((select members_month from r) = 2, 'members_month counts 3 and 20 days ago, not 40');
select pg_temp.check((select active_week from r) = 2, 'active_week counts distinct Members with a check-in in 7 days');
select pg_temp.check(
  (select member_emails from r) @> array['a@example.test', 'b@example.test', 'c@example.test']
  and not ((select member_emails from r) && array['admin@example.test', 'test@example.test']),
  'member_emails leaves out the excluded');

-- Nothing excluded: the empty arrays are fine and everyone counts.
create temp table r2 as execute q(array[]::uuid[], array[]::text[]);
select pg_temp.check((select members_total from r2) = 5, 'with nothing excluded all 5 count');

rollback;

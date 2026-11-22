/**
 * The one read-only statement behind the Overview's Member numbers.
 * $1::uuid[] = user ids to leave out (admins), $2::text[] = lowercase emails to leave out (test emails).
 * Days are Dubai days: "this week" is the last 7 including today, "this month" the last 30.
 * supabase/tests/admin_overview.test.sql embeds this text unchanged; overviewQuery.test.ts keeps them identical.
 */
export const OVERVIEW_SQL = `with d as (
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
  (select coalesce(array_agg(email) filter (where email is not null), '{}'::text[]) from counted) as member_emails`

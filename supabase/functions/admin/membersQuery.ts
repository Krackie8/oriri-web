/**
 * The two read-only statements behind the Members page.
 * MEMBERS_LIST_SQL: $1::text = the search ('' = all), already lower-cased and trimmed. Up to 50 Members, newest first,
 *   matched on a part of the email or the display name. `%`, `_` and `\` in the search are escaped so they match literally.
 * MEMBER_DETAIL_SQL: $1::uuid = the Member's id. One row, or none when she is not a Member.
 *   Dates are Dubai days. completion_days lists the distinct Dubai days of her live Completions.
 * Both run inside a read-only transaction as the connection user, so neither writes.
 * supabase/tests/admin_team.test.sql embeds this text unchanged; membersQuery.test.ts keeps them identical.
 * String.raw keeps the backslash escapes as written in the SQL.
 */
export const MEMBERS_LIST_SQL = String.raw`select m.id, u.email, p.display_name, m.created_at as joined, u.last_sign_in_at
from bestie.members m
join auth.users u on u.id = m.id
left join public.profiles p on p.user_id = m.id
where $1::text = ''
  or lower(u.email) like '%' || replace(replace(replace($1::text, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
  or lower(p.display_name) like '%' || replace(replace(replace($1::text, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
order by m.created_at desc, m.id
limit 50`

export const MEMBER_DETAIL_SQL = String.raw`select u.email,
  p.display_name,
  m.created_at as joined,
  u.email_confirmed_at is not null as email_confirmed,
  u.last_sign_in_at,
  coalesce(u.banned_until > now(), false) as banned,
  array(select jsonb_array_elements_text(
    case when jsonb_typeof(u.raw_app_meta_data -> 'providers') = 'array' then u.raw_app_meta_data -> 'providers' else '[]'::jsonb end
  )) as providers,
  m.home_area,
  m.instagram_handle,
  m.adult_confirmed_at is not null as adult_confirmed,
  coalesce((
    select jsonb_object_agg(c.purpose, c.granted)
    from (
      select distinct on (purpose) purpose, granted
      from bestie.consents
      where member_id = m.id
      order by purpose, recorded_at desc, id
    ) c
  ), '{}'::jsonb) as consents,
  (select count(*)::int from bestie.check_ins where member_id = m.id) as check_ins,
  (select max(created_at) from bestie.check_ins where member_id = m.id) as last_check_in,
  (select count(*)::int from bestie.completions where member_id = m.id and undone_at is null) as completions,
  (select count(*)::int from bestie.completions where member_id = m.id and undone_at is null and flagged) as flagged,
  array(
    select distinct to_char(completed_at at time zone 'Asia/Dubai', 'YYYY-MM-DD')
    from bestie.completions
    where member_id = m.id and undone_at is null
    order by 1
  ) as completion_days,
  coalesce((
    select jsonb_object_agg(s.pillar, s.total)
    from (
      select pillar::text as pillar, sum(amount)::int as total
      from bestie.points
      where member_id = m.id
      group by pillar
    ) s
  ), '{}'::jsonb) as sums,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'kind', l.kind, 'pillar', l.pillar, 'level', l.level,
      'shape', l.status_shape, 'tier', l.status_tier, 'reachedAt', l.reached_at
    ) order by l.reached_at, l.id)
    from bestie.member_levels l
    where l.member_id = m.id
  ), '[]'::jsonb) as recorded,
  (select status::text from bestie.memberships where member_id = m.id) as membership_status
from bestie.members m
join auth.users u on u.id = m.id
left join public.profiles p on p.user_id = m.id
where m.id = $1::uuid`

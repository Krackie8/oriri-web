-- The bestie-3 baseline (Day plan foundation, Task 4). Read-only: one select, no writes.
-- One row per engine_version. Rates are shares of Suggestions that ended completed, swapped or skipped,
-- out of all Suggestions that were not replaced or not_picked, rounded to 3 decimals.
-- Only Suggestions with a Member, and not the known test Member 0b931b9c...
-- Run it on the hosted project inside begin read only; ... rollback;
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

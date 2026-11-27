-- Catalogue review (spec 2026-11-27): run log, change log, review log, signals, statuses.
-- Section 1: schema. Locked to service_role; Members read none of it.
\set ON_ERROR_STOP on
set client_min_messages = warning;
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %', what; end if;
  raise notice 'ok - %', what;
end $$;
create or replace function pg_temp.raises(stmt text, state text, what text) returns void language plpgsql as $$
begin
  begin execute stmt;
  exception when others then
    if sqlstate <> state then raise exception 'FAIL: % (wanted %, got %: %)', what, state, sqlstate, sqlerrm; end if;
    raise notice 'ok - % (%)', what, sqlerrm; return;
  end;
  raise exception 'FAIL: % (statement succeeded: %)', what, stmt;
end $$;
set client_min_messages = notice;

-- Fixtures: an admin, a Member, one run, one pending place with two pending activities.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000e0a1', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000e0a2', 'm@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values ('00000000-0000-0000-0000-00000000e0a2', 'Jumeirah', now());

set role service_role;
insert into bestie.catalogue_runs (id, model) values ('00000000-0000-0000-0000-00000000e0c1', 'test-model');
insert into bestie.places (id, source, source_id, name, lat, lng, area, run_id) values
  ('00000000-0000-0000-0000-00000000e0e1', 'manual', 'cr-1', 'Review Studio', 25.2048, 55.2708, 'Jumeirah', '00000000-0000-0000-0000-00000000e0c1');
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, run_id)
  select '00000000-0000-0000-0000-00000000e0e1', id, 100, 150, '00000000-0000-0000-0000-00000000e0c1'
  from bestie.catalogue_items where slug in ('reformer', 'yoga');
insert into bestie.content_items (id, catalogue_item_id, source, source_id, title, url)
  select '00000000-0000-0000-0000-00000000e0f1', id, 'manual', 'cr-c1', 'A video', 'https://example.test/v'
  from bestie.catalogue_items where slug = 'yoga';

select pg_temp.check((select status = 'running' and counts = '{}'::jsonb and finished_at is null from bestie.catalogue_runs where id = '00000000-0000-0000-0000-00000000e0c1'), 'a new run is running with empty counts');
select pg_temp.raises($q$insert into bestie.catalogue_runs (status) values ('paused')$q$, '23514', 'an unknown run status is refused');
select pg_temp.check((select count(*) from bestie.place_activities where place_id = '00000000-0000-0000-0000-00000000e0e1' and status = 'pending') = 2, 'place_activities.status defaults to pending');
select pg_temp.raises($q$update bestie.place_activities set status = 'live' where place_id = '00000000-0000-0000-0000-00000000e0e1'$q$, '23514', 'an unknown activity status is refused');

-- catalogue_reviews: target shapes.
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision)
  select 'place', '00000000-0000-0000-0000-00000000e0e1', id, 'approved' from bestie.catalogue_items where slug = 'yoga'$q$, '23514', 'a place review with a catalogue item is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, decision) values ('place', 'approved')$q$, '23514', 'a place review without a place is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision) values ('place_activity', '00000000-0000-0000-0000-00000000e0e1', 'approved')$q$, '23514', 'a place_activity review without a catalogue item is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision)
  select 'event', '00000000-0000-0000-0000-00000000e0e1', id, 'approved' from bestie.catalogue_items where slug = 'yoga'$q$, '23514', 'an event review with a place is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision) values ('content', '00000000-0000-0000-0000-00000000e0e1', 'removed')$q$, '23514', 'a content review without a content item is refused');
-- Reason rules.
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'rejected')$q$, '23514', 'a rejected review without a reason is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision, reason) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'approved', 'closed')$q$, '23514', 'an approved review with a reason is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision, reason) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'rejected', 'because')$q$, '23514', 'an unknown reason is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision, note) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'approved', repeat('a', 281))$q$, '23514', 'a note over 280 characters is refused');
-- Decision vs target.
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'released')$q$, '23514', 'released with target place is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, place_id, decision) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'removed')$q$, '23514', 'removed with target place is refused');
select pg_temp.raises($q$insert into bestie.catalogue_reviews (target, content_item_id, decision) values ('content', '00000000-0000-0000-0000-00000000e0f1', 'edited_approved')$q$, '23514', 'edited_approved with target content is refused');
-- Valid rows.
insert into bestie.catalogue_reviews (target, place_id, decision, run_id, decided_by) values
  ('place', '00000000-0000-0000-0000-00000000e0e1', 'approved', '00000000-0000-0000-0000-00000000e0c1', '00000000-0000-0000-0000-00000000e0a1');
insert into bestie.catalogue_reviews (target, place_id, decision, reason, note) values
  ('place', '00000000-0000-0000-0000-00000000e0e1', 'rejected', 'bad_run', 'whole run was off');
insert into bestie.catalogue_reviews (target, content_item_id, decision) values
  ('content', '00000000-0000-0000-0000-00000000e0f1', 'removed');
select pg_temp.check((select count(*) from bestie.catalogue_reviews) = 3, 'valid place, rejected and content reviews insert');
-- Append-only.
-- As service_role the missing grants refuse first; as the owner the triggers do.
select pg_temp.raises($q$truncate bestie.catalogue_reviews$q$, '42501', 'service_role cannot truncate catalogue_reviews');
select pg_temp.raises($q$update bestie.catalogue_reviews set note = 'x'$q$, '42501', 'service_role cannot update catalogue_reviews');
reset role;
select pg_temp.raises($q$update bestie.catalogue_reviews set note = 'x'$q$, 'P0001', 'catalogue_reviews cannot be updated');
select pg_temp.raises($q$delete from bestie.catalogue_reviews$q$, 'P0001', 'catalogue_reviews cannot be deleted');
select pg_temp.raises($q$truncate bestie.catalogue_reviews$q$, 'P0001', 'catalogue_reviews cannot be truncated');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000e0a3', 'gone@example.test');
insert into bestie.catalogue_reviews (target, place_id, decision, decided_by) values ('place', '00000000-0000-0000-0000-00000000e0e1', 'approved', '00000000-0000-0000-0000-00000000e0a3');
delete from auth.users where id = '00000000-0000-0000-0000-00000000e0a3';
select pg_temp.check((select decided_by = '00000000-0000-0000-0000-00000000e0a3' from bestie.catalogue_reviews order by id desc limit 1), 'deleting the deciding admin succeeds and the review keeps decided_by');
set role service_role;

-- catalogue_changes.
insert into bestie.catalogue_changes (run_id, place_id, field, old_value, new_value)
  values ('00000000-0000-0000-0000-00000000e0c1', '00000000-0000-0000-0000-00000000e0e1', 'name', '"Old"', '"Review Studio"');
select pg_temp.check((select catalogue_item_id is null and created_at is not null from bestie.catalogue_changes), 'a place-level change has no catalogue item');

-- places: coordinates optional until approved.
insert into bestie.places (id, source, source_id, name, source_url) values
  ('00000000-0000-0000-0000-00000000e0e2', 'manual', 'cr-2', 'No Coords', 'https://example.test/p');
select pg_temp.check((select lat is null and lng is null and opening_hours is null and reviewed_at is null from bestie.places where id = '00000000-0000-0000-0000-00000000e0e2'), 'a pending place may have no coordinates');
select pg_temp.raises($q$update bestie.places set status = 'approved' where id = '00000000-0000-0000-0000-00000000e0e2'$q$, '23514', 'approving a place with no coordinates is refused');
select pg_temp.raises($q$insert into bestie.places (source, source_id, name, lat, lng) values ('manual', 'cr-3', 'X', 95, 55)$q$, '23514', 'a latitude out of range is still refused');
update bestie.places set lat = 25.1, lng = 55.1, status = 'approved' where id = '00000000-0000-0000-0000-00000000e0e2';
select pg_temp.check((select status = 'approved' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e2'), 'a place with coordinates can be approved');

-- content_items.screen gains removed.
insert into bestie.content_items (catalogue_item_id, source, source_id, title, url, screen)
  select id, 'manual', 'cr-c2', 'Removed one', 'https://example.test/r', 'removed' from bestie.catalogue_items where slug = 'yoga';
select pg_temp.check(exists (select 1 from bestie.content_items where screen = 'removed'), 'content_items.screen = removed inserts');
select pg_temp.raises($q$insert into bestie.content_items (catalogue_item_id, source, source_id, title, url, screen)
  select id, 'manual', 'cr-c3', 'Bad', 'https://example.test/b', 'deleted' from bestie.catalogue_items where slug = 'yoga'$q$, '23514', 'content_items.screen = deleted is refused');

-- catalogue_items.source_url.
select pg_temp.raises($q$update bestie.catalogue_items set source_url = 'http://x.test' where slug = 'yoga'$q$, '23514', 'a non-https catalogue source_url is refused');
update bestie.catalogue_items set source_url = 'https://example.test/e' where slug = 'yoga';

-- place_signals.
select pg_temp.raises($q$insert into bestie.place_signals (place_id, kind, text, evidence_url) values ('00000000-0000-0000-0000-00000000e0e1', 'ambience', 'Calm', 'http://x.test')$q$, '23514', 'a non-https evidence_url is refused');
select pg_temp.raises($q$insert into bestie.place_signals (place_id, kind, text, evidence_url) values ('00000000-0000-0000-0000-00000000e0e1', 'ambience', repeat('a', 141), 'https://example.test/s')$q$, '23514', 'signal text over 140 characters is refused');
select pg_temp.raises($q$insert into bestie.place_signals (place_id, kind, text, evidence_url) values ('00000000-0000-0000-0000-00000000e0e1', 'ambience', '   ', 'https://example.test/s')$q$, '23514', 'blank signal text is refused');
select pg_temp.raises($q$insert into bestie.place_signals (place_id, kind, text, evidence_url) values ('00000000-0000-0000-0000-00000000e0e1', 'vibes', 'Calm', 'https://example.test/s')$q$, '23514', 'an unknown signal kind is refused');
insert into bestie.place_signals (place_id, kind, text, evidence_url) values ('00000000-0000-0000-0000-00000000e0e1', 'women_friendly', 'Women-only classes', 'https://example.test/s');
select pg_temp.check((select count(*) from bestie.place_signals) = 1, 'a valid signal inserts');
reset role;

-- Structure: the status column and the indexes exist.
select pg_temp.check(exists (select 1 from pg_attribute where attrelid = 'bestie.place_activities'::regclass and attname = 'status' and attnotnull), 'place_activities.status is not null');
select pg_temp.check((select count(*) from pg_indexes where schemaname = 'bestie' and indexname in (
  'place_activities_status_idx', 'places_run_idx', 'place_activities_run_idx', 'catalogue_items_run_idx',
  'catalogue_changes_run_idx', 'catalogue_reviews_run_idx', 'place_signals_run_idx')) = 7, 'the status and run_id indexes exist');

-- Locked: a Member reads none of the new tables.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e0a2', true);
select pg_temp.check(not has_table_privilege('authenticated', 'bestie.catalogue_runs', 'select'), 'a Member cannot select catalogue_runs');
select pg_temp.check(not has_table_privilege('authenticated', 'bestie.catalogue_changes', 'select'), 'a Member cannot select catalogue_changes');
select pg_temp.check(not has_table_privilege('authenticated', 'bestie.catalogue_reviews', 'select'), 'a Member cannot select catalogue_reviews');
select pg_temp.check(not has_table_privilege('authenticated', 'bestie.place_signals', 'select'), 'a Member cannot select place_signals');
reset role;

-- Section 2: decisions and undo. Each call changes its target and writes its log rows in one go.
set role service_role;
-- More fixtures: three pending places (one with no position), one more run, one pending event.
insert into bestie.places (id, source, source_id, name, lat, lng, area, run_id) values
  ('00000000-0000-0000-0000-00000000e0e3', 'manual', 'cr-4', 'Flex Reformer Studio', 25.07, 55.14, 'JLT', '00000000-0000-0000-0000-00000000e0c1'),
  ('00000000-0000-0000-0000-00000000e0e4', 'manual', 'cr-5', 'Nowhere Yoga', null, null, 'JLT', '00000000-0000-0000-0000-00000000e0c1'),
  ('00000000-0000-0000-0000-00000000e0e5', 'manual', 'cr-6', 'Odd Studio', 25.07, 55.14, 'JLT', '00000000-0000-0000-0000-00000000e0c1');
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, run_id)
  select p.id, i.id, 100, 150, '00000000-0000-0000-0000-00000000e0c1'
  from (values ('00000000-0000-0000-0000-00000000e0e3'::uuid), ('00000000-0000-0000-0000-00000000e0e5'::uuid)) p(id)
  cross join bestie.catalogue_items i where i.slug in ('reformer', 'yoga');
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, run_id)
  select '00000000-0000-0000-0000-00000000e0e4', id, 80, 120, '00000000-0000-0000-0000-00000000e0c1'
  from bestie.catalogue_items where slug = 'reformer';
insert into bestie.catalogue_items (id, title, pillars, kind, status, run_id) values
  ('00000000-0000-0000-0000-00000000e0d1', 'Sunrise beach cleanup', '{meet_up}', 'event', 'pending', '00000000-0000-0000-0000-00000000e0c1');

-- Approve a place: one ticked, one unticked.
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e1', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', slug = 'reformer')) from bestie.catalogue_items where slug in ('reformer', 'yoga')), null) = 'decided',
  'approving a place returns decided');
select pg_temp.check((select status = 'approved' and approved_by = '00000000-0000-0000-0000-00000000e0a1' and approved_at is not null
  and reviewed_by = '00000000-0000-0000-0000-00000000e0a1' and reviewed_at is not null
  from bestie.places where id = '00000000-0000-0000-0000-00000000e0e1'), 'the place is approved, with approved_by and reviewed_by set');
select pg_temp.check((select pa.status = 'approved' from bestie.place_activities pa join bestie.catalogue_items i on i.id = pa.catalogue_item_id
  where pa.place_id = '00000000-0000-0000-0000-00000000e0e1' and i.slug = 'reformer'), 'the ticked activity is approved');
select pg_temp.check((select pa.status = 'rejected' from bestie.place_activities pa join bestie.catalogue_items i on i.id = pa.catalogue_item_id
  where pa.place_id = '00000000-0000-0000-0000-00000000e0e1' and i.slug = 'yoga'), 'the unticked activity is rejected');
select pg_temp.check((select r.reason = 'not_a_fit' and r.decision = 'rejected' from bestie.catalogue_reviews r join bestie.catalogue_items i on i.id = r.catalogue_item_id
  where r.id > :base and r.target = 'place_activity' and i.slug = 'yoga'), 'the unticked activity is logged as rejected, not_a_fit');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base) = 3, 'approving a place writes 3 review rows');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base and decided_by = '00000000-0000-0000-0000-00000000e0a1'
  and run_id = '00000000-0000-0000-0000-00000000e0c1' and place_id = '00000000-0000-0000-0000-00000000e0e1') = 3, 'each review row carries the admin, the run and the place');

-- Decided twice.
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e1', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', slug = 'reformer')) from bestie.catalogue_items where slug in ('reformer', 'yoga')), null) = 'notPending',
  'deciding the same place again returns notPending');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base) = 3, 'a notPending call writes nothing');

-- Every activity unticked.
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e3', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', false)) from bestie.catalogue_items where slug in ('reformer', 'yoga')), null) = 'needsActivity',
  'approving with every activity unticked returns needsActivity');
select pg_temp.check((select status = 'pending' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e3'), 'the place is still pending after needsActivity');
select pg_temp.check((select count(*) from bestie.place_activities where place_id = '00000000-0000-0000-0000-00000000e0e3' and status = 'pending') = 2, 'its activities are still pending after needsActivity');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base) = 0, 'needsActivity writes no review rows');

-- List doesn't match.
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e3', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', true)) from bestie.catalogue_items where slug = 'reformer'), null) = 'activitiesMismatch',
  'listing one of two pending activities returns activitiesMismatch');
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e3', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', true)) from bestie.catalogue_items where slug in ('reformer', 'yoga', 'swim')), null) = 'activitiesMismatch',
  'listing an activity the place does not have returns activitiesMismatch');
select pg_temp.check((select status = 'pending' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e3')
  and (select count(*) from bestie.catalogue_reviews where id > :base) = 0, 'activitiesMismatch changes and logs nothing');
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e3', 'approved', null, null,
  (select jsonb_agg(case when slug = 'reformer' then jsonb_build_object('catalogue_item_id', id, 'approve', true)
                         else jsonb_build_object('catalogue_item_id', id) end) from bestie.catalogue_items where slug in ('reformer', 'yoga')), null) = 'activitiesMismatch',
  'an entry with no approve key returns activitiesMismatch');
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e3', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', 'yes')) from bestie.catalogue_items where slug in ('reformer', 'yoga')), null) = 'activitiesMismatch',
  'an entry whose approve is not a boolean returns activitiesMismatch');
select pg_temp.check((select status = 'pending' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e3')
  and (select count(*) from bestie.place_activities where place_id = '00000000-0000-0000-0000-00000000e0e3' and status = 'pending') = 2
  and (select count(*) from bestie.catalogue_reviews where id > :base) = 0, 'an unclear approve changes and logs nothing');

-- No position.
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e4', 'approved', null, null,
  (select jsonb_agg(jsonb_build_object('catalogue_item_id', id, 'approve', true)) from bestie.catalogue_items where slug = 'reformer'), null) = 'noPosition',
  'approving a place with no position returns noPosition');
select pg_temp.check((select status = 'pending' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e4')
  and (select count(*) from bestie.catalogue_reviews where id > :base) = 0, 'noPosition leaves the place pending and logs nothing');

-- Edit, then approve.
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e3', 'edited_approved', null, 'Shorter name',
  (select jsonb_agg(case when slug = 'reformer' then jsonb_build_object('catalogue_item_id', id, 'approve', true, 'price_max_aed', 220)
                         else jsonb_build_object('catalogue_item_id', id, 'approve', true) end)
   from bestie.catalogue_items where slug in ('reformer', 'yoga')),
  '{"name": "Flex Studio JLT"}') = 'decided', 'edit, then approve returns decided');
select pg_temp.check((select name = 'Flex Studio JLT' and status = 'approved' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e3'), 'the edited name is saved and the place approved');
select pg_temp.check((select pa.price_max_aed = 220 and pa.status = 'approved' from bestie.place_activities pa join bestie.catalogue_items i on i.id = pa.catalogue_item_id
  where pa.place_id = '00000000-0000-0000-0000-00000000e0e3' and i.slug = 'reformer'), 'the edited price is saved');
select pg_temp.check((select edits->'name' = '{"old": "Flex Reformer Studio", "new": "Flex Studio JLT"}'::jsonb and decision = 'edited_approved' and note = 'Shorter name'
  from bestie.catalogue_reviews where id > :base and target = 'place'), 'the place review logs the name edit as old and new');
select pg_temp.check((select r.edits = '{"price_max_aed": {"old": 150, "new": 220}}'::jsonb and r.decision = 'edited_approved'
  from bestie.catalogue_reviews r join bestie.catalogue_items i on i.id = r.catalogue_item_id
  where r.id > :base and r.target = 'place_activity' and i.slug = 'reformer'), 'the activity review logs the price edit');
select pg_temp.check((select r.edits is null and r.decision = 'approved'
  from bestie.catalogue_reviews r join bestie.catalogue_items i on i.id = r.catalogue_item_id
  where r.id > :base and r.target = 'place_activity' and i.slug = 'yoga'), 'an activity with no edits is logged as approved');

-- Reject a place.
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e5', 'rejected', 'doesnt_feel_right', null, null, null) = 'decided',
  'rejecting a place returns decided');
select pg_temp.check((select status = 'rejected' and approved_at is null and reviewed_by = '00000000-0000-0000-0000-00000000e0a1' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e5'),
  'the rejected place is rejected and not approved');
select pg_temp.check((select count(*) from bestie.place_activities where place_id = '00000000-0000-0000-0000-00000000e0e5' and status = 'rejected') = 2, 'every pending activity is rejected');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base and reason = 'doesnt_feel_right' and decision = 'rejected') = 3,
  'the place and both activities are logged with the same reason');

-- Activity at a pending place, then at an approved one.
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.decide_place_activity('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e4',
  (select id from bestie.catalogue_items where slug = 'reformer'), 'approved', null, null, null) = 'placeNotApproved',
  'an activity at a pending place returns placeNotApproved');
select pg_temp.check((select pa.status = 'pending' from bestie.place_activities pa join bestie.catalogue_items i on i.id = pa.catalogue_item_id
  where pa.place_id = '00000000-0000-0000-0000-00000000e0e4' and i.slug = 'reformer')
  and (select count(*) from bestie.catalogue_reviews where id > :base) = 0, 'placeNotApproved changes and logs nothing');
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, run_id)
  select '00000000-0000-0000-0000-00000000e0e1', id, 60, 90, '00000000-0000-0000-0000-00000000e0c1' from bestie.catalogue_items where slug = 'swim';
select pg_temp.check(bestie.decide_place_activity('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e1',
  (select id from bestie.catalogue_items where slug = 'swim'), 'edited_approved', null, null, '{"duration_min": 45}') = 'decided',
  'a new activity at an approved place can be approved');
select pg_temp.check((select pa.status = 'approved' and pa.duration_min = 45 from bestie.place_activities pa join bestie.catalogue_items i on i.id = pa.catalogue_item_id
  where pa.place_id = '00000000-0000-0000-0000-00000000e0e1' and i.slug = 'swim'), 'the new activity is approved with its edit');
select pg_temp.check((select edits = '{"duration_min": {"old": null, "new": 45}}'::jsonb and decision = 'edited_approved' and target = 'place_activity'
  from bestie.catalogue_reviews where id > :base), 'the activity decision is logged with its edit');
select pg_temp.check(bestie.decide_place_activity('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e1',
  (select id from bestie.catalogue_items where slug = 'swim'), 'approved', null, null, null) = 'notPending', 'deciding the activity again returns notPending');

-- Events: edited_approved with no edits is stored as approved.
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.decide_event('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0d1', 'edited_approved', null, null, '{}') = 'decided',
  'approving an event returns decided');
select pg_temp.check((select status = 'approved' from bestie.catalogue_items where id = '00000000-0000-0000-0000-00000000e0d1'), 'the event is approved');
select pg_temp.check((select decision = 'approved' and edits is null and target = 'event' from bestie.catalogue_reviews where id > :base),
  'edited_approved with empty edits is stored as approved');
select pg_temp.check(bestie.decide_event('00000000-0000-0000-0000-00000000e0a1', (select id from bestie.catalogue_items where slug = 'yoga'), 'approved', null, null, null) = 'notFound',
  'a seed item is not an event');

-- bad_run is written only by undo: an admin decision naming it is a caller bug.
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, run_id)
  select '00000000-0000-0000-0000-00000000e0e1', id, 120, 160, '00000000-0000-0000-0000-00000000e0c1' from bestie.catalogue_items where slug = 'strength';
insert into bestie.catalogue_items (id, title, pillars, kind, status, run_id) values
  ('00000000-0000-0000-0000-00000000e0d2', 'Desert stargazing meetup', '{meet_up}', 'event', 'pending', '00000000-0000-0000-0000-00000000e0c1');
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.raises($q$select bestie.decide_place('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e4', 'rejected', 'bad_run', null, null, null)$q$,
  'P0001', 'decide_place refuses bad_run');
select pg_temp.raises($q$select bestie.decide_place_activity('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0e1',
  (select id from bestie.catalogue_items where slug = 'strength'), 'rejected', 'bad_run', null, null)$q$,
  'P0001', 'decide_place_activity refuses bad_run');
select pg_temp.raises($q$select bestie.decide_event('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0d2', 'rejected', 'bad_run', null, null)$q$,
  'P0001', 'decide_event refuses bad_run');
select pg_temp.check((select status = 'pending' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e4')
  and (select pa.status = 'pending' from bestie.place_activities pa join bestie.catalogue_items i on i.id = pa.catalogue_item_id
       where pa.place_id = '00000000-0000-0000-0000-00000000e0e1' and i.slug = 'strength')
  and (select status = 'pending' from bestie.catalogue_items where id = '00000000-0000-0000-0000-00000000e0d2')
  and (select count(*) from bestie.catalogue_reviews where id > :base) = 0, 'a refused bad_run changes and logs nothing');

-- Content.
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.decide_content('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0f1', 'removed', null) = 'decided',
  'removing a held content item returns decided');
select pg_temp.check((select screen = 'removed' from bestie.content_items where id = '00000000-0000-0000-0000-00000000e0f1'), 'the content item is removed');
select pg_temp.check(bestie.decide_content('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0f1', 'removed', null) = 'notHeld',
  'removing it again returns notHeld');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base and target = 'content' and decision = 'removed') = 1, 'one content review is logged');
select pg_temp.check(bestie.decide_content('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-0000000000ff', 'released', null) = 'notFound',
  'an unknown content item returns notFound');

-- Undo: a finished run left one pending place and two changes on an approved place; the price was since changed by hand.
insert into bestie.catalogue_runs (id, model, status, finished_at) values ('00000000-0000-0000-0000-00000000e0c2', 'test-model', 'done', now());
insert into bestie.places (id, source, source_id, name, lat, lng, area, run_id) values
  ('00000000-0000-0000-0000-00000000e0e6', 'manual', 'cr-7', 'Bad Find', 25.1, 55.1, 'JLT', '00000000-0000-0000-0000-00000000e0c2');
insert into bestie.places (id, source, source_id, name, lat, lng, area, status, opening_hours, last_run_id) values
  ('00000000-0000-0000-0000-00000000e0e7', 'manual', 'cr-8', 'Steady Studio', 25.1, 55.1, 'JLT', 'approved', '{"mon": "9-5"}', '00000000-0000-0000-0000-00000000e0c2');
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, status)
  select '00000000-0000-0000-0000-00000000e0e7', id, 100, 180, 'approved' from bestie.catalogue_items where slug = 'reformer';
insert into bestie.catalogue_changes (run_id, place_id, catalogue_item_id, field, old_value, new_value) values
  ('00000000-0000-0000-0000-00000000e0c2', '00000000-0000-0000-0000-00000000e0e7', null, 'opening_hours', '{"mon": "9-9"}', '{"mon": "9-5"}');
insert into bestie.catalogue_changes (run_id, place_id, catalogue_item_id, field, old_value, new_value)
  select '00000000-0000-0000-0000-00000000e0c2', '00000000-0000-0000-0000-00000000e0e7', id, 'price_max_aed', '150', '180' from bestie.catalogue_items where slug = 'reformer';
update bestie.place_activities set price_max_aed = 200
  where place_id = '00000000-0000-0000-0000-00000000e0e7' and catalogue_item_id = (select id from bestie.catalogue_items where slug = 'reformer');

select max(id) as base from bestie.catalogue_reviews \gset
create temp table undo_result as
  select bestie.undo_catalogue_run('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0c2') as r;
select pg_temp.check((select r->>'result' = 'undone' and (r->>'rejected')::int = 1 and (r->>'restored')::int = 1 from undo_result), 'undo returns undone, rejected 1, restored 1');
select pg_temp.check((select r->'skipped' = jsonb_build_array(jsonb_build_object('change_id', c.id, 'field', 'price_max_aed'))
  from undo_result, bestie.catalogue_changes c where c.run_id = '00000000-0000-0000-0000-00000000e0c2' and c.field = 'price_max_aed'), 'skipped holds the price change');
select pg_temp.check((select opening_hours = '{"mon": "9-9"}'::jsonb from bestie.places where id = '00000000-0000-0000-0000-00000000e0e7'), 'the hours are back');
select pg_temp.check((select price_max_aed = 200 from bestie.place_activities
  where place_id = '00000000-0000-0000-0000-00000000e0e7' and catalogue_item_id = (select id from bestie.catalogue_items where slug = 'reformer')), 'the hand-set price is kept');
select pg_temp.check((select status = 'rejected' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e6'), 'the pending find is rejected');
select pg_temp.check((select count(*) from bestie.catalogue_reviews where id > :base) = 1
  and (select reason = 'bad_run' and target = 'place' and place_id = '00000000-0000-0000-0000-00000000e0e6' and run_id = '00000000-0000-0000-0000-00000000e0c2'
       from bestie.catalogue_reviews where id > :base), 'the rejected find is logged once, as bad_run');
select pg_temp.check((select status = 'undone' and undone_at is not null and undone_by = '00000000-0000-0000-0000-00000000e0a1'
  from bestie.catalogue_runs where id = '00000000-0000-0000-0000-00000000e0c2'), 'the run is undone, with when and by whom');
select pg_temp.check(bestie.undo_catalogue_run('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0c2')->>'result' = 'alreadyUndone',
  'undoing again returns alreadyUndone');
select pg_temp.check(bestie.undo_catalogue_run('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0c1')->>'result' = 'stillRunning',
  'a running run cannot be undone');
select pg_temp.check(bestie.undo_catalogue_run('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-0000000000ff')->>'result' = 'notFound',
  'an unknown run returns notFound');
-- Undo of a run with a pending activity at an approved place and a change on that same place
-- (the case that takes the place lock before the activity's; see the lock-order comment in undo).
insert into bestie.catalogue_runs (id, model, status, finished_at) values ('00000000-0000-0000-0000-00000000e0c3', 'test-model', 'done', now());
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, run_id)
  select '00000000-0000-0000-0000-00000000e0e7', id, 90, 130, '00000000-0000-0000-0000-00000000e0c3' from bestie.catalogue_items where slug = 'yoga';
insert into bestie.catalogue_changes (run_id, place_id, field, old_value, new_value) values
  ('00000000-0000-0000-0000-00000000e0c3', '00000000-0000-0000-0000-00000000e0e7', 'name', '"Old Steady"', '"Steady Studio"');
select max(id) as base from bestie.catalogue_reviews \gset
select pg_temp.check(bestie.undo_catalogue_run('00000000-0000-0000-0000-00000000e0a1', '00000000-0000-0000-0000-00000000e0c3')
  = '{"result": "undone", "rejected": 1, "restored": 1, "skipped": []}'::jsonb, 'undo with an activity and a change on one place returns undone, 1, 1');
select pg_temp.check((select name = 'Old Steady' from bestie.places where id = '00000000-0000-0000-0000-00000000e0e7'), 'the place name is back');
select pg_temp.check((select r.reason = 'bad_run' and r.target = 'place_activity' and pa.status = 'rejected'
  from bestie.catalogue_reviews r join bestie.place_activities pa on pa.place_id = r.place_id and pa.catalogue_item_id = r.catalogue_item_id
  where r.id > :base), 'the pending activity at the approved place is rejected as bad_run');
reset role;

-- Who can call: service_role only.
set role authenticated;
select pg_temp.check(not has_function_privilege('authenticated', 'bestie.decide_place(uuid, uuid, text, text, text, jsonb, jsonb)', 'execute'), 'a Member cannot call decide_place');
select pg_temp.check(not has_function_privilege('authenticated', 'bestie.decide_place_activity(uuid, uuid, uuid, text, text, text, jsonb)', 'execute'), 'a Member cannot call decide_place_activity');
select pg_temp.check(not has_function_privilege('authenticated', 'bestie.decide_event(uuid, uuid, text, text, text, jsonb)', 'execute'), 'a Member cannot call decide_event');
select pg_temp.check(not has_function_privilege('authenticated', 'bestie.decide_content(uuid, uuid, text, text)', 'execute'), 'a Member cannot call decide_content');
select pg_temp.check(not has_function_privilege('authenticated', 'bestie.undo_catalogue_run(uuid, uuid)', 'execute'), 'a Member cannot call undo_catalogue_run');
reset role;

do $$ begin raise notice 'CATALOGUE REVIEW TESTS PASSED'; end $$;

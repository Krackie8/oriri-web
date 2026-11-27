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
select pg_temp.raises($q$update bestie.catalogue_reviews set note = 'x'$q$, 'P0001', 'catalogue_reviews cannot be updated');
select pg_temp.raises($q$delete from bestie.catalogue_reviews$q$, 'P0001', 'catalogue_reviews cannot be deleted');

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

do $$ begin raise notice 'CATALOGUE REVIEW TESTS PASSED'; end $$;

-- Day plan revamp (spec 2026-11-22): places, place_activities, content_items, and the new
-- catalogue_items / suggestions columns. Locked to service_role; Members read none of it.
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

-- Fixtures: one Member with a plan and a catalogue item to attach things to.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000009a1', 'p@example.test');
insert into bestie.members (id, home_area, adult_confirmed_at) values ('00000000-0000-0000-0000-0000000009a1', 'Jumeirah', now());
insert into bestie.check_ins (id, member_id, energy, time_min, budget_aed, goal, area) values
  ('00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009a1', 'steady', 120, 200, null, 'Jumeirah');
insert into bestie.day_plans (id, member_id, check_in_id, plan_date)
  values ('00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009c1', '2026-11-24');

set role service_role;
insert into bestie.catalogue_items (id, title, pillars, kind) values
  ('00000000-0000-0000-0000-0000000009b1', 'Pottery class', '{mindset}', 'class');
insert into bestie.places (id, source, source_id, name, lat, lng, area, status) values
  ('00000000-0000-0000-0000-0000000009e1', 'google', 'g-123', 'Clay Studio', 25.2048, 55.2708, 'Jumeirah', 'approved');
insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed, duration_min)
  values ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000009b1', 90, 150, 90);
select pg_temp.check((select count(*) from bestie.place_activities where place_id = '00000000-0000-0000-0000-0000000009e1') = 1, 'an approved place with one activity at AED 90-150 inserts');
insert into bestie.places (id, source, source_id, name, lat, lng)
  values ('00000000-0000-0000-0000-0000000009e2', 'manual', 'm-0', 'Fresh', 25.1, 55.1);
select pg_temp.check((select status = 'pending' and fetched_at is not null and created_at is not null from bestie.places where id = '00000000-0000-0000-0000-0000000009e2'), 'a new place defaults to pending and gets timestamps');
delete from bestie.places where id = '00000000-0000-0000-0000-0000000009e2';

select pg_temp.raises($q$insert into bestie.places (source, source_id, name, lat, lng) values ('google', 'g-123', 'Dupe', 25, 55)$q$, 'the same (source, source_id) twice is refused');
select pg_temp.raises($q$insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed)
  select '00000000-0000-0000-0000-0000000009e1', id, 100, 50 from bestie.catalogue_items where slug = 'walk'$q$, 'a max price below the min is refused');
select pg_temp.raises($q$insert into bestie.place_activities (place_id, catalogue_item_id, price_min_aed, price_max_aed)
  select '00000000-0000-0000-0000-0000000009e1', id, -1, 50 from bestie.catalogue_items where slug = 'walk'$q$, 'a negative min price is refused');
select pg_temp.raises($q$insert into bestie.places (source, source_id, name, lat, lng, status) values ('google', 'g-9', 'X', 25, 55, 'live')$q$, 'an unknown status is refused');
select pg_temp.raises($q$insert into bestie.places (source, source_id, name, lat, lng) values ('tripadvisor', 't-1', 'X', 25, 55)$q$, 'an unknown source is refused');
select pg_temp.raises($q$insert into bestie.places (source, source_id, name, lat, lng) values ('manual', 'm-1', '   ', 25, 55)$q$, 'a blank name is refused');
select pg_temp.raises($q$insert into bestie.places (source, source_id, name, lat, lng) values ('manual', 'm-2', 'X', 91, 55)$q$, 'a latitude out of range is refused');

insert into bestie.content_items (id, catalogue_item_id, source, source_id, title, url)
  values ('00000000-0000-0000-0000-0000000009f1', '00000000-0000-0000-0000-0000000009b1', 'youtube', 'yt-1', 'Wheel basics', 'https://example.test/v');
select pg_temp.check((select screen = 'held' and tags = '{}' from bestie.content_items where id = '00000000-0000-0000-0000-0000000009f1'), 'a content item defaults to held with no tags');
select pg_temp.raises($q$insert into bestie.content_items (catalogue_item_id, source, source_id, title, url)
  values ('00000000-0000-0000-0000-0000000009b1', 'youtube', 'yt-1', 'Dupe', 'https://example.test/d')$q$, 'the same content (source, source_id) twice is refused');
select pg_temp.raises($q$insert into bestie.content_items (catalogue_item_id, source, source_id, title, url, screen)
  values ('00000000-0000-0000-0000-0000000009b1', 'youtube', 'yt-2', 'X', 'https://example.test/x', 'maybe')$q$, 'an unknown screen is refused');

-- Defaults on a freshly inserted catalogue item (the seed rows are tuned by a later migration).
select pg_temp.check((select needs_place = false and intensity = 1 and time_note is null and ends_on is null and place_id is null
  from bestie.catalogue_items where id = '00000000-0000-0000-0000-0000000009b1'), 'a new catalogue item defaults to needs_place false, intensity 1');
select pg_temp.raises($q$update bestie.catalogue_items set intensity = 4 where id = '00000000-0000-0000-0000-0000000009b1'$q$, 'intensity above 3 is refused');
select pg_temp.raises($q$update bestie.catalogue_items set time_note = repeat('a', 61) where id = '00000000-0000-0000-0000-0000000009b1'$q$, 'a time note over 60 characters is refused');
reset role;

-- A signed-in Member reads none of it and cannot write it.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000009a1', true);
select pg_temp.raises($q$select count(*) from bestie.places$q$, 'she cannot read places (no grant at all)');
select pg_temp.check(not has_table_privilege('bestie.places', 'select'), 'she has no select privilege on places');
select pg_temp.raises($q$select count(*) from bestie.place_activities$q$, 'she cannot read place activities (no grant at all)');
select pg_temp.check(not has_table_privilege('bestie.place_activities', 'select'), 'she has no select privilege on place activities');
select pg_temp.raises($q$select count(*) from bestie.content_items$q$, 'she cannot read content items (no grant at all)');
select pg_temp.check(not has_table_privilege('bestie.content_items', 'select'), 'she has no select privilege on content items');
select pg_temp.check(not has_table_privilege('bestie.places', 'insert'), 'she cannot insert places');
select pg_temp.check(not has_table_privilege('bestie.place_activities', 'insert'), 'she cannot insert place activities');
select pg_temp.check(not has_table_privilege('bestie.content_items', 'insert'), 'she cannot insert content items');
rollback;

-- Deleting a place takes its activities and nothing else; a Suggestion keeps the audit trail.
set role service_role;
insert into bestie.suggestions (id, member_id, day_plan_id, check_in_id, catalogue_item_id, pillar, outcome, engine_version, places_shown, content_item_id)
  values ('00000000-0000-0000-0000-0000000009a9', '00000000-0000-0000-0000-0000000009a1', '00000000-0000-0000-0000-0000000009d1',
          '00000000-0000-0000-0000-0000000009c1', '00000000-0000-0000-0000-0000000009b1', 'mindset', 'shown', 'bestie-3',
          array['00000000-0000-0000-0000-0000000009e1'::uuid], '00000000-0000-0000-0000-0000000009f1');
delete from bestie.places where id = '00000000-0000-0000-0000-0000000009e1';
select pg_temp.check(not exists (select 1 from bestie.place_activities where place_id = '00000000-0000-0000-0000-0000000009e1'), 'deleting the place removes its activities');
select pg_temp.check(exists (select 1 from bestie.catalogue_items where id = '00000000-0000-0000-0000-0000000009b1'), 'the catalogue item stays');
select pg_temp.check((select places_shown = array['00000000-0000-0000-0000-0000000009e1'::uuid] from bestie.suggestions where id = '00000000-0000-0000-0000-0000000009a9'), 'the Suggestion stays with places_shown unchanged');
delete from bestie.content_items where id = '00000000-0000-0000-0000-0000000009f1';
select pg_temp.check((select content_item_id is null from bestie.suggestions where id = '00000000-0000-0000-0000-0000000009a9'), 'deleting a content item clears the Suggestion link only');
reset role;
-- Today's catalogue got its activity fields from the shape migration.
select pg_temp.check((select count(*) from bestie.catalogue_items where needs_place) = 13, '13 catalogue items need a place');
select pg_temp.check((select intensity = 3 from bestie.catalogue_items where slug = 'hotclass'), 'hotclass has intensity 3');
\echo PLACES TESTS PASSED

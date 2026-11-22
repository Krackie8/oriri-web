-- Day plan revamp: today's 29 items get needs_place and intensity. Generated from
-- supabase/functions/server/catalogueSeed.ts (a test keeps them equal).
update bestie.catalogue_items set needs_place = false, intensity = 2 where slug = 'matpilates';
update bestie.catalogue_items set needs_place = false, intensity = 3 where slug = 'runclub';
update bestie.catalogue_items set needs_place = true, intensity = 3 where slug = 'hotclass';
update bestie.catalogue_items set needs_place = true, intensity = 2 where slug = 'reformer';
update bestie.catalogue_items set needs_place = true, intensity = 3 where slug = 'strength';
update bestie.catalogue_items set needs_place = true, intensity = 2 where slug = 'swim';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'stretch';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'walk';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'yoga';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'sauna';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'soundbath';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'massage';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'spaday';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'friendwalk';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'fridge';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'oats';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'glowbowl';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'bowl';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'brunch';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'lunch';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'smoothiehome';
update bestie.catalogue_items set needs_place = true, intensity = 1 where slug = 'juice';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'teafortwo';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'podcast';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'book';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'sleep';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'journal';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'stepsisters';
update bestie.catalogue_items set needs_place = false, intensity = 1 where slug = 'reachout';

-- Abort (and roll the whole migration back) if the table has drifted from the seed.
do $$
begin
  if (select count(*) from bestie.catalogue_items where slug = any(array['matpilates', 'runclub', 'hotclass', 'reformer', 'strength', 'swim', 'stretch', 'walk', 'yoga', 'sauna', 'soundbath', 'massage', 'spaday', 'friendwalk', 'fridge', 'oats', 'glowbowl', 'bowl', 'brunch', 'lunch', 'smoothiehome', 'juice', 'teafortwo', 'podcast', 'book', 'sleep', 'journal', 'stepsisters', 'reachout'])) <> 29 then
    raise exception 'catalogue shape: expected 29 seed items, found a different number';
  end if;
  if (select count(*) from bestie.catalogue_items where needs_place) <> 13 then
    raise exception 'catalogue shape: expected 13 items needing a place, found a different number';
  end if;
end $$;

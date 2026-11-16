-- #70: the Catalogue's first rows, from the plan engine's built-in options.
-- Generated from supabase/functions/server/catalogueSeed.ts (a test keeps them equal).
-- slug ties a row to its presentation in code (links, places); Ren's own items may leave it empty.

alter table bestie.catalogue_items add column slug text;
alter table bestie.catalogue_items add constraint catalogue_items_slug_key unique (slug);
comment on column bestie.catalogue_items.slug is 'Stable key for items from the engine''s built-in options; their links and places live in code under this key.';

insert into bestie.catalogue_items
  (slug, title, pillars, kind, cost_aed, duration_min, energy_fit, goals, is_outdoor, is_light, is_fallback)
values
  ('matpilates', 'Mat Pilates flow', '{move}'::bestie.pillar[], 'workout', 0, 15, '{steady,high}'::bestie.energy[], '{focus,glow}'::bestie.goal[], false, false, false),
  ('runclub', 'Community run club', '{move,meet_up}'::bestie.pillar[], 'workout', 0, 45, '{steady,high}'::bestie.energy[], '{connect,focus}'::bestie.goal[], true, false, false),
  ('hotclass', 'Hot workout class', '{move}'::bestie.pillar[], 'workout', 140, 45, '{high}'::bestie.energy[], '{glow,focus}'::bestie.goal[], false, false, false),
  ('reformer', 'Reformer Pilates', '{move}'::bestie.pillar[], 'workout', 200, 50, '{steady,high}'::bestie.energy[], '{glow,focus}'::bestie.goal[], false, false, false),
  ('strength', 'Strength class', '{move}'::bestie.pillar[], 'workout', 150, 45, '{steady,high}'::bestie.energy[], '{focus,glow}'::bestie.goal[], false, false, false),
  ('swim', 'Easy lap swim', '{move}'::bestie.pillar[], 'workout', 60, 30, '{low,steady,high}'::bestie.energy[], '{recharge,focus,unwind}'::bestie.goal[], false, false, false),
  ('stretch', 'Gentle stretch & breathwork', '{move}'::bestie.pillar[], 'gentle', 0, 10, '{low,steady,high}'::bestie.energy[], '{unwind,recharge}'::bestie.goal[], false, true, true),
  ('walk', 'Sunset walk', '{move}'::bestie.pillar[], 'gentle', 0, 20, '{low,steady,high}'::bestie.energy[], '{unwind,recharge,connect}'::bestie.goal[], true, false, false),
  ('yoga', 'Yoga class', '{move}'::bestie.pillar[], 'gentle', 120, 60, '{low,steady}'::bestie.energy[], '{unwind,glow,recharge,connect}'::bestie.goal[], false, false, false),
  ('sauna', 'Sauna & cold plunge', '{move}'::bestie.pillar[], 'recovery', 160, 45, '{low,steady,high}'::bestie.energy[], '{recharge,unwind,glow}'::bestie.goal[], false, false, false),
  ('soundbath', 'Sound bath', '{move}'::bestie.pillar[], 'recovery', 180, 60, '{low,steady,high}'::bestie.energy[], '{unwind,recharge}'::bestie.goal[], false, false, false),
  ('massage', '60-minute massage', '{move}'::bestie.pillar[], 'recovery', 400, 60, '{low,steady,high}'::bestie.energy[], '{recharge,unwind,glow}'::bestie.goal[], false, false, false),
  ('spaday', 'Spa afternoon: hammam & massage', '{move}'::bestie.pillar[], 'recovery', 700, 150, '{low,steady,high}'::bestie.energy[], '{recharge,unwind,glow}'::bestie.goal[], false, false, false),
  ('friendwalk', 'Walk-and-talk with a friend', '{move,meet_up}'::bestie.pillar[], 'gentle', 0, 30, '{low,steady,high}'::bestie.energy[], '{connect}'::bestie.goal[], true, false, false),
  ('fridge', '10-minute veggie omelette', '{meal}'::bestie.pillar[], 'meal', 0, 10, '{low,steady,high}'::bestie.energy[], '{recharge,focus}'::bestie.goal[], false, false, false),
  ('oats', 'Protein overnight oats', '{meal}'::bestie.pillar[], 'meal', 0, 10, '{low,steady,high}'::bestie.energy[], '{focus,recharge}'::bestie.goal[], false, false, false),
  ('glowbowl', 'Glow bowl: salmon, greens, avocado', '{meal}'::bestie.pillar[], 'meal', 0, 15, '{low,steady,high}'::bestie.energy[], '{glow,recharge}'::bestie.goal[], false, false, false),
  ('bowl', 'Healthy grain or poke bowl', '{meal}'::bestie.pillar[], 'meal', 75, 30, '{low,steady,high}'::bestie.energy[], '{glow,focus,recharge}'::bestie.goal[], false, false, false),
  ('brunch', 'Slow brunch', '{meal}'::bestie.pillar[], 'meal', 140, 60, '{low,steady,high}'::bestie.energy[], '{connect,unwind,recharge}'::bestie.goal[], false, false, false),
  ('lunch', 'Long, healthy lunch', '{meal}'::bestie.pillar[], 'meal', 220, 75, '{low,steady,high}'::bestie.energy[], '{connect,unwind,glow}'::bestie.goal[], false, false, false),
  ('smoothiehome', 'Iced matcha or berry smoothie', '{meal}'::bestie.pillar[], 'snack', 0, 10, '{low,steady,high}'::bestie.energy[], '{glow,recharge,focus}'::bestie.goal[], false, true, true),
  ('juice', 'Fresh juice or iced matcha', '{meal}'::bestie.pillar[], 'snack', 40, 15, '{low,steady,high}'::bestie.energy[], '{glow,focus,recharge,connect}'::bestie.goal[], false, false, false),
  ('teafortwo', 'Tea for Two: pick an episode', '{mindset}'::bestie.pillar[], 'mindset', 0, 25, '{low,steady,high}'::bestie.energy[], '{connect,unwind}'::bestie.goal[], false, false, false),
  ('podcast', 'The Mel Robbins Podcast', '{mindset}'::bestie.pillar[], 'mindset', 0, 15, '{steady,high}'::bestie.energy[], '{focus}'::bestie.goal[], false, false, false),
  ('book', 'Atomic Habits, one chapter', '{mindset}'::bestie.pillar[], 'mindset', 0, 15, '{steady,high}'::bestie.energy[], '{focus,glow}'::bestie.goal[], false, false, false),
  ('sleep', 'Read: how to sleep deeper', '{mindset}'::bestie.pillar[], 'mindset', 0, 5, '{low,steady}'::bestie.energy[], '{recharge,unwind}'::bestie.goal[], false, false, false),
  ('journal', 'Five-minute journal', '{mindset}'::bestie.pillar[], 'mindset', 0, 5, '{low,steady,high}'::bestie.energy[], '{unwind,glow,focus}'::bestie.goal[], false, true, true),
  ('stepsisters', 'Stepsisters community meetup', '{meet_up}'::bestie.pillar[], 'meetup', 0, 60, '{low,steady,high}'::bestie.energy[], '{connect}'::bestie.goal[], false, false, false),
  ('reachout', 'Message a Stepsister you haven''t seen', '{meet_up}'::bestie.pillar[], 'reach_out', 0, 5, '{low,steady,high}'::bestie.energy[], '{connect}'::bestie.goal[], false, true, true);

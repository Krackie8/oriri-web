-- Day plan revamp (spec 2026-11-22): places, what each place offers, and content items.
-- Additive only; bestie-3 reads none of it. The three new tables are locked to service_role:
-- the weekly sweep and the Day plan engine read and write them, Members never do.
-- No updated_at trigger (the schema has none): the writer sets updated_at = now() itself.

set local lock_timeout = '5s';

create table bestie.places (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('google', 'foursquare', 'manual')),
  source_id text not null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  lat numeric(9,6) not null check (lat between -90 and 90),
  lng numeric(9,6) not null check (lng between -180 and 180),
  area text,
  website text,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  fetched_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index places_status_area_idx on bestie.places (status, area);

create table bestie.place_activities (
  place_id uuid not null references bestie.places(id) on delete cascade,
  catalogue_item_id uuid not null references bestie.catalogue_items(id) on delete cascade,
  price_min_aed numeric(8,2) not null check (price_min_aed >= 0),
  price_max_aed numeric(8,2) not null,
  duration_min integer check (duration_min > 0),
  evidence_url text,
  updated_at timestamptz not null default now(),
  primary key (place_id, catalogue_item_id),
  check (price_max_aed >= price_min_aed)
);
create index place_activities_catalogue_item_idx on bestie.place_activities (catalogue_item_id);

create table bestie.content_items (
  id uuid primary key default gen_random_uuid(),
  catalogue_item_id uuid not null references bestie.catalogue_items(id) on delete cascade,
  source text not null check (source in ('youtube', 'podcast_index', 'apple_podcasts', 'recipe_api', 'manual')),
  source_id text not null,
  title text not null,
  url text not null,
  duration_min integer check (duration_min > 0),
  tags text[] not null default '{}',
  screen text not null default 'held' check (screen in ('passed', 'held')),
  screen_reason text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);
create index content_items_catalogue_item_idx on bestie.content_items (catalogue_item_id);

-- Locked: service_role only, RLS on and forced, no policy for authenticated.
revoke all on bestie.places, bestie.place_activities, bestie.content_items from public, anon, authenticated;
grant all on bestie.places, bestie.place_activities, bestie.content_items to service_role;
alter table bestie.places enable row level security;
alter table bestie.places force row level security;
alter table bestie.place_activities enable row level security;
alter table bestie.place_activities force row level security;
alter table bestie.content_items enable row level security;
alter table bestie.content_items force row level security;

alter table bestie.catalogue_items
  add column needs_place boolean not null default false,
  add column intensity smallint not null default 1 check (intensity between 1 and 3),
  add column time_note text check (char_length(time_note) <= 60),
  add column ends_on date,
  add column place_id uuid references bestie.places(id) on delete set null,
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected'));
create index catalogue_items_place_idx on bestie.catalogue_items (place_id) where place_id is not null;
comment on column bestie.catalogue_items.place_id is 'An event''s own venue.';

-- places_shown is the audit of what was shown, in order. No foreign key: deleting a place never touches a Suggestion.
alter table bestie.suggestions
  add column content_item_id uuid references bestie.content_items(id) on delete set null,
  add column places_shown uuid[] not null default '{}';
create index suggestions_content_item_idx on bestie.suggestions (content_item_id) where content_item_id is not null;

-- Catalogue review (spec 2026-11-27). Additive only; the engine reads approved rows only, so nothing pending reaches a Member.
-- The four new tables are locked to service_role: Admin reaches them only through the admin edge function.
-- Logs (catalogue_changes, catalogue_reviews) are never deleted, so their foreign keys are plain references.

set local lock_timeout = '5s';

-- ===== 1. Tables =====

create table bestie.catalogue_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'done', 'failed', 'undone')),
  model text,
  counts jsonb not null default '{}',
  error text,
  undone_at timestamptz,
  undone_by uuid references auth.users(id) on delete set null
);

alter table bestie.places
  add column opening_hours jsonb,
  add column run_id uuid references bestie.catalogue_runs(id),
  add column last_run_id uuid references bestie.catalogue_runs(id),
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  alter column lat drop not null,
  alter column lng drop not null,
  add constraint places_approved_has_coords check (status <> 'approved' or (lat is not null and lng is not null));
create index places_run_idx on bestie.places (run_id);

-- Existing rows were approved by hand, so they stay approved; new rows start pending.
alter table bestie.place_activities
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  add column run_id uuid references bestie.catalogue_runs(id);
alter table bestie.place_activities alter column status set default 'pending';
create index place_activities_status_idx on bestie.place_activities (status);
create index place_activities_run_idx on bestie.place_activities (run_id);
comment on column bestie.place_activities.price_min_aed is 'Per person, AED';
comment on column bestie.place_activities.price_max_aed is 'Per person, AED';

alter table bestie.catalogue_items
  add column source_url text check (source_url like 'https://%'),
  add column run_id uuid references bestie.catalogue_runs(id);
create index catalogue_items_run_idx on bestie.catalogue_items (run_id);

alter table bestie.content_items drop constraint content_items_screen_check;
alter table bestie.content_items
  add constraint content_items_screen_check check (screen in ('passed', 'held', 'removed'));

create table bestie.catalogue_changes (
  id bigint generated always as identity primary key,
  run_id uuid not null references bestie.catalogue_runs(id),
  place_id uuid not null references bestie.places(id),
  catalogue_item_id uuid,
  field text not null check (field in ('name', 'area', 'website', 'opening_hours', 'status', 'price_min_aed', 'price_max_aed', 'duration_min')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index catalogue_changes_run_idx on bestie.catalogue_changes (run_id);

create table bestie.catalogue_reviews (
  id bigint generated always as identity primary key,
  target text not null check (target in ('place', 'place_activity', 'event', 'content')),
  place_id uuid references bestie.places(id),
  catalogue_item_id uuid references bestie.catalogue_items(id),
  content_item_id uuid references bestie.content_items(id),
  decision text not null check (decision in ('approved', 'edited_approved', 'rejected', 'released', 'removed')),
  reason text check (reason in ('not_women_friendly', 'doesnt_feel_right', 'too_far', 'wrong_price', 'closed', 'duplicate', 'not_a_fit', 'bad_run', 'other')),
  note text check (char_length(note) <= 280),
  edits jsonb,
  run_id uuid references bestie.catalogue_runs(id),
  decided_by uuid, -- no foreign key, like team_changes: the record must outlive deleted accounts
  decided_at timestamptz not null default now(),
  constraint catalogue_reviews_target_shape check (
    (target = 'place' and place_id is not null and catalogue_item_id is null and content_item_id is null)
    or (target = 'place_activity' and place_id is not null and catalogue_item_id is not null and content_item_id is null)
    or (target = 'event' and catalogue_item_id is not null and place_id is null and content_item_id is null)
    or (target = 'content' and content_item_id is not null and place_id is null and catalogue_item_id is null)
  ),
  constraint catalogue_reviews_reason_rule check ((decision = 'rejected') = (reason is not null)),
  constraint catalogue_reviews_decision_target check (
    (decision not in ('released', 'removed') or target = 'content')
    and (decision <> 'edited_approved' or target <> 'content')
  )
);
create index catalogue_reviews_run_idx on bestie.catalogue_reviews (run_id);

-- Append-only, like bestie.team_changes.
create function bestie.catalogue_reviews_append_only() returns trigger
  language plpgsql set search_path = '' as $$
begin
  raise exception 'bestie.catalogue_reviews is append-only (% refused)', tg_op;
end $$;
revoke execute on function bestie.catalogue_reviews_append_only() from public, anon, authenticated, service_role;

create trigger catalogue_reviews_append_only before update or delete on bestie.catalogue_reviews
  for each row execute function bestie.catalogue_reviews_append_only();

create trigger catalogue_reviews_no_truncate before truncate on bestie.catalogue_reviews
  for each statement execute function bestie.catalogue_reviews_append_only();

create table bestie.place_signals (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references bestie.places(id) on delete cascade,
  kind text not null check (kind in ('women_friendly', 'menu_fit', 'ambience')),
  text text not null check (char_length(btrim(text)) between 1 and 140),
  evidence_url text not null check (evidence_url like 'https://%'),
  run_id uuid references bestie.catalogue_runs(id),
  created_at timestamptz not null default now()
);
create index place_signals_run_idx on bestie.place_signals (run_id);

-- ===== 2. Locks =====

-- Locked: service_role only, RLS on and forced, no policy for authenticated.
revoke all on bestie.catalogue_runs, bestie.catalogue_changes, bestie.catalogue_reviews, bestie.place_signals
  from public, anon, authenticated;
grant all on bestie.catalogue_runs, bestie.catalogue_changes, bestie.place_signals to service_role;
grant select, insert on bestie.catalogue_reviews to service_role;
grant usage on sequence bestie.catalogue_changes_id_seq, bestie.catalogue_reviews_id_seq to service_role;
alter table bestie.catalogue_runs enable row level security;
alter table bestie.catalogue_runs force row level security;
alter table bestie.catalogue_changes enable row level security;
alter table bestie.catalogue_changes force row level security;
alter table bestie.catalogue_reviews enable row level security;
alter table bestie.catalogue_reviews force row level security;
alter table bestie.place_signals enable row level security;
alter table bestie.place_signals force row level security;

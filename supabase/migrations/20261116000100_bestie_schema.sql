-- #68: Bestie's private data home (ADR-0001, ADR-0002).
-- The bestie schema is NOT in the API's exposed schemas, so the browser cannot reach it.
-- The edge function (service_role) is the only way in. RLS stays on as a second lock:
-- a signed-in Member can read only her own rows and cannot write anything directly.

create schema bestie;
comment on schema bestie is 'Bestie loop v1. Private: not exposed to the Data API; reached only through the edge function.';

revoke all on schema bestie from public, anon, authenticated;
grant usage on schema bestie to authenticated, service_role;

create type bestie.pillar as enum ('move', 'meal', 'mindset', 'meet_up');
create type bestie.energy as enum ('low', 'steady', 'high');
create type bestie.goal as enum ('recharge', 'focus', 'glow', 'connect', 'unwind');
create type bestie.plan_status as enum ('active', 'replaced');
create type bestie.suggestion_outcome as enum ('shown', 'accepted', 'swapped', 'skipped', 'completed', 'replaced');
create type bestie.membership_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');

-- Members: one row per Oriri account. Deleting the auth user removes it.
create table bestie.members (
  id uuid primary key references auth.users(id) on delete cascade,
  city text not null default 'dubai',
  home_area text,
  instagram_handle text,
  adult_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bestie.consents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references bestie.members(id) on delete cascade,
  purpose text not null check (purpose in ('terms', 'location', 'wellness_signals', 'personalisation', 'push', 'marketing')),
  version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now()
);
create index consents_member_purpose_idx on bestie.consents (member_id, purpose, recorded_at desc);

create table bestie.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  google_place_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Ren's catalogue. Google place IDs only, never copied Google data.
create table bestie.catalogue_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pillars bestie.pillar[] not null check (cardinality(pillars) between 1 and 2),
  kind text not null,
  city text not null default 'dubai',
  area text,
  cost_aed numeric(8,2) not null default 0 check (cost_aed >= 0),
  duration_min integer not null default 0 check (duration_min >= 0),
  energy_fit bestie.energy[] not null default '{low,steady,high}',
  goals bestie.goal[] not null default '{}',
  is_outdoor boolean not null default false,
  google_place_id text,
  content_url text,
  event_id text,                         -- Meet up events stay in the key-value store
  partner_id uuid references bestie.partners(id) on delete set null,
  is_light boolean not null default false,
  is_fallback boolean not null default false,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catalogue_items_partner_idx on bestie.catalogue_items (partner_id);

-- Learning log: check_ins, day_plans and suggestions survive account deletion anonymised
-- (member_id set to null).
create table bestie.check_ins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references bestie.members(id) on delete set null,
  energy bestie.energy not null,
  time_min integer not null check (time_min > 0),
  budget_aed numeric(8,2) not null check (budget_aed >= 0),
  goal bestie.goal,
  city text not null default 'dubai',
  area text,
  created_at timestamptz not null default now()
);
create index check_ins_member_idx on bestie.check_ins (member_id, created_at desc);

create table bestie.day_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references bestie.members(id) on delete set null,
  check_in_id uuid not null references bestie.check_ins(id) on delete cascade,
  plan_date date not null,
  status bestie.plan_status not null default 'active',
  created_at timestamptz not null default now(),
  replaced_at timestamptz
);
-- One active Day plan per Member per day; checking in again marks the old one replaced.
create unique index day_plans_one_active_per_day on bestie.day_plans (member_id, plan_date) where status = 'active';
create index day_plans_check_in_idx on bestie.day_plans (check_in_id);

create table bestie.suggestions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references bestie.members(id) on delete set null,
  day_plan_id uuid not null references bestie.day_plans(id) on delete cascade,
  check_in_id uuid not null references bestie.check_ins(id) on delete cascade,
  catalogue_item_id uuid references bestie.catalogue_items(id) on delete set null,
  pillar bestie.pillar not null,
  is_light boolean not null default false,
  is_new_for_you boolean not null default false,
  reason text,
  outcome bestie.suggestion_outcome not null default 'shown',
  engine_version text not null,
  created_at timestamptz not null default now(),
  outcome_at timestamptz
);
create index suggestions_member_idx on bestie.suggestions (member_id, created_at desc);
create index suggestions_day_plan_idx on bestie.suggestions (day_plan_id);
create index suggestions_check_in_idx on bestie.suggestions (check_in_id);
create index suggestions_catalogue_idx on bestie.suggestions (catalogue_item_id);

-- Completions are personal (Proof, Reflection, photo): deleted with the account.
create table bestie.completions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references bestie.members(id) on delete cascade,
  suggestion_id uuid not null unique references bestie.suggestions(id) on delete cascade,
  proof_kind text not null check (proof_kind in ('tick', 'reflection', 'qr', 'reach_out', 'location')),
  reflection text,
  photo_path text,
  flagged boolean not null default false,
  flag_reason text,
  completed_at timestamptz not null default now(),
  undone_at timestamptz
);
create index completions_member_idx on bestie.completions (member_id, completed_at desc);

-- Append-only points ledger. Levels are calculated from it.
create table bestie.points (
  id bigint generated always as identity primary key,
  member_id uuid not null references bestie.members(id) on delete cascade,
  pillar bestie.pillar not null,
  amount integer not null,
  reason text not null,
  completion_id uuid references bestie.completions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index points_member_idx on bestie.points (member_id, pillar);
create index points_completion_idx on bestie.points (completion_id);

-- History of Level-ups and Status moments. Levels never go down.
create table bestie.member_levels (
  id bigint generated always as identity primary key,
  member_id uuid not null references bestie.members(id) on delete cascade,
  kind text not null check (kind in ('level', 'status')),
  pillar bestie.pillar,
  level smallint check (level between 1 and 10),
  status_shape text,
  status_tier text,
  reached_at timestamptz not null default now(),
  check ((kind = 'level' and pillar is not null and level is not null)
      or (kind = 'status' and status_shape is not null and status_tier is not null))
);
create index member_levels_member_idx on bestie.member_levels (member_id, reached_at desc);

create table bestie.memberships (
  member_id uuid primary key references bestie.members(id) on delete cascade,
  status bestie.membership_status not null,
  provider text,
  provider_ref text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Ren's bank of daily lines for Morning with Bestie.
create table bestie.daily_lines (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  set_name text,
  show_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The ledger may only grow. A row goes only when its Member's account is deleted
-- (the cascade from bestie.members), never by a direct update or delete.
create function bestie.points_append_only() returns trigger
  language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from bestie.members m where m.id = old.member_id) then
    return old;
  end if;
  raise exception 'bestie.points is append-only (% refused)', tg_op;
end $$;
revoke execute on function bestie.points_append_only() from public, anon, authenticated, service_role;

create trigger points_append_only before update or delete on bestie.points
  for each row execute function bestie.points_append_only();
create trigger points_no_truncate before truncate on bestie.points
  for each statement execute function bestie.points_append_only();

-- Privileges: nothing for anon; read-only for authenticated (RLS narrows it to her rows);
-- full access for the edge function's service_role.
revoke all on all tables in schema bestie from public, anon, authenticated;
grant select on all tables in schema bestie to authenticated;
grant all on all tables in schema bestie to service_role;
grant usage on all sequences in schema bestie to service_role;

-- RLS on (and forced) everywhere.
do $$ declare t text; begin
  foreach t in array array['members','consents','catalogue_items','partners','check_ins','day_plans',
                           'suggestions','completions','points','member_levels','memberships','daily_lines'] loop
    execute format('alter table bestie.%I enable row level security', t);
    execute format('alter table bestie.%I force row level security', t);
  end loop;
end $$;

create policy members_own on bestie.members for select to authenticated using (id = (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['consents','check_ins','day_plans','suggestions','completions','points','member_levels','memberships'] loop
    execute format('create policy %I on bestie.%I for select to authenticated using (member_id = (select auth.uid()))', t || '_own', t);
  end loop;
end $$;

-- Shared reference data: readable by signed-in Members, written only by the edge function.
create policy catalogue_items_read on bestie.catalogue_items for select to authenticated using (retired_at is null);
create policy partners_read on bestie.partners for select to authenticated using (is_active);
create policy daily_lines_read on bestie.daily_lines for select to authenticated using (is_active);

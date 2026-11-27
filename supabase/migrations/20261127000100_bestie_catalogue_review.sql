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

-- A Member reads only approved catalogue items: a run's pending or rejected finds stay out of sight.
-- Same as the 20261116000100 policy, plus the status check.
drop policy catalogue_items_read on bestie.catalogue_items;
create policy catalogue_items_read on bestie.catalogue_items for select to authenticated
  using (retired_at is null and status = 'approved');

-- ===== 3. Decisions and undo =====
-- Each function does its whole job in one call, so a change and its log rows commit together or not at all.
-- They run as service_role (security invoker) and answer an expected outcome with a result, never an error.

-- The edits a decision makes, as {field: {"old": …, "new": …}}, for the listed fields that change.
create function bestie.catalogue_edits(p_old jsonb, p_edits jsonb, p_fields text[]) returns jsonb
  language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(f, jsonb_build_object('old', p_old -> f, 'new', p_edits -> f)), '{}')
  from unnest(p_fields) f
  where p_edits ? f and coalesce(p_old -> f, 'null') <> coalesce(p_edits -> f, 'null')
$$;

-- A new place and its activities. p_activities must list exactly the place's pending activities;
-- an unticked one is rejected as not_a_fit. Rejecting the place rejects every pending activity with the same reason.
create function bestie.decide_place(p_actor uuid, p_place uuid, p_decision text, p_reason text, p_note text,
                                    p_activities jsonb, p_edits jsonb) returns text
  language plpgsql security invoker set search_path = '' as $$
declare
  v_place bestie.places;
  v_pending int;
  v_listed int;
  v_matched int;
  v_unclear int;
  v_edits jsonb := '{}';
  v_signals_old jsonb;
  v_signals_new jsonb;
  v_act record;
  v_act_edits jsonb;
begin
  if p_decision not in ('approved', 'edited_approved', 'rejected') then
    raise exception 'decide_place: unknown decision %', p_decision;
  end if;
  if p_reason = 'bad_run' then
    raise exception 'decide_place: bad_run is written only by undo_catalogue_run';
  end if;
  select * into v_place from bestie.places where id = p_place for update;
  if not found then return 'notFound'; end if;
  if v_place.status <> 'pending' then return 'notPending'; end if;

  if p_decision = 'rejected' then
    update bestie.places set status = 'rejected', reviewed_at = now(), reviewed_by = p_actor, updated_at = now()
      where id = p_place;
    insert into bestie.catalogue_reviews (target, place_id, decision, reason, note, run_id, decided_by)
      values ('place', p_place, 'rejected', p_reason, p_note, v_place.run_id, p_actor);
    with r as (
      update bestie.place_activities set status = 'rejected', updated_at = now()
        where place_id = p_place and status = 'pending'
        returning catalogue_item_id, run_id)
    insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision, reason, run_id, decided_by)
      select 'place_activity', p_place, catalogue_item_id, 'rejected', p_reason, run_id, p_actor from r;
    return 'decided';
  end if;

  select count(*) into v_pending
    from (select 1 from bestie.place_activities where place_id = p_place and status = 'pending' for update) s;
  -- An entry without a boolean approve fails toward safety: the whole list is refused.
  select count(*), count(distinct pa.catalogue_item_id), count(*) filter (where jsonb_typeof(e -> 'approve') is distinct from 'boolean')
    into v_listed, v_matched, v_unclear
    from jsonb_array_elements(coalesce(p_activities, '[]')) e
    left join bestie.place_activities pa on pa.place_id = p_place and pa.status = 'pending'
      and pa.catalogue_item_id = (e ->> 'catalogue_item_id')::uuid;
  if v_listed <> v_pending or v_matched <> v_pending or v_unclear > 0 then return 'activitiesMismatch'; end if;
  if not exists (select 1 from jsonb_array_elements(coalesce(p_activities, '[]')) e where e -> 'approve' = 'true') then
    return 'needsActivity';
  end if;
  if v_place.lat is null or v_place.lng is null then return 'noPosition'; end if;

  -- A plain approve that carries edits is an edit: they are applied and logged, never dropped.
  if p_decision = 'approved' and (coalesce(p_edits, '{}') not in ('{}', 'null')
      or exists (select 1 from jsonb_array_elements(p_activities) e
                 where e -> 'approve' = 'true' and (e ?| array['price_min_aed', 'price_max_aed', 'duration_min']))) then
    p_decision := 'edited_approved';
  end if;
  if p_decision = 'edited_approved' then
    v_edits := bestie.catalogue_edits(to_jsonb(v_place), p_edits, '{name,area}');
    select jsonb_agg(jsonb_build_object('id', s.id, 'text', s.text) order by s.id),
           jsonb_agg(jsonb_build_object('id', s.id, 'text', e ->> 'text') order by s.id)
      into v_signals_old, v_signals_new
      from jsonb_array_elements(coalesce(p_edits -> 'signals', '[]')) e
      join bestie.place_signals s on s.id = (e ->> 'id')::uuid and s.place_id = p_place
      where s.text is distinct from e ->> 'text';
    if v_signals_old is not null then
      update bestie.place_signals s set text = e ->> 'text'
        from jsonb_array_elements(p_edits -> 'signals') e
        where s.id = (e ->> 'id')::uuid and s.place_id = p_place;
      v_edits := v_edits || jsonb_build_object('signals', jsonb_build_object('old', v_signals_old, 'new', v_signals_new));
    end if;
  end if;

  update bestie.places set
      name = case when v_edits ? 'name' then v_edits -> 'name' ->> 'new' else name end,
      area = case when v_edits ? 'area' then v_edits -> 'area' ->> 'new' else area end,
      status = 'approved', approved_at = now(), approved_by = p_actor,
      reviewed_at = now(), reviewed_by = p_actor, updated_at = now()
    where id = p_place;
  insert into bestie.catalogue_reviews (target, place_id, decision, note, edits, run_id, decided_by)
    values ('place', p_place, case when v_edits = '{}' then 'approved' else 'edited_approved' end,
            p_note, nullif(v_edits, '{}'), v_place.run_id, p_actor);

  for v_act in
    select pa.*, e as item
      from jsonb_array_elements(p_activities) e
      join bestie.place_activities pa on pa.place_id = p_place and pa.catalogue_item_id = (e ->> 'catalogue_item_id')::uuid
  loop
    if v_act.item -> 'approve' <> 'true' then
      update bestie.place_activities set status = 'rejected', updated_at = now()
        where place_id = p_place and catalogue_item_id = v_act.catalogue_item_id;
      insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision, reason, run_id, decided_by)
        values ('place_activity', p_place, v_act.catalogue_item_id, 'rejected', 'not_a_fit', v_act.run_id, p_actor);
    else
      v_act_edits := case when p_decision = 'edited_approved'
        then bestie.catalogue_edits(to_jsonb(v_act), v_act.item, '{price_min_aed,price_max_aed,duration_min}') else '{}' end;
      update bestie.place_activities set
          price_min_aed = case when v_act_edits ? 'price_min_aed' then (v_act_edits -> 'price_min_aed' ->> 'new')::numeric else price_min_aed end,
          price_max_aed = case when v_act_edits ? 'price_max_aed' then (v_act_edits -> 'price_max_aed' ->> 'new')::numeric else price_max_aed end,
          duration_min = case when v_act_edits ? 'duration_min' then (v_act_edits -> 'duration_min' ->> 'new')::integer else duration_min end,
          status = 'approved', updated_at = now()
        where place_id = p_place and catalogue_item_id = v_act.catalogue_item_id;
      insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision, edits, run_id, decided_by)
        values ('place_activity', p_place, v_act.catalogue_item_id,
                case when v_act_edits = '{}' then 'approved' else 'edited_approved' end,
                nullif(v_act_edits, '{}'), v_act.run_id, p_actor);
    end if;
  end loop;
  return 'decided';
end $$;

-- A new activity at an already approved place.
create function bestie.decide_place_activity(p_actor uuid, p_place uuid, p_item uuid, p_decision text, p_reason text,
                                             p_note text, p_edits jsonb) returns text
  language plpgsql security invoker set search_path = '' as $$
declare
  v_place_status text;
  v_act bestie.place_activities;
  v_edits jsonb := '{}';
begin
  if p_decision not in ('approved', 'edited_approved', 'rejected') then
    raise exception 'decide_place_activity: unknown decision %', p_decision;
  end if;
  if p_reason = 'bad_run' then
    raise exception 'decide_place_activity: bad_run is written only by undo_catalogue_run';
  end if;
  -- The place is locked before its activity, the same order as decide_place, so the two never deadlock.
  select status into v_place_status from bestie.places where id = p_place for update;
  select * into v_act from bestie.place_activities where place_id = p_place and catalogue_item_id = p_item for update;
  if not found then return 'notFound'; end if;
  if v_act.status <> 'pending' then return 'notPending'; end if;
  if v_place_status <> 'approved' then return 'placeNotApproved'; end if;

  -- A plain approve that carries edits is an edit: they are applied and logged, never dropped.
  if p_decision = 'approved' and coalesce(p_edits, '{}') not in ('{}', 'null') then p_decision := 'edited_approved'; end if;
  if p_decision = 'edited_approved' then
    v_edits := bestie.catalogue_edits(to_jsonb(v_act), p_edits, '{price_min_aed,price_max_aed,duration_min}');
  end if;
  update bestie.place_activities set
      price_min_aed = case when v_edits ? 'price_min_aed' then (v_edits -> 'price_min_aed' ->> 'new')::numeric else price_min_aed end,
      price_max_aed = case when v_edits ? 'price_max_aed' then (v_edits -> 'price_max_aed' ->> 'new')::numeric else price_max_aed end,
      duration_min = case when v_edits ? 'duration_min' then (v_edits -> 'duration_min' ->> 'new')::integer else duration_min end,
      status = case when p_decision = 'rejected' then 'rejected' else 'approved' end,
      updated_at = now()
    where place_id = p_place and catalogue_item_id = p_item;
  update bestie.places set reviewed_at = now(), reviewed_by = p_actor where id = p_place;
  insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision, reason, note, edits, run_id, decided_by)
    values ('place_activity', p_place, p_item,
            case when p_decision = 'rejected' then 'rejected' when v_edits = '{}' then 'approved' else 'edited_approved' end,
            case when p_decision = 'rejected' then p_reason end, p_note, nullif(v_edits, '{}'), v_act.run_id, p_actor);
  return 'decided';
end $$;

-- An event or social activity found by a run (catalogue_items with run_id set). Seed items are never touched.
create function bestie.decide_event(p_actor uuid, p_item uuid, p_decision text, p_reason text, p_note text,
                                    p_edits jsonb) returns text
  language plpgsql security invoker set search_path = '' as $$
declare
  v_item bestie.catalogue_items;
  v_edits jsonb := '{}';
begin
  if p_decision not in ('approved', 'edited_approved', 'rejected') then
    raise exception 'decide_event: unknown decision %', p_decision;
  end if;
  if p_reason = 'bad_run' then
    raise exception 'decide_event: bad_run is written only by undo_catalogue_run';
  end if;
  select * into v_item from bestie.catalogue_items where id = p_item and run_id is not null for update;
  if not found then return 'notFound'; end if;
  if v_item.status <> 'pending' then return 'notPending'; end if;

  -- A plain approve that carries edits is an edit: they are applied and logged, never dropped.
  if p_decision = 'approved' and coalesce(p_edits, '{}') not in ('{}', 'null') then p_decision := 'edited_approved'; end if;
  if p_decision = 'edited_approved' then
    v_edits := bestie.catalogue_edits(to_jsonb(v_item), p_edits, '{title,time_note,ends_on}');
  end if;
  update bestie.catalogue_items set
      title = case when v_edits ? 'title' then v_edits -> 'title' ->> 'new' else title end,
      time_note = case when v_edits ? 'time_note' then v_edits -> 'time_note' ->> 'new' else time_note end,
      ends_on = case when v_edits ? 'ends_on' then (v_edits -> 'ends_on' ->> 'new')::date else ends_on end,
      status = case when p_decision = 'rejected' then 'rejected' else 'approved' end,
      updated_at = now()
    where id = p_item;
  insert into bestie.catalogue_reviews (target, catalogue_item_id, decision, reason, note, edits, run_id, decided_by)
    values ('event', p_item,
            case when p_decision = 'rejected' then 'rejected' when v_edits = '{}' then 'approved' else 'edited_approved' end,
            case when p_decision = 'rejected' then p_reason end, p_note, nullif(v_edits, '{}'), v_item.run_id, p_actor);
  return 'decided';
end $$;

-- A held content item: released (back to passed) or removed. The row is never deleted.
create function bestie.decide_content(p_actor uuid, p_content uuid, p_decision text, p_note text) returns text
  language plpgsql security invoker set search_path = '' as $$
declare
  v_screen text;
begin
  if p_decision not in ('released', 'removed') then
    raise exception 'decide_content: unknown decision %', p_decision;
  end if;
  select screen into v_screen from bestie.content_items where id = p_content for update;
  if not found then return 'notFound'; end if;
  if v_screen <> 'held' then return 'notHeld'; end if;
  update bestie.content_items set screen = case when p_decision = 'released' then 'passed' else 'removed' end, updated_at = now()
    where id = p_content;
  insert into bestie.catalogue_reviews (target, content_item_id, decision, note, decided_by)
    values ('content', p_content, p_decision, p_note, p_actor);
  return 'decided';
end $$;

-- Undo a finished run: reject its pending finds as bad_run, then put back each change it applied,
-- newest first, but only where the field still holds what the run wrote. Fields changed since are listed in skipped.
create function bestie.undo_catalogue_run(p_actor uuid, p_run uuid) returns jsonb
  language plpgsql security invoker set search_path = '' as $$
declare
  v_status text;
  v_n int;
  v_rejected int := 0;
  v_restored int := 0;
  v_skipped jsonb := '[]';
  v_paired bigint[] := '{}';
  v_ok boolean;
  c bestie.catalogue_changes;
  v_pair bestie.catalogue_changes;
  v_min bestie.catalogue_changes;
  v_max bestie.catalogue_changes;
begin
  -- for no key update: it serializes undo against undo but not against the key-share lock every
  -- insert or update referencing this run takes (review rows, places), so a decision holding a place
  -- never waits on the run while undo waits on that place.
  select status into v_status from bestie.catalogue_runs where id = p_run for no key update;
  if not found or v_status in ('undone', 'running') then
    return jsonb_build_object(
      'result', case when v_status = 'undone' then 'alreadyUndone' when v_status = 'running' then 'stillRunning' else 'notFound' end,
      'rejected', 0, 'restored', 0, 'skipped', '[]'::jsonb);
  end if;

  -- Lock order, the same in every function here: place before its activities (the run row, held
  -- no key update, blocks only another undo). So after the run, lock
  -- every place this undo will touch, in id order: its pending places, the places of its pending
  -- activities, and the places its changes name. Only then are activities and events updated.
  perform 1 from bestie.places
    where id in (select id from bestie.places where run_id = p_run and status = 'pending'
                 union select place_id from bestie.place_activities where run_id = p_run and status = 'pending'
                 union select place_id from bestie.catalogue_changes where run_id = p_run)
    order by id for update;

  with r as (
    update bestie.places set status = 'rejected', reviewed_at = now(), reviewed_by = p_actor, updated_at = now()
      where run_id = p_run and status = 'pending' returning id)
  insert into bestie.catalogue_reviews (target, place_id, decision, reason, run_id, decided_by)
    select 'place', id, 'rejected', 'bad_run', p_run, p_actor from r;
  get diagnostics v_n = row_count;
  v_rejected := v_rejected + v_n;

  with r as (
    update bestie.place_activities set status = 'rejected', updated_at = now()
      where run_id = p_run and status = 'pending' returning place_id, catalogue_item_id)
  insert into bestie.catalogue_reviews (target, place_id, catalogue_item_id, decision, reason, run_id, decided_by)
    select 'place_activity', place_id, catalogue_item_id, 'rejected', 'bad_run', p_run, p_actor from r;
  get diagnostics v_n = row_count;
  v_rejected := v_rejected + v_n;

  with r as (
    update bestie.catalogue_items set status = 'rejected', updated_at = now()
      where run_id = p_run and status = 'pending' returning id)
  insert into bestie.catalogue_reviews (target, catalogue_item_id, decision, reason, run_id, decided_by)
    select 'event', id, 'rejected', 'bad_run', p_run, p_actor from r;
  get diagnostics v_n = row_count;
  v_rejected := v_rejected + v_n;

  -- One case on field, no dynamic SQL. Each restore matches only while the field still equals
  -- the run's new_value (compared as jsonb); otherwise nothing is found and the change is skipped.
  -- The two price bounds of one (place, item) changed by this run go back as a pair: both only when
  -- both still hold what the run wrote, else both are skipped. Each restore runs in its own block, so
  -- one that would break a check (min above max, approved with no position) is skipped and the rest
  -- go ahead. These blocks take no new locks out of order: every place is already locked above.
  for c in select * from bestie.catalogue_changes where run_id = p_run order by id desc loop
    continue when c.id = any(v_paired);
    v_pair := null;
    if c.field in ('price_min_aed', 'price_max_aed') then
      select * into v_pair from bestie.catalogue_changes
        where run_id = p_run and place_id = c.place_id and catalogue_item_id = c.catalogue_item_id
          and field = case c.field when 'price_min_aed' then 'price_max_aed' else 'price_min_aed' end
          and not (id = any(v_paired))
        order by id desc limit 1;
    end if;
    begin
      if v_pair.id is not null then
        v_paired := v_paired || v_pair.id;
        v_min := case when c.field = 'price_min_aed' then c else v_pair end;
        v_max := case when c.field = 'price_max_aed' then c else v_pair end;
        update bestie.place_activities set price_min_aed = (v_min.old_value #>> '{}')::numeric,
            price_max_aed = (v_max.old_value #>> '{}')::numeric, updated_at = now()
          where place_id = c.place_id and catalogue_item_id = c.catalogue_item_id
            and coalesce(to_jsonb(price_min_aed), 'null') = coalesce(v_min.new_value, 'null')
            and coalesce(to_jsonb(price_max_aed), 'null') = coalesce(v_max.new_value, 'null');
      else
        case c.field
          when 'name' then
            update bestie.places set name = c.old_value #>> '{}', updated_at = now()
              where id = c.place_id and coalesce(to_jsonb(name), 'null') = coalesce(c.new_value, 'null');
          when 'area' then
            update bestie.places set area = c.old_value #>> '{}', updated_at = now()
              where id = c.place_id and coalesce(to_jsonb(area), 'null') = coalesce(c.new_value, 'null');
          when 'website' then
            update bestie.places set website = c.old_value #>> '{}', updated_at = now()
              where id = c.place_id and coalesce(to_jsonb(website), 'null') = coalesce(c.new_value, 'null');
          when 'opening_hours' then
            update bestie.places set opening_hours = nullif(c.old_value, 'null'), updated_at = now()
              where id = c.place_id and coalesce(opening_hours, 'null') = coalesce(c.new_value, 'null');
          when 'status' then
            update bestie.places set status = c.old_value #>> '{}', updated_at = now()
              where id = c.place_id and coalesce(to_jsonb(status), 'null') = coalesce(c.new_value, 'null');
          when 'price_min_aed' then
            update bestie.place_activities set price_min_aed = (c.old_value #>> '{}')::numeric, updated_at = now()
              where place_id = c.place_id and catalogue_item_id = c.catalogue_item_id
                and coalesce(to_jsonb(price_min_aed), 'null') = coalesce(c.new_value, 'null');
          when 'price_max_aed' then
            update bestie.place_activities set price_max_aed = (c.old_value #>> '{}')::numeric, updated_at = now()
              where place_id = c.place_id and catalogue_item_id = c.catalogue_item_id
                and coalesce(to_jsonb(price_max_aed), 'null') = coalesce(c.new_value, 'null');
          when 'duration_min' then
            update bestie.place_activities set duration_min = (c.old_value #>> '{}')::integer, updated_at = now()
              where place_id = c.place_id and catalogue_item_id = c.catalogue_item_id
                and coalesce(to_jsonb(duration_min), 'null') = coalesce(c.new_value, 'null');
        end case;
      end if;
      v_ok := found;
    exception when check_violation or not_null_violation then
      v_ok := false;
    end;
    if v_ok then
      v_restored := v_restored + case when v_pair.id is not null then 2 else 1 end;
    else
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('change_id', c.id, 'field', c.field));
      if v_pair.id is not null then
        v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('change_id', v_pair.id, 'field', v_pair.field));
      end if;
    end if;
  end loop;

  update bestie.catalogue_runs set status = 'undone', undone_at = now(), undone_by = p_actor where id = p_run;
  return jsonb_build_object('result', 'undone', 'rejected', v_rejected, 'restored', v_restored, 'skipped', v_skipped);
end $$;

-- Locked: service_role only.
revoke execute on function
  bestie.catalogue_edits(jsonb, jsonb, text[]),
  bestie.decide_place(uuid, uuid, text, text, text, jsonb, jsonb),
  bestie.decide_place_activity(uuid, uuid, uuid, text, text, text, jsonb),
  bestie.decide_event(uuid, uuid, text, text, text, jsonb),
  bestie.decide_content(uuid, uuid, text, text),
  bestie.undo_catalogue_run(uuid, uuid)
  from public, anon, authenticated;
grant execute on function
  bestie.catalogue_edits(jsonb, jsonb, text[]),
  bestie.decide_place(uuid, uuid, text, text, text, jsonb, jsonb),
  bestie.decide_place_activity(uuid, uuid, uuid, text, text, text, jsonb),
  bestie.decide_event(uuid, uuid, text, text, text, jsonb),
  bestie.decide_content(uuid, uuid, text, text),
  bestie.undo_catalogue_run(uuid, uuid)
  to service_role;

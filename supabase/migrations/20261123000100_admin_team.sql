-- Admin piece 2 (Members + Team), Task 1.
-- Why: DEC-015 second lock. The Team (public.user_roles rows with role 'admin') is changed only by
-- the admin edge function, running as service_role. The first lock is that public.user_roles has RLS
-- on and no write policy (only the own-row read policy; the old "Only admins can manage user roles"
-- policy was dropped in 20261116000200). This migration adds the second lock: no write grants, so no
-- client can write roles even if a policy is ever added. Sign-up still works: handle_new_user is
-- security definer.
-- Also adds bestie.team_changes, an append-only record of who added or removed whom.

revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

create table bestie.team_changes (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  target_id uuid not null,
  target_email text not null,
  action text not null check (action in ('add','remove')),
  created_at timestamptz not null default now()
);

-- Append-only, like bestie.points. No foreign keys: the record must outlive deleted accounts.
create function bestie.team_changes_append_only() returns trigger
  language plpgsql set search_path = '' as $$
begin
  raise exception 'bestie.team_changes is append-only (% refused)', tg_op;
end $$;
revoke execute on function bestie.team_changes_append_only() from public, anon, authenticated, service_role;

create trigger team_changes_append_only before update or delete on bestie.team_changes
  for each row execute function bestie.team_changes_append_only();

-- The bestie schema revokes default privileges, so grant explicitly: service_role only.
revoke all on bestie.team_changes from public, anon, authenticated;
grant select, insert on bestie.team_changes to service_role;
grant usage on sequence bestie.team_changes_id_seq to service_role;

alter table bestie.team_changes enable row level security;
alter table bestie.team_changes force row level security;

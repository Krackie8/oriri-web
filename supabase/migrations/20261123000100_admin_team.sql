-- Admin piece 2 (Members + Team), Task 1.
-- Why: DEC-015 second lock. The Team (public.user_roles rows with role 'admin') is changed only by
-- the admin edge function, running as service_role. The "Only admins can manage user roles" policy
-- is the first lock; revoking the write privileges is the second, so no client can write roles
-- even if a policy is ever loosened. Sign-up still works: handle_new_user is security definer.
-- Also adds bestie.team_changes, an append-only record of who added or removed whom.

revoke insert, update, delete, truncate on public.user_roles from anon, authenticated;

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

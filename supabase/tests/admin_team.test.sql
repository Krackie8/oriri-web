-- Admin piece 2 (Members + Team), twin tests. Each part is its own begin ... rollback block that
-- seeds its own rows, so later tasks can append their own blocks to this file.
\set ON_ERROR_STOP 1
create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Part 1: grants, the user_roles lock and the append-only Team record.
begin;
select pg_temp.check(not has_table_privilege('authenticated','public.user_roles','insert'), 'authenticated cannot insert user_roles');
select pg_temp.check(not has_table_privilege('authenticated','public.user_roles','update'), 'authenticated cannot update user_roles');
select pg_temp.check(not has_table_privilege('authenticated','public.user_roles','delete'), 'authenticated cannot delete user_roles');
select pg_temp.check(not has_table_privilege('anon','public.user_roles','insert'), 'anon cannot insert user_roles');
select pg_temp.check(not has_table_privilege('anon','public.user_roles','update'), 'anon cannot update user_roles');
select pg_temp.check(not has_table_privilege('anon','public.user_roles','delete'), 'anon cannot delete user_roles');
select pg_temp.check(has_table_privilege('authenticated','public.user_roles','select'), 'authenticated can still select user_roles');

select pg_temp.check(has_table_privilege('service_role','bestie.team_changes','insert'), 'service_role can insert team_changes');
select pg_temp.check(has_table_privilege('service_role','bestie.team_changes','select'), 'service_role can select team_changes');
select pg_temp.check(not has_table_privilege('authenticated','bestie.team_changes','select'), 'authenticated cannot select team_changes');
select pg_temp.check(not has_table_privilege('authenticated','bestie.team_changes','insert'), 'authenticated cannot insert team_changes');
select pg_temp.check(not has_table_privilege('anon','bestie.team_changes','select'), 'anon cannot select team_changes');

-- The sign-up trigger (handle_new_user, security definer) still writes the 'user' role.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000b0001', 'signup@example.test');
select pg_temp.check((select count(*) from public.user_roles
  where user_id = '00000000-0000-0000-0000-0000000b0001' and role = 'user') = 1, 'sign-up still creates the user role');

set local role service_role;
insert into bestie.team_changes (actor_id, target_id, target_email, action)
  values ('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-0000000b0002', 'target@example.test', 'add');
select pg_temp.check((select count(*) from bestie.team_changes where target_email = 'target@example.test') = 1, 'service_role can insert and read a team change');

-- service_role has no update or delete privilege at all (grants are select, insert only).
select pg_temp.check(not has_table_privilege('service_role','bestie.team_changes','update'), 'service_role cannot update team_changes');
select pg_temp.check(not has_table_privilege('service_role','bestie.team_changes','delete'), 'service_role cannot delete team_changes');
reset role;

-- The trigger is the backstop for any role that does hold the privilege (here the table owner).
do $$ begin
  begin
    update bestie.team_changes set action = 'remove';
    raise exception 'update was allowed';
  exception when others then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;
  begin
    delete from bestie.team_changes;
    raise exception 'delete was allowed';
  exception when others then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;
  raise notice 'ok - team_changes refuses update and delete';
end $$;
rollback;

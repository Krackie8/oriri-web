-- #68: clear out the old podcast tables and fix the two flagged security functions.
-- All 9 tables held 0 rows on 2026-11-16 and no app code reads them (only kv_store_a278ea32
-- is used). Refuse to run if that has changed.
do $$
declare t text; n bigint;
begin
  foreach t in array array['episodes','live_sessions','community_posts','store_items','episode_interactions',
                           'post_interactions','orders','order_items','tips'] loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then
      raise exception 'refusing to drop public.%: it has % rows', t, n;
    end if;
  end loop;
end $$;

-- No CASCADE: if anything unexpected depends on these tables, the drop fails instead.
drop table public.order_items;
drop table public.orders;
drop table public.tips;
drop table public.live_sessions;
drop table public.episode_interactions;
drop table public.episodes;
drop table public.post_interactions;
drop table public.community_posts;
drop table public.store_items;

-- Enum types that only those tables used. app_role stays (user_roles uses it).
drop type public.currency;
drop type public.episode_status;
drop type public.live_session_status;
drop type public.order_status;

-- handle_new_user is the auth sign-up trigger; has_role is a role check. Neither should be
-- callable through the API. Triggers do not need EXECUTE for the inserting role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;

-- user_roles' policies called has_role as the requesting user, which would now error.
-- A Member reads only her own role; admin work goes through the edge function (service_role).
drop policy "User roles viewable by user and admins" on public.user_roles;
drop policy "Only admins can manage user roles" on public.user_roles;
create policy "User roles viewable by their user" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));

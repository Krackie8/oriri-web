-- Local twin only. Never applied to hosted.
-- Reproduces the hosted public schema (lemtlurqzmjdahbhunhz) as read from its catalog on
-- 2026-11-16, so the migrations are proved against the same starting point.
create type public.app_role as enum ('admin','vip','user');
create type public.currency as enum ('USD','EUR','GBP');
create type public.episode_status as enum ('draft','published','archived');
create type public.live_session_status as enum ('scheduled','live','ended');
create type public.order_status as enum ('pending','processing','shipped','delivered','cancelled');

create table public.kv_store_a278ea32 (key text primary key, value jsonb not null);
create table public.profiles (id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade, display_name text, avatar_url text, bio text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null default 'user', expires_at timestamptz, created_at timestamptz not null default now(), unique (user_id, role));
create table public.episodes (id uuid primary key default gen_random_uuid(), title text not null, description text, audio_url text, duration integer, episode_number integer, season_number integer default 1, thumbnail_url text, spotify_url text, apple_podcast_url text, youtube_url text, is_vip_only boolean default false, status public.episode_status default 'draft', published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.live_sessions (id uuid primary key default gen_random_uuid(), title text not null, description text, thumbnail_url text, scheduled_for timestamptz, started_at timestamptz, ended_at timestamptz, status public.live_session_status default 'scheduled', viewer_count integer default 0, is_vip_only boolean default false, stream_key text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.community_posts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, title text, content text not null, image_url text, reply_to_id uuid references public.community_posts(id) on delete cascade, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.store_items (id uuid primary key default gen_random_uuid(), name text not null, description text, price numeric(10,2) not null, currency public.currency default 'USD', image_urls text[] default '{}', category text, sizes text[] default '{}', colors text[] default '{}', stock_quantity integer default 0, is_active boolean default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.episode_interactions (id uuid primary key default gen_random_uuid(), episode_id uuid not null references public.episodes(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, interaction_type text check (interaction_type = any (array['like','view','share','comment'])), comment_text text, created_at timestamptz not null default now());
create table public.post_interactions (id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, interaction_type text not null check (interaction_type = any (array['like','share'])), created_at timestamptz not null default now(), unique (post_id, user_id, interaction_type));
create table public.orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, total_amount numeric(10,2) not null, currency public.currency default 'USD', status public.order_status default 'pending', shipping_address jsonb, stripe_payment_intent_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, store_item_id uuid not null references public.store_items(id) on delete cascade, quantity integer not null default 1, price numeric(10,2) not null, size text, color text, created_at timestamptz not null default now());
create table public.tips (id uuid primary key default gen_random_uuid(), from_user_id uuid not null references auth.users(id) on delete cascade, amount numeric(10,2) not null, currency public.currency default 'USD', message text, live_session_id uuid references public.live_sessions(id) on delete cascade, stripe_payment_intent_id text, created_at timestamptz not null default now());

do $$ declare t text; begin
  foreach t in array array['kv_store_a278ea32','profiles','user_roles','episodes','live_sessions','community_posts','store_items','episode_interactions','post_interactions','orders','order_items','tips'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop; end $$;

create function public.update_updated_at_column() returns trigger language plpgsql set search_path to 'public' as $$
begin new.updated_at = now(); return new; end; $$;

create function public.has_role(_user_id uuid, _role public.app_role) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role and (expires_at is null or expires_at > now()))
$$;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.profiles (user_id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

-- Hosted ACL on all three functions: PUBLIC, anon, authenticated, service_role all have EXECUTE.
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger update_community_posts_updated_at before update on public.community_posts for each row execute function public.update_updated_at_column();
create trigger update_episodes_updated_at before update on public.episodes for each row execute function public.update_updated_at_column();
create trigger update_live_sessions_updated_at before update on public.live_sessions for each row execute function public.update_updated_at_column();
create trigger update_orders_updated_at before update on public.orders for each row execute function public.update_updated_at_column();
create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger update_store_items_updated_at before update on public.store_items for each row execute function public.update_updated_at_column();

create policy "Admins can view all order items" on public.order_items for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can view all orders" on public.orders for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can view all tips" on public.tips for select using (public.has_role(auth.uid(), 'admin'));
create policy "Live sessions viewable by appropriate users" on public.live_sessions for select using ((not is_vip_only) or public.has_role(auth.uid(), 'vip') or public.has_role(auth.uid(), 'admin'));
create policy "Only admins can manage episodes" on public.episodes for all using (public.has_role(auth.uid(), 'admin'));
create policy "Only admins can manage live sessions" on public.live_sessions for all using (public.has_role(auth.uid(), 'admin'));
create policy "Only admins can manage store items" on public.store_items for all using (public.has_role(auth.uid(), 'admin'));
create policy "Only admins can manage user roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));
create policy "Published episodes viewable by all" on public.episodes for select using ((status = 'published') and ((not is_vip_only) or public.has_role(auth.uid(), 'vip') or public.has_role(auth.uid(), 'admin')));
create policy "Store items viewable by everyone" on public.store_items for select using (is_active = true);
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "User roles viewable by user and admins" on public.user_roles for select using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'));
create policy "Community posts viewable by authenticated users" on public.community_posts for select to authenticated using (true);
create policy "Users can create community posts" on public.community_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete their own posts or admins can delete any" on public.community_posts for delete to authenticated using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'));
create policy "Users can update their own posts" on public.community_posts for update to authenticated using (auth.uid() = user_id);
create policy "Users can create their own interactions" on public.episode_interactions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete their own interactions" on public.episode_interactions for delete to authenticated using (auth.uid() = user_id);
create policy "Users can update their own interactions" on public.episode_interactions for update to authenticated using (auth.uid() = user_id);
create policy "Users can view episode interactions" on public.episode_interactions for select to authenticated using (true);
create policy "Users can create their own interactions" on public.post_interactions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete their own interactions" on public.post_interactions for delete to authenticated using (auth.uid() = user_id);
create policy "Users can view post interactions" on public.post_interactions for select to authenticated using (true);
create policy "Users can create their own orders" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own orders" on public.orders for update to authenticated using (auth.uid() = user_id);
create policy "Users can view their own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "Users can create order items for their orders" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "Users can view order items for their orders" on public.order_items for select to authenticated using (exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "Users can create tips" on public.tips for insert to authenticated with check (auth.uid() = from_user_id);
create policy "Users can view tips they sent" on public.tips for select to authenticated using (auth.uid() = from_user_id);

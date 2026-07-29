-- AutoDBLegends: optional cloud sync schema.
--
-- Two kinds of tables:
--  1. Public read-only cache (characters/events/banners) written by the
--     scraper (apps/scraper) using the service role key.
--  2. Per-user tables (user_inventory/user_teams), protected by RLS so a
--     signed-in user can only ever see/write their own rows. Anonymous
--     users never touch these tables -- they stay entirely in
--     localStorage, matching "no registration required".

-- ---------------------------------------------------------------------
-- Public cache tables
-- ---------------------------------------------------------------------

create table if not exists public.characters (
  id integer primary key,
  name text not null,
  card text not null,
  rarity text not null,
  element text not null,
  color text not null,
  img text not null,
  is_zenkai boolean not null default false,
  is_legends_limited boolean not null default false,
  stats_max jsonb not null,
  stats_min jsonb not null,
  tags text[] not null default '{}',
  traits text[] not null default '{}',
  leader_skill jsonb,
  main_ability jsonb,
  z_abilities jsonb not null default '[]',
  release_order integer not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint primary key,
  name text not null,
  img text,
  begins_at timestamptz not null,
  ends_at timestamptz not null,
  is_permanent boolean not null default false,
  status text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id bigint primary key,
  name text not null,
  img text,
  type text not null,
  begins_at timestamptz not null,
  ends_at timestamptz not null,
  is_permanent boolean not null default false,
  is_step_up boolean not null default false,
  guessed_featured_character_names text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.characters enable row level security;
alter table public.events enable row level security;
alter table public.banners enable row level security;

create policy "characters are publicly readable" on public.characters
  for select using (true);
create policy "events are publicly readable" on public.events
  for select using (true);
create policy "banners are publicly readable" on public.banners
  for select using (true);

-- Only the scraper (service role key, which bypasses RLS) writes to these
-- tables, so no insert/update/delete policy is granted to anon/authenticated.

-- ---------------------------------------------------------------------
-- Per-user tables (optional cloud sync)
-- ---------------------------------------------------------------------

create table if not exists public.user_inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id integer not null,
  stars smallint not null check (stars between 0 and 7),
  level integer not null default 1,
  is_z_awakened boolean not null default false,
  copies integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

create table if not exists public.user_teams (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('pvp', 'event', 'raid')),
  slots jsonb not null,
  support_item_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_inventory enable row level security;
alter table public.user_teams enable row level security;

create policy "users manage their own inventory" on public.user_inventory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own teams" on public.user_teams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists user_inventory_user_id_idx on public.user_inventory (user_id);
create index if not exists user_teams_user_id_idx on public.user_teams (user_id);

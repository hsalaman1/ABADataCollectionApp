-- ABA Data Collection App — initial Supabase schema
--
-- Run this once in the Supabase SQL editor (or via the Supabase CLI) to create
-- the tables and row-level security policies used by the app.
--
-- Tables:
--   clients                  -- one row per client, owned by an auth.users row
--   sessions                 -- one row per session; behaviorData stored as JSONB
--   treatment_plans          -- optional treatment plan metadata
--   treatment_goals          -- optional treatment goals
--   behavior_definitions     -- optional FBA-style behavior definitions
--   parent_training_programs -- optional parent training programs
--
-- Every row is scoped to auth.uid() via a user_id column and RLS.

-- ---------- clients ----------
create table if not exists public.clients (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth text,
  phone text,
  address text,
  location text,
  target_behaviors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_user_id_idx on public.clients(user_id);

alter table public.clients enable row level security;

create policy "clients select own" on public.clients
  for select using (auth.uid() = user_id);
create policy "clients insert own" on public.clients
  for insert with check (auth.uid() = user_id);
create policy "clients update own" on public.clients
  for update using (auth.uid() = user_id);
create policy "clients delete own" on public.clients
  for delete using (auth.uid() = user_id);

-- ---------- sessions ----------
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  client_name text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_ms bigint,
  behavior_data jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_client_id_idx on public.sessions(client_id);
create index if not exists sessions_start_time_idx on public.sessions(start_time desc);

alter table public.sessions enable row level security;

create policy "sessions select own" on public.sessions
  for select using (auth.uid() = user_id);
create policy "sessions insert own" on public.sessions
  for insert with check (auth.uid() = user_id);
create policy "sessions update own" on public.sessions
  for update using (auth.uid() = user_id);
create policy "sessions delete own" on public.sessions
  for delete using (auth.uid() = user_id);

-- ---------- treatment_plans ----------
create table if not exists public.treatment_plans (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists treatment_plans_user_id_idx on public.treatment_plans(user_id);
create index if not exists treatment_plans_client_id_idx on public.treatment_plans(client_id);
alter table public.treatment_plans enable row level security;
create policy "treatment_plans select own" on public.treatment_plans
  for select using (auth.uid() = user_id);
create policy "treatment_plans insert own" on public.treatment_plans
  for insert with check (auth.uid() = user_id);
create policy "treatment_plans update own" on public.treatment_plans
  for update using (auth.uid() = user_id);
create policy "treatment_plans delete own" on public.treatment_plans
  for delete using (auth.uid() = user_id);

-- ---------- treatment_goals ----------
create table if not exists public.treatment_goals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists treatment_goals_user_id_idx on public.treatment_goals(user_id);
create index if not exists treatment_goals_client_id_idx on public.treatment_goals(client_id);
alter table public.treatment_goals enable row level security;
create policy "treatment_goals select own" on public.treatment_goals
  for select using (auth.uid() = user_id);
create policy "treatment_goals insert own" on public.treatment_goals
  for insert with check (auth.uid() = user_id);
create policy "treatment_goals update own" on public.treatment_goals
  for update using (auth.uid() = user_id);
create policy "treatment_goals delete own" on public.treatment_goals
  for delete using (auth.uid() = user_id);

-- ---------- behavior_definitions ----------
create table if not exists public.behavior_definitions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists behavior_definitions_user_id_idx on public.behavior_definitions(user_id);
create index if not exists behavior_definitions_client_id_idx on public.behavior_definitions(client_id);
alter table public.behavior_definitions enable row level security;
create policy "behavior_definitions select own" on public.behavior_definitions
  for select using (auth.uid() = user_id);
create policy "behavior_definitions insert own" on public.behavior_definitions
  for insert with check (auth.uid() = user_id);
create policy "behavior_definitions update own" on public.behavior_definitions
  for update using (auth.uid() = user_id);
create policy "behavior_definitions delete own" on public.behavior_definitions
  for delete using (auth.uid() = user_id);

-- ---------- parent_training_programs ----------
create table if not exists public.parent_training_programs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists parent_training_programs_user_id_idx on public.parent_training_programs(user_id);
create index if not exists parent_training_programs_client_id_idx on public.parent_training_programs(client_id);
alter table public.parent_training_programs enable row level security;
create policy "parent_training_programs select own" on public.parent_training_programs
  for select using (auth.uid() = user_id);
create policy "parent_training_programs insert own" on public.parent_training_programs
  for insert with check (auth.uid() = user_id);
create policy "parent_training_programs update own" on public.parent_training_programs
  for update using (auth.uid() = user_id);
create policy "parent_training_programs delete own" on public.parent_training_programs
  for delete using (auth.uid() = user_id);

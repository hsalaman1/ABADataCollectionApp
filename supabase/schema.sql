-- ABA Data Collection App — Supabase Schema (Milestone 1)
-- Run this in Supabase SQL Editor. Safe to re-run.

-- =========================================================================
-- CLIENTS
-- =========================================================================
create table if not exists public.clients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth text,
  phone text,
  address text,
  location text,
  target_behaviors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists clients_user_id_idx on public.clients(user_id);

-- =========================================================================
-- SESSIONS
-- =========================================================================
create table if not exists public.sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  client_name text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_ms bigint,
  behavior_data jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  is_deleted boolean not null default false,
  is_in_progress boolean not null default false,
  source text not null default 'live'
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_client_id_idx on public.sessions(client_id);

-- =========================================================================
-- TREATMENT PLANS
-- =========================================================================
create table if not exists public.treatment_plans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  data jsonb not null default '{}'::jsonb,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists treatment_plans_user_id_idx on public.treatment_plans(user_id);

-- =========================================================================
-- TREATMENT GOALS
-- =========================================================================
create table if not exists public.treatment_goals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  goal_id text,
  category text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists treatment_goals_user_id_idx on public.treatment_goals(user_id);

-- =========================================================================
-- BEHAVIOR DEFINITIONS
-- =========================================================================
create table if not exists public.behavior_definitions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  behavior_name text not null,
  behavior_type text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists behavior_definitions_user_id_idx on public.behavior_definitions(user_id);

-- =========================================================================
-- PARENT TRAINING PROGRAMS
-- =========================================================================
create table if not exists public.parent_training_programs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  program_id text,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  is_deleted boolean not null default false
);

create index if not exists parent_training_programs_user_id_idx on public.parent_training_programs(user_id);

-- =========================================================================
-- ROW LEVEL SECURITY — users can only read/write their own rows
-- =========================================================================
alter table public.clients enable row level security;
alter table public.sessions enable row level security;
alter table public.treatment_plans enable row level security;
alter table public.treatment_goals enable row level security;
alter table public.behavior_definitions enable row level security;
alter table public.parent_training_programs enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['clients','sessions','treatment_plans','treatment_goals','behavior_definitions','parent_training_programs']) loop
    execute format('drop policy if exists "own_rows_select" on public.%I', t);
    execute format('drop policy if exists "own_rows_insert" on public.%I', t);
    execute format('drop policy if exists "own_rows_update" on public.%I', t);
    execute format('drop policy if exists "own_rows_delete" on public.%I', t);

    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

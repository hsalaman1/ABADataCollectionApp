-- ABA Data Collection App: initial schema for Supabase cloud sync
-- Mirrors the local Dexie schema. Nested arrays stored as JSONB to avoid
-- maintaining parallel relational tables for each behavior session.
-- Every row is scoped to one therapist via owner_id + RLS.

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists clients (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date_of_birth date,
  phone text,
  address text,
  location text,
  target_behaviors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists sessions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  client_name text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_ms bigint,
  behavior_data jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists treatment_plans (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists treatment_goals (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists behavior_definitions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists parent_training_programs (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============================================================================
-- Indexes (used by the pull query: "rows updated since last sync")
-- ============================================================================

create index if not exists clients_owner_updated_idx
  on clients (owner_id, updated_at);
create index if not exists sessions_owner_updated_idx
  on sessions (owner_id, updated_at);
create index if not exists sessions_owner_client_idx
  on sessions (owner_id, client_id);
create index if not exists treatment_plans_owner_updated_idx
  on treatment_plans (owner_id, updated_at);
create index if not exists treatment_goals_owner_updated_idx
  on treatment_goals (owner_id, updated_at);
create index if not exists behavior_definitions_owner_updated_idx
  on behavior_definitions (owner_id, updated_at);
create index if not exists parent_training_programs_owner_updated_idx
  on parent_training_programs (owner_id, updated_at);

-- ============================================================================
-- Row-level security: a user can only see/modify their own rows.
-- ============================================================================

alter table clients                    enable row level security;
alter table sessions                   enable row level security;
alter table treatment_plans            enable row level security;
alter table treatment_goals            enable row level security;
alter table behavior_definitions       enable row level security;
alter table parent_training_programs   enable row level security;

create policy clients_owner_rw on clients
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy sessions_owner_rw on sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy treatment_plans_owner_rw on treatment_plans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy treatment_goals_owner_rw on treatment_goals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy behavior_definitions_owner_rw on behavior_definitions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy parent_training_programs_owner_rw on parent_training_programs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

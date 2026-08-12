-- DayPilot initial schema
-- Paste this whole file into the Supabase SQL editor (SQL Editor > New query) and run it.
-- Safe to re-run: tables/indexes use IF NOT EXISTS and policies are dropped before recreation.

create extension if not exists pgcrypto;

-- ============================================================================
-- profiles — one row per user, keyed directly by auth.users.id
-- ============================================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  daily_capacity_minutes integer not null default 300,
  wake_time time,
  sleep_time time,
  ai_provider text not null default 'gemini',
  ai_api_key text, -- the user's own key; RLS keeps this row readable only by them
  dark_mode boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_access" on public.profiles;
create policy "profiles_owner_access" on public.profiles
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================================
-- subjects
-- ============================================================================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  code text,
  proficiency smallint check (proficiency between 1 and 5),
  notes text,
  is_active boolean not null default true
);

alter table public.subjects enable row level security;

drop policy if exists "subjects_owner_access" on public.subjects;
create policy "subjects_owner_access" on public.subjects
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_subjects_user_id on public.subjects (user_id);

-- ============================================================================
-- timetable_blocks — fixed weekly classes
-- ============================================================================
create table if not exists public.timetable_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  location text,
  -- nullable; shape when present: { minutes, description, preferred_window }
  prep_rule jsonb
);

alter table public.timetable_blocks enable row level security;

drop policy if exists "timetable_blocks_owner_access" on public.timetable_blocks;
create policy "timetable_blocks_owner_access" on public.timetable_blocks
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_timetable_blocks_user_id on public.timetable_blocks (user_id);
create index if not exists idx_timetable_blocks_user_day on public.timetable_blocks (user_id, day_of_week);

-- ============================================================================
-- sessions — individual class sessions (e.g. "Session 4: negotiation case")
-- ============================================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  session_number integer,
  title text not null,
  topics text[],
  scheduled_date date not null,
  reading_material text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'prepped', 'attended', 'missed')),
  source_document_id uuid -- FK added below, once public.documents exists
);

alter table public.sessions enable row level security;

drop policy if exists "sessions_owner_access" on public.sessions;
create policy "sessions_owner_access" on public.sessions
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_sessions_user_id on public.sessions (user_id);
create index if not exists idx_sessions_user_scheduled_date on public.sessions (user_id, scheduled_date);

-- ============================================================================
-- tasks
-- ============================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null check (
    type in (
      'class-prep', 'quiz-exam', 'assignment', 'application',
      'competition', 'self-dev', 'personal', 'errand'
    )
  ),
  subject_id uuid references public.subjects (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  due_date date,
  due_time time,
  estimated_minutes integer,
  priority smallint check (priority between 1 and 3),
  status text not null default 'open' check (status in ('open', 'done', 'deferred')),
  snooze_count integer not null default 0,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'quick-add', 'document')),
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "tasks_owner_access" on public.tasks;
create policy "tasks_owner_access" on public.tasks
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_tasks_user_due_date on public.tasks (user_id, due_date);

-- ============================================================================
-- recurring_activities — sport, hobbies, health, social commitments
-- ============================================================================
create table if not exists public.recurring_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null check (category in ('sport', 'hobby', 'health', 'social', 'other')),
  day_of_week smallint check (day_of_week between 0 and 6),
  preferred_time time,
  duration_minutes integer,
  frequency_per_week integer,
  is_flexible boolean not null default false,
  notes text
);

alter table public.recurring_activities enable row level security;

drop policy if exists "recurring_activities_owner_access" on public.recurring_activities;
create policy "recurring_activities_owner_access" on public.recurring_activities
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_recurring_activities_user_id on public.recurring_activities (user_id);
create index if not exists idx_recurring_activities_user_day on public.recurring_activities (user_id, day_of_week);

-- ============================================================================
-- competitions
-- ============================================================================
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  organiser text,
  stage text,
  deadline_date date,
  deadline_time time,
  effort_estimate_minutes integer,
  status text not null default 'interested'
    check (status in ('interested', 'registered', 'in-progress', 'submitted', 'closed')),
  notes text
);

alter table public.competitions enable row level security;

drop policy if exists "competitions_owner_access" on public.competitions;
create policy "competitions_owner_access" on public.competitions
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_competitions_user_id on public.competitions (user_id);
create index if not exists idx_competitions_user_deadline_date on public.competitions (user_id, deadline_date);

-- ============================================================================
-- goals
-- ============================================================================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  horizon text not null check (horizon in ('30', '60', '90', 'major')),
  weekly_target_minutes integer not null,
  notes text
);

alter table public.goals enable row level security;

drop policy if exists "goals_owner_access" on public.goals;
create policy "goals_owner_access" on public.goals
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_goals_user_id on public.goals (user_id);

-- ============================================================================
-- goal_progress — one row per goal per week
-- ============================================================================
create table if not exists public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  week_start_date date not null,
  minutes_logged integer not null default 0,
  unique (goal_id, week_start_date)
);

alter table public.goal_progress enable row level security;

drop policy if exists "goal_progress_owner_access" on public.goal_progress;
create policy "goal_progress_owner_access" on public.goal_progress
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_goal_progress_user_id on public.goal_progress (user_id);
create index if not exists idx_goal_progress_user_week on public.goal_progress (user_id, week_start_date);

-- ============================================================================
-- daily_plans — one AI-generated plan per user per day
-- ============================================================================
create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  blocks jsonb not null default '[]'::jsonb,
  deferred jsonb not null default '[]'::jsonb,
  note text not null default '',
  generated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

alter table public.daily_plans enable row level security;

drop policy if exists "daily_plans_owner_access" on public.daily_plans;
create policy "daily_plans_owner_access" on public.daily_plans
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- the unique (user_id, plan_date) constraint above already indexes this lookup

-- ============================================================================
-- task_history — planned-vs-actual minutes, for calibrating future estimates
-- ============================================================================
create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  task_type text not null check (
    task_type in (
      'class-prep', 'quiz-exam', 'assignment', 'application',
      'competition', 'self-dev', 'personal', 'errand'
    )
  ),
  subject_id uuid references public.subjects (id) on delete set null,
  planned_minutes integer not null,
  actual_minutes integer not null,
  completed_date date not null
);

alter table public.task_history enable row level security;

drop policy if exists "task_history_owner_access" on public.task_history;
create policy "task_history_owner_access" on public.task_history
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_task_history_user_id on public.task_history (user_id);
create index if not exists idx_task_history_user_completed_date on public.task_history (user_id, completed_date);

-- ============================================================================
-- documents — uploaded files (timetables, syllabi, etc.) awaiting/after AI extraction
-- ============================================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_type text,
  storage_path text not null,
  doc_kind text not null default 'other'
    check (doc_kind in ('timetable', 'session-list', 'syllabus', 'poster', 'other')),
  extracted_json jsonb,
  status text not null default 'uploaded' check (status in ('uploaded', 'extracted', 'confirmed')),
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists "documents_owner_access" on public.documents;
create policy "documents_owner_access" on public.documents
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_documents_user_id on public.documents (user_id);

-- ============================================================================
-- deferred foreign key: sessions.source_document_id -> documents.id
-- (added here, once public.documents exists, since sessions is defined earlier)
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_source_document_id_fkey'
  ) then
    alter table public.sessions
      add constraint sessions_source_document_id_fkey
      foreign key (source_document_id) references public.documents (id) on delete set null;
  end if;
end $$;

create index if not exists idx_sessions_source_document_id on public.sessions (source_document_id);

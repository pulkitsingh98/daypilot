-- ============================================================================
-- class_occurrences — per-date status for a specific occurrence of a
-- recurring class (done / postponed / cancelled)
-- ============================================================================
-- timetable_blocks is a recurring weekly pattern with no concept of "this
-- Monday specifically got moved" — a class occurrence needs its own status
-- independent of whether a daily_plans row exists for that date (Timetable's
-- Upcoming list shows future days that may never get an AI plan generated).
-- Absence of a row = the default "scheduled, not yet marked" state.
create table if not exists public.class_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  timetable_block_id uuid not null references public.timetable_blocks (id) on delete cascade,
  occurrence_date date not null,
  status text not null check (status in ('done', 'postponed', 'cancelled')),
  unique (timetable_block_id, occurrence_date)
);

alter table public.class_occurrences enable row level security;

drop policy if exists "class_occurrences_owner_access" on public.class_occurrences;
create policy "class_occurrences_owner_access" on public.class_occurrences
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists idx_class_occurrences_user_id on public.class_occurrences (user_id);
create index if not exists idx_class_occurrences_block_date on public.class_occurrences (timetable_block_id, occurrence_date);

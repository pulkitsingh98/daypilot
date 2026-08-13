-- ============================================================================
-- user_feedback — freeform notes captured alongside destructive actions
-- (e.g. "Clear to-do list"), so what a user wanted different doesn't just
-- vanish when they wipe the data. Write-only from the app's perspective —
-- no select policy, since the point is for the project owner to review it
-- directly in the Supabase dashboard/SQL editor, not to read it back in-app.
-- ============================================================================
create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  context text not null default 'general',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_owner_insert" on public.user_feedback;
create policy "user_feedback_owner_insert" on public.user_feedback
  for insert
  with check ((select auth.uid()) = user_id);

create index if not exists idx_user_feedback_user_id on public.user_feedback (user_id);

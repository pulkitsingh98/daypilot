-- ============================================================================
-- tasks — record exactly when a task was marked done
-- ============================================================================
-- Without this, the app can only see a task's CURRENT status, not which day
-- it was actually completed on — which makes it impossible to accurately
-- show "was this done on day D" for a past day once a task has been carried
-- forward across several re-planned days. completed_at is set when status
-- flips to 'done' and cleared if it's reverted, by the app (no DB trigger).
alter table public.tasks
  add column if not exists completed_at timestamptz;

create index if not exists idx_tasks_user_completed_at on public.tasks (user_id, completed_at);

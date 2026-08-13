-- ============================================================================
-- daily_plans.reasoning — a few sentences from the AI on its overall
-- thinking for the day's plan (what got priority and why, what got trimmed
-- and why), distinct from the existing one-line `note`. Shown on the Today
-- page so the plan's logic isn't just implicit in the block list.
-- ============================================================================
alter table public.daily_plans
  add column if not exists reasoning text not null default '';

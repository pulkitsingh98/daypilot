-- ============================================================================
-- daily_plans.plan_until — the far edge of the window a generated plan
-- actually covers. Plans are now a rolling 24 hours from ~1 hour after
-- generation rather than a fixed midnight-to-midnight day, so the app needs
-- to tell the user exactly when their to-do list stops being valid instead
-- of leaving it implicit. Nullable: plans generated before this existed
-- simply have none, and the UI treats that as "unknown" rather than guessing.
-- ============================================================================
alter table public.daily_plans
  add column if not exists plan_until timestamptz;

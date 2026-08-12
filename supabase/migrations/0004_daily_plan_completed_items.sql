-- ============================================================================
-- daily_plans — track completion for timeline items that have no linked task
-- ============================================================================
-- Task-linked blocks already have a completion signal (tasks.status), but
-- fixed classes and un-linked plan blocks (buffer, meals, prep with no task)
-- don't. completed_item_keys stores the TimelineItem.key ("class-<id>" or
-- "block-<index>-<start>") of anything struck off directly on the Today
-- timeline that isn't backed by a task row. Scoped to one daily_plans row
-- (one calendar day), so a recurring class's key only marks it done for
-- that specific day, not permanently.
alter table public.daily_plans
  add column if not exists completed_item_keys text[] not null default '{}';

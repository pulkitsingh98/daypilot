-- ============================================================================
-- Moodle calendar sync — lets a user paste their Moodle "Export calendar" ICS
-- URL (a per-user, token-authenticated link, sensitive like an API key) and
-- have its deadline/assignment events pulled into their existing to-do list
-- instead of a separate table. profiles gets the stored URL plus a
-- last-synced timestamp (drives the "refresh if 4+ hours stale" check on app
-- open); tasks gets a nullable source_uid carrying the ICS UID, so re-syncing
-- the same calendar upserts events in place rather than duplicating them, and
-- 'moodle' joins the existing source enum alongside manual/quick-add/document.
-- ============================================================================

alter table public.profiles
  add column moodle_ics_url text,
  add column moodle_last_synced_at timestamptz;

alter table public.tasks
  add column source_uid text;

-- NULL source_uid values are distinct from each other under a plain unique
-- constraint, so every non-Moodle task (the vast majority) is unaffected —
-- this only actually constrains rows that carry a real ICS UID.
alter table public.tasks
  add constraint tasks_user_source_uid_unique unique (user_id, source_uid);

alter table public.tasks
  drop constraint if exists tasks_source_check;

alter table public.tasks
  add constraint tasks_source_check
  check (source in ('manual', 'quick-add', 'document', 'moodle'));

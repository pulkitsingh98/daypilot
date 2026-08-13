-- ============================================================================
-- timetable_blocks uniqueness — this table never had a database-level
-- uniqueness guarantee at all, only an app-level "select before insert"
-- check in importExcelSessions. That's the exact pattern that already
-- failed once for sessions (migration 0009): safe only as long as every
-- code path stays sequential and never gets bypassed. Adds the same
-- protection here — first collapses any duplicate blocks already present
-- (keeping one per group), then constrains the table so it can't happen
-- again; importExcelSessions now upserts on this key instead of
-- select-then-insert.
-- ============================================================================

delete from public.timetable_blocks a
using public.timetable_blocks b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.day_of_week = b.day_of_week
  and a.start_time = b.start_time
  and a.end_time = b.end_time
  and a.subject_id is not distinct from b.subject_id;

alter table public.timetable_blocks
  add constraint timetable_blocks_user_subject_day_time_unique
  unique (user_id, subject_id, day_of_week, start_time, end_time);

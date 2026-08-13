-- ============================================================================
-- sessions.start_time / end_time — a session imported from a sheet or photo
-- knows the exact time slot it occupies, but that was previously discarded
-- after being used once to dedupe a timetable_blocks row at import time.
-- Without it, the Timetable page couldn't tell which of a subject's several
-- weekly time slots a given date's session actually belonged to whenever a
-- course reused the same slots across multiple weeks (a common pattern for
-- block schedules). Nullable: sessions created from a plain reading list
-- with no time info (e.g. document extraction) simply have neither.
-- ============================================================================
alter table public.sessions
  add column if not exists start_time time,
  add column if not exists end_time time;

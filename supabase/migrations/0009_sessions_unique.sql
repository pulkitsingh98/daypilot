-- ============================================================================
-- sessions uniqueness — importExcelSessions had no existence check before
-- inserting (unlike timetable_blocks, which already checked), so re-running
-- an Excel/document import without a full clear first silently duplicated
-- every session, sometimes several times over. First collapses any
-- duplicates already sitting in the table (keeping one row per group, since
-- which physical row survives doesn't matter — they're identical), then adds
-- a constraint so it can never happen again: future imports upsert on this
-- key instead of blindly inserting. Rows with a null session_number are left
-- alone — Postgres treats NULL as distinct from NULL in a unique constraint,
-- so this can't help those, but every session this app actually imports
-- carries a number.
-- ============================================================================

delete from public.sessions a
using public.sessions b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.subject_id = b.subject_id
  and a.scheduled_date = b.scheduled_date
  and a.session_number = b.session_number
  and a.session_number is not null;

alter table public.sessions
  add constraint sessions_user_subject_date_session_unique
  unique (user_id, subject_id, scheduled_date, session_number);

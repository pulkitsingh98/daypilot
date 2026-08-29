-- ============================================================================
-- class_occurrences.rescheduled_date — lets a postponed class carry an
-- explicit "it'll actually happen on this date instead" rather than only
-- the implicit rollover (its reading silently absorbed by whatever the
-- subject's next naturally-scheduled slot happens to be). Nullable: the
-- user may not know yet when a postponed class will actually happen, and
-- can add or change the date later without changing anything else about
-- the occurrence.
-- ============================================================================

alter table public.class_occurrences
  add column rescheduled_date date;

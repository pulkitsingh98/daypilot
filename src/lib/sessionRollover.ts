import type { ClassEntry } from '../data/timetableBlocks'
import type { UpcomingSession } from '../data/sessions'
import type { DayOfWeek } from '../data/types'
import { occurrenceKey, type ClassOccurrenceMap, type ClassOccurrenceStatus } from '../data/classOccurrences'
import { addDays, dayKeyForDate, toIsoDate, toMinutes } from './time'

export interface ClassOccurrence {
  entry: ClassEntry
  dateIso: string
  /** null = default "scheduled, not yet marked" state. */
  status: ClassOccurrenceStatus | null
  /** The session whose reading applies to this occurrence, if any — see buildUpcomingOccurrences for how this rolls forward past postponed/cancelled dates. */
  session: UpcomingSession | null
  /**
   * True when this occurrence's class entry couldn't be matched by exact
   * start time (the session has none, typically because it was imported
   * before sessions carried their own start_time) AND the subject had more
   * than one candidate time slot that day to choose from — so the shown
   * time is a positional guess, not a verified one. False/undefined
   * whenever there was only one possible slot anyway, since a guess among
   * one option isn't really a guess.
   */
  timeUncertain?: boolean
}

function groupClassesBySubjectAndDay(classes: ClassEntry[]): Map<string, Map<DayOfWeek, ClassEntry[]>> {
  const bySubject = new Map<string, Map<DayOfWeek, ClassEntry[]>>()
  for (const c of classes) {
    let byDay = bySubject.get(c.subject)
    if (!byDay) {
      byDay = new Map()
      bySubject.set(c.subject, byDay)
    }
    const list = byDay.get(c.day) ?? []
    list.push(c)
    byDay.set(c.day, list)
  }
  for (const byDay of bySubject.values()) {
    for (const list of byDay.values()) list.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  }
  return bySubject
}

/**
 * Builds the occurrence list for `daysAhead` days starting at `from`.
 *
 * A subject with real per-date sessions (the normal case for an Excel or
 * document import) gets one occurrence per session, pinned to that
 * session's own scheduled_date — never reconstructed by projecting a
 * weekly day/time pattern forward, which is what used to put occurrences
 * on the wrong date (or invent extra ones on weeks the class never
 * actually met) whenever a course's real meeting times didn't repeat on a
 * fixed weekly cadence. The matching timetable_block for display (start
 * time, location) is picked by exact start-time match on that weekday when
 * the session has one (the normal case), since a subject can reuse the same
 * handful of time slots across several different real dates — position
 * alone can't tell those apart. Only when a session has no recorded time
 * (e.g. a bare reading list from a photo/PDF) does it fall back to matching
 * by position among that weekday's blocks. Marking an occurrence postponed
 * or cancelled defers its session to the subject's next real occurrence in
 * the window, same rollover behavior as before.
 *
 * A subject with no session data at all (a manually added class, or a bare
 * timetable extraction with no reading list) still gets the classic weekly
 * projection, since that's the only information available for it.
 *
 * `sessions` here is typically today-forward only (fetchUpcomingSessions),
 * so a subject whose real sessions are all in the past looks identical to
 * one that never had session data — both are absent from it. Left alone,
 * that subject would fall into the weekly-projection fallback below and
 * keep "meeting" every week forever, long after its actual last session.
 * `sessionBackedSubjects` (all-time, unbounded by date — see
 * fetchSessionBackedSubjects) disambiguates the two: a subject in that set
 * has real session data somewhere, just not upcoming, so it's excluded
 * from the fallback and simply stops appearing once its sessions end,
 * instead of projecting a class that isn't really happening anymore.
 */
export function buildUpcomingOccurrences(
  classes: ClassEntry[],
  sessions: UpcomingSession[],
  occurrenceStatuses: ClassOccurrenceMap,
  from: Date,
  daysAhead: number,
  sessionBackedSubjects: ReadonlySet<string> = new Set(),
): ClassOccurrence[] {
  const classesBySubjectDay = groupClassesBySubjectAndDay(classes)

  const sessionsBySubject = new Map<string, UpcomingSession[]>()
  for (const s of sessions) {
    const list = sessionsBySubject.get(s.subject) ?? []
    list.push(s)
    sessionsBySubject.set(s.subject, list)
  }
  for (const list of sessionsBySubject.values()) {
    list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  }

  const occurrences: ClassOccurrence[] = []

  for (const [subject, subjectSessions] of sessionsBySubject) {
    const entryForSlot: (ClassEntry | null)[] = []
    const uncertainForSlot: boolean[] = []
    let i = 0
    while (i < subjectSessions.length) {
      const dateIso = subjectSessions[i].scheduledDate
      let j = i
      while (j < subjectSessions.length && subjectSessions[j].scheduledDate === dateIso) j++
      const dayKey = dayKeyForDate(new Date(`${dateIso}T00:00:00`))
      const candidates = classesBySubjectDay.get(subject)?.get(dayKey) ?? []
      for (let k = i; k < j; k++) {
        const wantedStart = subjectSessions[k].startTime
        const byTime = wantedStart ? candidates.find((c) => c.startTime === wantedStart) : undefined
        entryForSlot.push(byTime ?? candidates[k - i] ?? candidates[candidates.length - 1] ?? null)
        uncertainForSlot.push(!byTime && candidates.length > 1)
      }
      i = j
    }

    const queue = subjectSessions.slice()
    for (let p = 0; p < subjectSessions.length; p++) {
      const entry = entryForSlot[p]
      if (!entry) continue
      const dateIso = subjectSessions[p].scheduledDate
      const status = occurrenceStatuses.get(occurrenceKey(entry.id, dateIso)) ?? null
      let session: UpcomingSession | null = null
      if (status !== 'postponed' && status !== 'cancelled') {
        session = queue.shift() ?? null
      }
      occurrences.push({ entry, dateIso, status, session, timeUncertain: uncertainForSlot[p] })
    }
  }

  for (let d = 0; d < daysAhead; d++) {
    const date = addDays(from, d)
    const dateIso = toIsoDate(date)
    const dayKey = dayKeyForDate(date)
    const dayClasses = classes
      .filter((c) => c.day === dayKey && !sessionsBySubject.has(c.subject) && !sessionBackedSubjects.has(c.subject))
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))

    for (const entry of dayClasses) {
      const status = occurrenceStatuses.get(occurrenceKey(entry.id, dateIso)) ?? null
      occurrences.push({ entry, dateIso, status, session: null })
    }
  }

  occurrences.sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || toMinutes(a.entry.startTime) - toMinutes(b.entry.startTime),
  )
  return occurrences
}

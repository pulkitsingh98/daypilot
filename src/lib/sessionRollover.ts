import type { ClassEntry } from '../data/timetableBlocks'
import type { UpcomingSession } from '../data/sessions'
import { occurrenceKey, type ClassOccurrenceMap, type ClassOccurrenceStatus } from '../data/classOccurrences'
import { addDays, dayKeyForDate, toIsoDate, toMinutes } from './time'

export interface ClassOccurrence {
  entry: ClassEntry
  dateIso: string
  /** null = default "scheduled, not yet marked" state. */
  status: ClassOccurrenceStatus | null
  /** The session whose reading applies to this occurrence, if any — see buildUpcomingOccurrences for how this rolls forward past postponed/cancelled dates. */
  session: UpcomingSession | null
}

/**
 * Builds the day-by-day occurrence list for `daysAhead` days starting at
 * `from`. Each subject's sessions (already sorted earliest-first) are paired
 * against that subject's own occurrences IN ORDER, one session per
 * occurrence — except a postponed or cancelled occurrence consumes no
 * session at all, so the same reading rolls forward onto whichever date the
 * class next actually happens, instead of staying pinned to the session's
 * own scheduled_date once a class gets bumped.
 */
export function buildUpcomingOccurrences(
  classes: ClassEntry[],
  sessions: UpcomingSession[],
  occurrenceStatuses: ClassOccurrenceMap,
  from: Date,
  daysAhead: number,
): ClassOccurrence[] {
  const sessionsBySubject = new Map<string, UpcomingSession[]>()
  for (const s of sessions) {
    const list = sessionsBySubject.get(s.subject) ?? []
    list.push(s)
    sessionsBySubject.set(s.subject, list)
  }
  for (const list of sessionsBySubject.values()) {
    list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  }
  const sessionIndexBySubject = new Map<string, number>()

  const occurrences: ClassOccurrence[] = []

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(from, i)
    const dateIso = toIsoDate(date)
    const dayKey = dayKeyForDate(date)
    const dayClasses = classes
      .filter((c) => c.day === dayKey)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))

    for (const entry of dayClasses) {
      const status = occurrenceStatuses.get(occurrenceKey(entry.id, dateIso)) ?? null
      let session: UpcomingSession | null = null

      if (status !== 'postponed' && status !== 'cancelled') {
        const subjectSessions = sessionsBySubject.get(entry.subject) ?? []
        const idx = sessionIndexBySubject.get(entry.subject) ?? 0
        session = subjectSessions[idx] ?? null
        sessionIndexBySubject.set(entry.subject, idx + 1)
      }

      occurrences.push({ entry, dateIso, status, session })
    }
  }

  return occurrences
}

import type { ClassEntry } from '../data/timetableBlocks'
import type { TaskInput } from '../data/tasks'
import type { PrepRule } from '../data/types'
import { addDays, toIsoDate } from './time'

/** The first prep rule configured on any class for this subject, if any. */
export function findPrepRuleForSubject(subject: string, classes: ClassEntry[]): PrepRule | null {
  const trimmed = subject.trim().toLowerCase()
  if (!trimmed) return null
  const match = classes.find((c) => c.subject.trim().toLowerCase() === trimmed && c.prepRule)
  return match?.prepRule ?? null
}

export interface SessionForPrep {
  subject: string
  title: string
  /** "YYYY-MM-DD" */
  date: string
  readingMaterial: string
}

/**
 * A class-prep task due the day before the session, so reading actually
 * happens with time to spare. Uses the subject's configured prep rule for
 * how long and what window, when one exists; falls back to a plain 30
 * minutes otherwise.
 */
export function buildPrepTaskInput(session: SessionForPrep, prepRule: PrepRule | null): TaskInput {
  const dueDate = toIsoDate(addDays(new Date(`${session.date}T00:00:00`), -1))

  return {
    title: `Prep: ${session.title}`,
    subject: session.subject,
    type: 'class-prep',
    priority: 2,
    status: 'open',
    dueDate,
    estimatedMinutes: prepRule?.minutes ?? 30,
    notes: prepRule?.description ? `${session.readingMaterial} (${prepRule.description})` : session.readingMaterial,
    source: 'document',
  }
}

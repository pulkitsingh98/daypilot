import type { TaskType } from '../data/tasks'
import { normalizeDueDate, normalizeType } from './tsv'

export interface QuickAddPrepSession {
  date: string
  minutes: number
  title: string
}

export interface QuickAddResult {
  title: string
  type: TaskType
  subject: string
  dueDate: string
  estimatedMinutes: number
  suggestedPrepSessions: QuickAddPrepSession[]
}

function coerceString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function coerceMinutes(value: unknown, fallback: number): number {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback
}

/**
 * Coerces an AI JSON response into a safe QuickAddResult regardless of what
 * the model actually returned — missing fields, wrong types, malformed
 * dates, or a non-array prep-sessions field all fall back to sane defaults
 * instead of throwing or producing an unusable draft.
 */
export function normalizeQuickAddResult(raw: unknown, todayIso: string): QuickAddResult {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  const title = coerceString(obj.title, 'Untitled task')
  const type: TaskType = normalizeType(coerceString(obj.type, ''))
  const subject = coerceString(obj.subject, '')
  const dueDate = normalizeDueDate(coerceString(obj.dueDate, '')) ?? todayIso
  const estimatedMinutes = coerceMinutes(obj.estimatedMinutes, 30)

  const rawSessions = Array.isArray(obj.suggestedPrepSessions) ? obj.suggestedPrepSessions : []
  const suggestedPrepSessions: QuickAddPrepSession[] = rawSessions
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .slice(0, 5)
    .map((s) => ({
      date: normalizeDueDate(coerceString(s.date, '')) ?? dueDate,
      minutes: coerceMinutes(s.minutes, 30),
      title: coerceString(s.title, 'Prep session'),
    }))

  return { title, type, subject, dueDate, estimatedMinutes, suggestedPrepSessions }
}

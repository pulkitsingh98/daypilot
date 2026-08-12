import type { TaskPriority, TaskType } from '../data/tasks'
import { toIsoDate } from './time'

const HIGH_URGENCY_TYPES: TaskType[] = ['quiz-exam', 'competition', 'application']

/**
 * A defensible starting point for a mixed-extraction item's priority, shown
 * pre-selected in the review table — the user can accept it or change it.
 * Closer deadlines and higher-stakes types (exams, competitions,
 * applications) push priority up; no date at all falls back to type alone.
 */
export function suggestPriority(type: TaskType, date: string | null, now: Date = new Date()): TaskPriority {
  const urgent = HIGH_URGENCY_TYPES.includes(type)

  if (!date) return urgent ? 2 : 3

  const todayIso = toIsoDate(now)
  const [y1, m1, d1] = todayIso.split('-').map(Number)
  const [y2, m2, d2] = date.split('-').map(Number)
  const daysUntil = Math.round(
    (new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000,
  )

  if (daysUntil <= 3) return 1
  if (daysUntil <= 10) return urgent ? 1 : 2
  return urgent ? 2 : 3
}

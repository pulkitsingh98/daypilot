import type { Task } from '../data/tasks'
import { addDays, toIsoDate } from './time'

export type TaskBarStatus = 'on-track' | 'due-soon' | 'overdue'

export interface TaskBar {
  task: Task
  /** Day offset from the timeline's first day (0-indexed). */
  startOffset: number
  /** How many days wide the bar is, minimum 1 — grows past the original due date if the task is still open, which is the whole point: a task that keeps getting pushed visibly keeps extending. */
  spanDays: number
  status: TaskBarStatus
}

export interface TaskTimeline {
  totalDays: number
  dayLabels: { dateIso: string; label: string; isToday: boolean }[]
  bars: TaskBar[]
}

const MAX_LOOKBACK_DAYS = 21
const MAX_LOOKAHEAD_DAYS = 21

function toDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

/**
 * One horizontal bar per open task: starts when the task was created, ends
 * at its due date — or, once that date has passed and it's still open, ends
 * at today instead, so the bar keeps growing for exactly as long as the
 * task keeps getting pushed. A task due tomorrow and one due-three-days-ago-
 * still-open read very differently at a glance, which is the point.
 */
export function buildTaskTimeline(tasks: Task[], now: Date): TaskTimeline {
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (openTasks.length === 0) {
    return { totalDays: 0, dayLabels: [], bars: [] }
  }

  let minDate = today
  let maxDate = today
  for (const task of openTasks) {
    const created = toDateOnly(task.createdAt)
    if (created < minDate) minDate = created
    const due = task.dueDate ? toDateOnly(task.dueDate) : today
    if (due > maxDate) maxDate = due
  }

  // Cap the window so one wildly-overdue or far-future task doesn't stretch
  // every other bar unreadably thin.
  const rangeStart = daysBetween(minDate, today) > MAX_LOOKBACK_DAYS ? addDays(today, -MAX_LOOKBACK_DAYS) : minDate
  const rangeEnd = daysBetween(today, maxDate) > MAX_LOOKAHEAD_DAYS ? addDays(today, MAX_LOOKAHEAD_DAYS) : maxDate
  const totalDays = daysBetween(rangeStart, rangeEnd) + 1
  const todayIso = toIsoDate(today)

  const dayLabels = Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(rangeStart, i)
    const dateIso = toIsoDate(date)
    return {
      dateIso,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isToday: dateIso === todayIso,
    }
  })

  const bars: TaskBar[] = openTasks.map((task) => {
    const created = toDateOnly(task.createdAt)
    const due = task.dueDate ? toDateOnly(task.dueDate) : null
    const isOverdue = due !== null && due < today

    const barStart = created < rangeStart ? rangeStart : created
    const barEndTarget = due === null ? today : isOverdue ? today : due
    const barEnd = barEndTarget > rangeEnd ? rangeEnd : barEndTarget

    const startOffset = Math.max(0, daysBetween(rangeStart, barStart))
    const spanDays = Math.max(1, daysBetween(barStart, barEnd) + 1)

    let status: TaskBarStatus = 'on-track'
    if (isOverdue) status = 'overdue'
    else if (due && daysBetween(today, due) <= 2) status = 'due-soon'

    return { task, startOffset, spanDays, status }
  })

  bars.sort((a, b) => a.startOffset - b.startOffset || b.spanDays - a.spanDays)

  return { totalDays, dayLabels, bars }
}

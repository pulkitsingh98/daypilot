import type { ClassEntry } from '../data/timetableBlocks'
import type { DailyPlan } from '../data/dailyPlans'
import type { Task } from '../data/tasks'
import { buildTimelineItems, type TimelineItem } from './todayView'
import { toIsoDate } from './time'

/**
 * Whether a task was actually finished on the given calendar day —
 * deliberately based on completedAt's date, not current status. A task
 * carried forward across several re-planned days should show as
 * incomplete on every day before the one it was actually finished on,
 * even though its live status is 'done' by the time you look back.
 */
export function wasTaskCompletedOn(task: Task | undefined, dateIso: string): boolean {
  if (!task?.completedAt) return false
  return toIsoDate(new Date(task.completedAt)) === dateIso
}

/**
 * Whether a timeline item was done specifically on dateIso — unlike
 * isTimelineItemDone (todayView.ts), which reports LIVE/current status and
 * is only correct for "today". Task-linked items check completedAt against
 * that exact date, so a task carried across several re-planned days only
 * counts as done on the day it actually was. Non-task items (classes,
 * buffer blocks) check that day's own completedItemKeys, which is already
 * scoped to that date's daily_plans row — no extra date check needed there.
 */
export function wasTimelineItemCompletedOn(
  item: TimelineItem,
  tasksById: Map<string, Task>,
  completedItemKeys: string[],
  dateIso: string,
): boolean {
  if (item.taskId) return wasTaskCompletedOn(tasksById.get(item.taskId), dateIso)
  return completedItemKeys.includes(item.key)
}

export interface DayCompletion {
  /** Every timeline item that day — classes, task-linked blocks, and un-linked blocks alike. */
  total: number
  done: number
}

export function computeDayCompletion(
  plan: DailyPlan | null | undefined,
  dateIso: string,
  tasksById: Map<string, Task>,
  classesForDay: ClassEntry[] = [],
): DayCompletion {
  const items = buildTimelineItems(classesForDay, plan ?? null)
  const completedItemKeys = plan?.completedItemKeys ?? []
  const done = items.filter((item) => wasTimelineItemCompletedOn(item, tasksById, completedItemKeys, dateIso)).length
  return { total: items.length, done }
}

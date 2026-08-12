import type { ClassEntry } from '../data/timetableBlocks'
import type { DailyPlan } from '../data/dailyPlans'
import type { Task } from '../data/tasks'
import { occurrenceKey, type ClassOccurrenceMap } from '../data/classOccurrences'
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

/** A postponed/cancelled class occurrence never happened that day, so it shouldn't count toward or against completion at all. */
export function isExcludedFromCompletion(
  item: TimelineItem,
  classOccurrences: ClassOccurrenceMap,
  dateIso: string,
): boolean {
  if (!item.classId) return false
  const status = classOccurrences.get(occurrenceKey(item.classId, dateIso))
  return status === 'postponed' || status === 'cancelled'
}

/**
 * Whether a timeline item was done specifically on dateIso — unlike the
 * live/current status helpers in todayView.ts, which are only correct for
 * "today". Task-linked items check completedAt against that exact date, so
 * a task carried across several re-planned days only counts as done on the
 * day it actually was. Class items check that date's class_occurrences
 * status directly (already scoped to the date). Everything else (un-linked
 * buffer/meal blocks) checks that day's own completedItemKeys.
 */
export function wasTimelineItemCompletedOn(
  item: TimelineItem,
  tasksById: Map<string, Task>,
  completedItemKeys: string[],
  classOccurrences: ClassOccurrenceMap,
  dateIso: string,
): boolean {
  if (item.taskId) return wasTaskCompletedOn(tasksById.get(item.taskId), dateIso)
  if (item.classId) return classOccurrences.get(occurrenceKey(item.classId, dateIso)) === 'done'
  return completedItemKeys.includes(item.key)
}

export interface DayCompletion {
  /** Every timeline item that day, excluding postponed/cancelled classes. */
  total: number
  done: number
}

export function computeDayCompletion(
  plan: DailyPlan | null | undefined,
  dateIso: string,
  tasksById: Map<string, Task>,
  classesForDay: ClassEntry[] = [],
  classOccurrences: ClassOccurrenceMap = new Map(),
): DayCompletion {
  const allItems = buildTimelineItems(classesForDay, plan ?? null)
  const items = allItems.filter((item) => !isExcludedFromCompletion(item, classOccurrences, dateIso))
  const completedItemKeys = plan?.completedItemKeys ?? []
  const done = items.filter((item) =>
    wasTimelineItemCompletedOn(item, tasksById, completedItemKeys, classOccurrences, dateIso),
  ).length
  return { total: items.length, done }
}

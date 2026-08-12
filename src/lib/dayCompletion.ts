import type { DailyPlan } from '../data/dailyPlans'
import type { Task } from '../data/tasks'
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

export interface DayCompletion {
  /** Task-linked blocks that day (buffer/meal blocks and fixed classes aren't counted). */
  total: number
  done: number
}

export function computeDayCompletion(
  plan: DailyPlan | null | undefined,
  dateIso: string,
  tasksById: Map<string, Task>,
): DayCompletion {
  const taskBlocks = (plan?.blocks ?? []).filter((b) => b.taskId)
  const done = taskBlocks.filter((b) => wasTaskCompletedOn(tasksById.get(b.taskId as string), dateIso)).length
  return { total: taskBlocks.length, done }
}

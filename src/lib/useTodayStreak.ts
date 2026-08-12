import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useClasses } from '../data/timetableBlocks'
import { useDailyPlan } from '../data/dailyPlans'
import { useTasks } from '../data/tasks'
import { buildTimelineItems, isTimelineItemDone } from './todayView'
import { computeRecentCompletion } from './planning'
import { dayKeyForDate, toIsoDate } from './time'

export interface TodayStreak {
  todayDone: number
  todayTotal: number
  /** Consecutive fully-completed days counting back from yesterday (today isn't counted until it's over). */
  streakDays: number
  loading: boolean
}

/**
 * Live "today" completion (every timeline item, task-linked or not) plus the
 * existing recent-completion streak the planner already tracks for pacing —
 * reused here so the streak shown to the user matches what the AI sees.
 * Self-contained (fetches its own data via cached hooks) so it can be
 * dropped anywhere — the Sidebar and the Today page both use it.
 */
export function useTodayStreak(): TodayStreak {
  const now = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(now)

  const { data: classes = [], isLoading: classesLoading } = useClasses()
  const { data: plan = null, isLoading: planLoading } = useDailyPlan(todayIso)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()

  const todayClasses = useMemo(
    () => classes.filter((c) => c.day === dayKeyForDate(now)),
    [classes, now],
  )
  const timelineItems = useMemo(() => buildTimelineItems(todayClasses, plan), [todayClasses, plan])
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const completedKeys = plan?.completedItemKeys ?? []

  const todayTotal = timelineItems.length
  const todayDone = timelineItems.filter((item) => isTimelineItemDone(item, tasksById, completedKeys)).length

  const { data: streakDays = 0, isLoading: streakLoading } = useQuery({
    queryKey: ['today-streak', todayIso, tasks.length],
    queryFn: async () => (await computeRecentCompletion(tasks, now)).currentStreakDays,
    enabled: !tasksLoading,
  })

  return {
    todayDone,
    todayTotal,
    streakDays,
    loading: classesLoading || planLoading || tasksLoading || streakLoading,
  }
}

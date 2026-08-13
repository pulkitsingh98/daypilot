import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useClasses } from '../data/timetableBlocks'
import { useDailyPlan } from '../data/dailyPlans'
import { useTasks } from '../data/tasks'
import { useUpcomingSessions } from '../data/sessions'
import { useClassOccurrenceStatuses } from '../data/classOccurrences'
import { buildUpcomingOccurrences } from './sessionRollover'
import { buildTimelineItems, getTimelineItemStatus } from './todayView'
import { isExcludedFromCompletion } from './dayCompletion'
import { computeRecentCompletion } from './planning'
import { toIsoDate } from './time'

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
  const { data: sessions = [] } = useUpcomingSessions()
  const { data: plan = null, isLoading: planLoading } = useDailyPlan(todayIso)
  const { data: tasks = [], isLoading: tasksLoading } = useTasks()
  const { data: classOccurrences = new Map(), isLoading: occurrencesLoading } = useClassOccurrenceStatuses(
    todayIso,
    todayIso,
  )

  // Real per-date occurrences for today, not a raw weekday filter — see
  // buildUpcomingOccurrences. Must match Today.tsx's own todayClasses
  // exactly, or this counter and the visible timeline disagree on how many
  // classes are actually happening today.
  const todayClasses = useMemo(
    () =>
      buildUpcomingOccurrences(classes, sessions, classOccurrences, now, 1)
        .filter((o) => o.dateIso === todayIso)
        .map((o) => o.entry),
    [classes, sessions, classOccurrences, now, todayIso],
  )
  const allTimelineItems = useMemo(() => buildTimelineItems(todayClasses, plan), [todayClasses, plan])
  const timelineItems = useMemo(
    () => allTimelineItems.filter((item) => !isExcludedFromCompletion(item, classOccurrences, todayIso)),
    [allTimelineItems, classOccurrences, todayIso],
  )
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const completedKeys = plan?.completedItemKeys ?? []

  const todayTotal = timelineItems.length
  const todayDone = timelineItems.filter(
    (item) => getTimelineItemStatus(item, tasksById, completedKeys, classOccurrences, todayIso) === 'done',
  ).length

  const { data: streakDays = 0, isLoading: streakLoading } = useQuery({
    queryKey: ['today-streak', todayIso, tasks.length, classes.length],
    queryFn: async () => (await computeRecentCompletion(tasks, now, classes)).currentStreakDays,
    enabled: !tasksLoading && !classesLoading,
  })

  return {
    todayDone,
    todayTotal,
    streakDays,
    loading: classesLoading || planLoading || tasksLoading || occurrencesLoading || streakLoading,
  }
}

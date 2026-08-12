import { useMemo } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useSubjects } from '../data/subjects'
import { useHasSessions } from '../data/sessions'
import { useGoals } from '../data/goals'
import { useCompetitions } from '../data/competitions'
import { useRecurringActivities } from '../data/recurringActivities'

export interface OnboardingStep {
  key: string
  label: string
  done: boolean
  to: string
}

export interface OnboardingSteps {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  allDone: boolean
  loading: boolean
}

/** Drives the "Getting started" checklist on Today — one step per area the planner actually reasons about, each done-check reading the real data instead of a one-time flag. */
export function useOnboardingSteps(): OnboardingSteps {
  const { data: classes = [], isLoading: classesLoading } = useClasses()
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects()
  const { data: hasSessions = false, isLoading: sessionsLoading } = useHasSessions()
  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: competitions = [], isLoading: competitionsLoading } = useCompetitions()
  const { data: recurringActivities = [], isLoading: activitiesLoading } = useRecurringActivities()

  const steps: OnboardingStep[] = useMemo(
    () => [
      { key: 'timetable', label: 'Upload your timetable', done: classes.length > 0, to: '/settings/timetable' },
      {
        key: 'subjects',
        label: 'Add subjects & rate your proficiency',
        done: subjects.some((s) => s.proficiency !== null),
        to: '/settings/subjects',
      },
      {
        key: 'sessions',
        label: 'Upload session or reading lists',
        done: hasSessions,
        to: '/settings/documents',
      },
      { key: 'goals', label: 'Set your goals (30/60/90-day)', done: goals.length > 0, to: '/goals' },
      {
        key: 'competitions',
        label: 'Add competitions or applications',
        done: competitions.length > 0,
        to: '/my-life',
      },
      {
        key: 'activities',
        label: 'Add recurring activities',
        done: recurringActivities.length > 0,
        to: '/my-life',
      },
    ],
    [classes, subjects, hasSessions, goals, competitions, recurringActivities],
  )

  const completedCount = steps.filter((s) => s.done).length

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allDone: completedCount === steps.length,
    loading:
      classesLoading || subjectsLoading || sessionsLoading || goalsLoading || competitionsLoading || activitiesLoading,
  }
}

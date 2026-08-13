import { useMemo } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useSubjects } from '../data/subjects'
import { useHasSessions } from '../data/sessions'
import { useGoals } from '../data/goals'
import { useCompetitions } from '../data/competitions'
import { useRecurringActivities } from '../data/recurringActivities'
import { useProfile } from '../data/profiles'

export interface OnboardingStep {
  key: string
  label: string
  description: string
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
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: classes = [], isLoading: classesLoading } = useClasses()
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects()
  const { data: hasSessions = false, isLoading: sessionsLoading } = useHasSessions()
  const { data: goals = [], isLoading: goalsLoading } = useGoals()
  const { data: competitions = [], isLoading: competitionsLoading } = useCompetitions()
  const { data: recurringActivities = [], isLoading: activitiesLoading } = useRecurringActivities()

  const steps: OnboardingStep[] = useMemo(
    () => [
      {
        key: 'ai-provider',
        label: 'Add your AI provider & API key',
        description: 'Pick Gemini, Claude, ChatGPT, or Perplexity and paste your key — this powers every AI feature, from planning to document reading.',
        done: !!profile?.apiKey.trim(),
        to: '/settings',
      },
      {
        key: 'timetable',
        label: 'Upload your timetable',
        description: "Add your weekly class schedule so the planner knows when you're actually free to work.",
        done: classes.length > 0,
        to: '/timetable',
      },
      {
        key: 'subjects',
        label: 'Add subjects & rate your proficiency',
        description: 'Rate how comfortable you are with each subject so prep time gets sized and spaced accordingly.',
        done: subjects.some((s) => s.proficiency !== null),
        to: '/settings/subjects',
      },
      {
        key: 'sessions',
        label: 'Upload session or reading lists',
        description: 'Add session numbers, topics, and required reading so the planner preps you for the right thing, not just "study".',
        done: hasSessions,
        to: '/settings/documents',
      },
      {
        key: 'goals',
        label: 'Set your goals (30/60/90-day)',
        description: 'Add personal or career goals with a weekly time target, tracked alongside your classes.',
        done: goals.length > 0,
        to: '/goals',
      },
      {
        key: 'competitions',
        label: 'Add competitions or applications',
        description: 'Track deadlines for contests, applications, or interviews so prep gets scheduled before they sneak up.',
        done: competitions.length > 0,
        to: '/my-life',
      },
      {
        key: 'activities',
        label: 'Add recurring activities',
        description: 'Add sports, hobbies, or standing commitments so the planner builds your day around them, not over them.',
        done: recurringActivities.length > 0,
        to: '/my-life',
      },
    ],
    [profile, classes, subjects, hasSessions, goals, competitions, recurringActivities],
  )

  const completedCount = steps.filter((s) => s.done).length

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allDone: completedCount === steps.length,
    loading:
      profileLoading ||
      classesLoading ||
      subjectsLoading ||
      sessionsLoading ||
      goalsLoading ||
      competitionsLoading ||
      activitiesLoading,
  }
}

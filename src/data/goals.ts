import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getWeekStartDate } from '../lib/time'
import { logGoalProgress } from './goalProgress'
import { unwrap } from './shared'

export type GoalHorizon = '30' | '60' | '90' | 'major'

/** Same shape as the old localStorage Goal (minutesThisWeek computed from goal_progress). */
export interface Goal {
  id: string
  title: string
  horizon: GoalHorizon
  weeklyTargetMinutes: number
  minutesThisWeek: number
}

interface GoalRow {
  id: string
  title: string
  horizon: string
  weekly_target_minutes: number
}

interface GoalProgressRow {
  goal_id: string
  minutes_logged: number
}

export const GOALS_QUERY_KEY = ['goals'] as const

export async function fetchGoals(): Promise<Goal[]> {
  const weekStartDate = getWeekStartDate()
  const [goalsResult, progressResult] = await Promise.all([
    supabase.from('goals').select('id, title, horizon, weekly_target_minutes'),
    supabase.from('goal_progress').select('goal_id, minutes_logged').eq('week_start_date', weekStartDate),
  ])
  const goalRows = unwrap<GoalRow[]>(goalsResult)
  const progressRows = unwrap<GoalProgressRow[]>(progressResult)
  const progressByGoal = new Map(progressRows.map((p) => [p.goal_id, p.minutes_logged]))

  return goalRows.map((row) => ({
    id: row.id,
    title: row.title,
    horizon: row.horizon as GoalHorizon,
    weeklyTargetMinutes: row.weekly_target_minutes,
    minutesThisWeek: progressByGoal.get(row.id) ?? 0,
  }))
}

export function useGoals() {
  return useQuery({ queryKey: GOALS_QUERY_KEY, queryFn: fetchGoals })
}

export interface GoalInput {
  title: string
  horizon: GoalHorizon
  weeklyTargetMinutes: number
}

export function useAddGoal() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GoalInput): Promise<Goal> => {
      if (!session) throw new Error('Not signed in.')
      const result = await supabase
        .from('goals')
        .insert({
          user_id: session.user.id,
          title: input.title.trim(),
          horizon: input.horizon,
          weekly_target_minutes: input.weeklyTargetMinutes,
        })
        .select('id, title, horizon, weekly_target_minutes')
        .single()
      const row = unwrap<GoalRow>(result)
      return {
        id: row.id,
        title: row.title,
        horizon: row.horizon as GoalHorizon,
        weeklyTargetMinutes: row.weekly_target_minutes,
        minutesThisWeek: 0,
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY })
      const previous = queryClient.getQueryData<Goal[]>(GOALS_QUERY_KEY)
      const optimistic: Goal = {
        id: `optimistic-${crypto.randomUUID()}`,
        title: input.title.trim(),
        horizon: input.horizon,
        weeklyTargetMinutes: input.weeklyTargetMinutes,
        minutesThisWeek: 0,
      }
      queryClient.setQueryData<Goal[]>(GOALS_QUERY_KEY, (old = []) => [...old, optimistic])
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(GOALS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: GoalInput }): Promise<void> => {
      const { error } = await supabase
        .from('goals')
        .update({
          title: input.title.trim(),
          horizon: input.horizon,
          weekly_target_minutes: input.weeklyTargetMinutes,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY })
      const previous = queryClient.getQueryData<Goal[]>(GOALS_QUERY_KEY)
      queryClient.setQueryData<Goal[]>(GOALS_QUERY_KEY, (old = []) =>
        old.map((g) =>
          g.id === id
            ? { ...g, title: input.title.trim(), horizon: input.horizon, weeklyTargetMinutes: input.weeklyTargetMinutes }
            : g,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(GOALS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY })
      const previous = queryClient.getQueryData<Goal[]>(GOALS_QUERY_KEY)
      queryClient.setQueryData<Goal[]>(GOALS_QUERY_KEY, (old = []) => old.filter((g) => g.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(GOALS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  })
}

export function useLogGoalMinutes() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, deltaMinutes }: { goalId: string; deltaMinutes: number }) => {
      if (!session) throw new Error('Not signed in.')
      return logGoalProgress(goalId, session.user.id, getWeekStartDate(), deltaMinutes)
    },
    onMutate: async ({ goalId, deltaMinutes }) => {
      await queryClient.cancelQueries({ queryKey: GOALS_QUERY_KEY })
      const previous = queryClient.getQueryData<Goal[]>(GOALS_QUERY_KEY)
      queryClient.setQueryData<Goal[]>(GOALS_QUERY_KEY, (old = []) =>
        old.map((g) =>
          g.id === goalId ? { ...g, minutesThisWeek: Math.max(0, g.minutesThisWeek + deltaMinutes) } : g,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(GOALS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY }),
  })
}

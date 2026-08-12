import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DayOfWeek } from './types'
import { dayOfWeekToIndex, indexToDayOfWeek } from '../lib/time'
import { unwrap } from './shared'

export type ActivityCategory = 'sport' | 'hobby' | 'health' | 'social' | 'other'

export interface RecurringActivity {
  id: string
  title: string
  category: ActivityCategory
  /** Null means no fixed day — it happens sometime during the week. */
  day: DayOfWeek | null
  preferredTime: string | null
  durationMinutes: number | null
  timesPerWeek: number | null
  /** If true, the planner may move or shorten this when deadlines are tight. */
  isFlexible: boolean
}

interface RecurringActivityRow {
  id: string
  title: string
  category: string
  day_of_week: number | null
  preferred_time: string | null
  duration_minutes: number | null
  frequency_per_week: number | null
  is_flexible: boolean
}

function fromRow(row: RecurringActivityRow): RecurringActivity {
  return {
    id: row.id,
    title: row.title,
    category: row.category as ActivityCategory,
    day: row.day_of_week === null ? null : indexToDayOfWeek(row.day_of_week),
    preferredTime: row.preferred_time?.slice(0, 5) ?? null,
    durationMinutes: row.duration_minutes,
    timesPerWeek: row.frequency_per_week,
    isFlexible: row.is_flexible,
  }
}

const SELECT_COLUMNS =
  'id, title, category, day_of_week, preferred_time, duration_minutes, frequency_per_week, is_flexible'

export const RECURRING_ACTIVITIES_QUERY_KEY = ['recurring_activities'] as const

export async function fetchRecurringActivities(): Promise<RecurringActivity[]> {
  const result = await supabase.from('recurring_activities').select(SELECT_COLUMNS)
  return unwrap<RecurringActivityRow[]>(result).map(fromRow)
}

export function useRecurringActivities() {
  return useQuery({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY, queryFn: fetchRecurringActivities })
}

export type RecurringActivityInput = Omit<RecurringActivity, 'id'>

function toOptimistic(input: RecurringActivityInput, id: string): RecurringActivity {
  return { id, ...input }
}

function toRowPatch(input: RecurringActivityInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    day_of_week: input.day === null ? null : dayOfWeekToIndex(input.day),
    preferred_time: input.preferredTime,
    duration_minutes: input.durationMinutes,
    frequency_per_week: input.timesPerWeek,
    is_flexible: input.isFlexible,
  }
}

export function useAddRecurringActivity() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecurringActivityInput): Promise<RecurringActivity> => {
      if (!session) throw new Error('Not signed in.')
      const result = await supabase
        .from('recurring_activities')
        .insert({ user_id: session.user.id, ...toRowPatch(input) })
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<RecurringActivityRow>(result))
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY })
      const previous = queryClient.getQueryData<RecurringActivity[]>(RECURRING_ACTIVITIES_QUERY_KEY)
      const optimistic = toOptimistic(input, `optimistic-${crypto.randomUUID()}`)
      queryClient.setQueryData<RecurringActivity[]>(RECURRING_ACTIVITIES_QUERY_KEY, (old = []) => [
        ...old,
        optimistic,
      ])
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(RECURRING_ACTIVITIES_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY }),
  })
}

export function useUpdateRecurringActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: RecurringActivityInput
    }): Promise<RecurringActivity> => {
      const result = await supabase
        .from('recurring_activities')
        .update(toRowPatch(input))
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<RecurringActivityRow>(result))
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY })
      const previous = queryClient.getQueryData<RecurringActivity[]>(RECURRING_ACTIVITIES_QUERY_KEY)
      queryClient.setQueryData<RecurringActivity[]>(RECURRING_ACTIVITIES_QUERY_KEY, (old = []) =>
        old.map((a) => (a.id === id ? toOptimistic(input, id) : a)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(RECURRING_ACTIVITIES_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY }),
  })
}

export function useDeleteRecurringActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('recurring_activities').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY })
      const previous = queryClient.getQueryData<RecurringActivity[]>(RECURRING_ACTIVITIES_QUERY_KEY)
      queryClient.setQueryData<RecurringActivity[]>(RECURRING_ACTIVITIES_QUERY_KEY, (old = []) =>
        old.filter((a) => a.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(RECURRING_ACTIVITIES_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RECURRING_ACTIVITIES_QUERY_KEY }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { unwrap } from './shared'

export type CompetitionStatus = 'interested' | 'registered' | 'in-progress' | 'submitted' | 'closed'

export interface Competition {
  id: string
  title: string
  organiser: string | null
  stage: string | null
  /** "YYYY-MM-DD", null if no deadline set yet. */
  deadlineDate: string | null
  /** "HH:MM", null if only a date is known. */
  deadlineTime: string | null
  effortEstimateMinutes: number | null
  status: CompetitionStatus
}

interface CompetitionRow {
  id: string
  title: string
  organiser: string | null
  stage: string | null
  deadline_date: string | null
  deadline_time: string | null
  effort_estimate_minutes: number | null
  status: string
}

function fromRow(row: CompetitionRow): Competition {
  return {
    id: row.id,
    title: row.title,
    organiser: row.organiser,
    stage: row.stage,
    deadlineDate: row.deadline_date,
    deadlineTime: row.deadline_time?.slice(0, 5) ?? null,
    effortEstimateMinutes: row.effort_estimate_minutes,
    status: row.status as CompetitionStatus,
  }
}

const SELECT_COLUMNS =
  'id, title, organiser, stage, deadline_date, deadline_time, effort_estimate_minutes, status'

export const COMPETITIONS_QUERY_KEY = ['competitions'] as const

export async function fetchCompetitions(): Promise<Competition[]> {
  const result = await supabase.from('competitions').select(SELECT_COLUMNS)
  return unwrap<CompetitionRow[]>(result).map(fromRow)
}

export function useCompetitions() {
  return useQuery({ queryKey: COMPETITIONS_QUERY_KEY, queryFn: fetchCompetitions })
}

export type CompetitionInput = Omit<Competition, 'id'>

function toOptimistic(input: CompetitionInput, id: string): Competition {
  return { id, ...input }
}

function toRowPatch(input: CompetitionInput) {
  return {
    title: input.title.trim(),
    organiser: input.organiser?.trim() || null,
    stage: input.stage?.trim() || null,
    deadline_date: input.deadlineDate,
    deadline_time: input.deadlineTime,
    effort_estimate_minutes: input.effortEstimateMinutes,
    status: input.status,
  }
}

export function useAddCompetition() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CompetitionInput): Promise<Competition> => {
      if (!session) throw new Error('Not signed in.')
      const result = await supabase
        .from('competitions')
        .insert({ user_id: session.user.id, ...toRowPatch(input) })
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<CompetitionRow>(result))
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: COMPETITIONS_QUERY_KEY })
      const previous = queryClient.getQueryData<Competition[]>(COMPETITIONS_QUERY_KEY)
      const optimistic = toOptimistic(input, `optimistic-${crypto.randomUUID()}`)
      queryClient.setQueryData<Competition[]>(COMPETITIONS_QUERY_KEY, (old = []) => [...old, optimistic])
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(COMPETITIONS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COMPETITIONS_QUERY_KEY }),
  })
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CompetitionInput }): Promise<Competition> => {
      const result = await supabase
        .from('competitions')
        .update(toRowPatch(input))
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<CompetitionRow>(result))
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: COMPETITIONS_QUERY_KEY })
      const previous = queryClient.getQueryData<Competition[]>(COMPETITIONS_QUERY_KEY)
      queryClient.setQueryData<Competition[]>(COMPETITIONS_QUERY_KEY, (old = []) =>
        old.map((c) => (c.id === id ? toOptimistic(input, id) : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(COMPETITIONS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COMPETITIONS_QUERY_KEY }),
  })
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('competitions').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: COMPETITIONS_QUERY_KEY })
      const previous = queryClient.getQueryData<Competition[]>(COMPETITIONS_QUERY_KEY)
      queryClient.setQueryData<Competition[]>(COMPETITIONS_QUERY_KEY, (old = []) =>
        old.filter((c) => c.id !== id),
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(COMPETITIONS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COMPETITIONS_QUERY_KEY }),
  })
}

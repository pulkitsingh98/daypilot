import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DayOfWeek, PrepRule } from './types'
import { dayOfWeekToIndex, indexToDayOfWeek } from '../lib/time'
import { resolveSubjectId, SUBJECTS_QUERY_KEY } from './subjects'
import { unwrap } from './shared'

/** Same shape as the old localStorage ClassEntry, so Timetable components barely change. */
export interface ClassEntry {
  id: string
  subject: string
  day: DayOfWeek
  startTime: string
  endTime: string
  prepRule?: PrepRule
}

interface TimetableBlockRow {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  location: string | null
  prep_rule: PrepRule | null
  // Supabase infers embedded relations as arrays without generated DB types
  // (it can't know the FK is many-to-one), even though there's at most one.
  subjects: { name: string }[] | null
}

function fromRow(row: TimetableBlockRow): ClassEntry {
  return {
    id: row.id,
    subject: row.subjects?.[0]?.name ?? '',
    day: indexToDayOfWeek(row.day_of_week),
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    prepRule: row.prep_rule ?? undefined,
  }
}

const SELECT_COLUMNS = 'id, day_of_week, start_time, end_time, location, prep_rule, subjects(name)'

export const TIMETABLE_QUERY_KEY = ['timetable_blocks'] as const

export async function fetchTimetableBlocks(): Promise<ClassEntry[]> {
  const result = await supabase.from('timetable_blocks').select(SELECT_COLUMNS)
  return unwrap<TimetableBlockRow[]>(result).map(fromRow)
}

export function useClasses() {
  return useQuery({ queryKey: TIMETABLE_QUERY_KEY, queryFn: fetchTimetableBlocks })
}

export type ClassInput = Omit<ClassEntry, 'id'>

export function useAddClass() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ClassInput): Promise<ClassEntry> => {
      if (!session) throw new Error('Not signed in.')
      const subjectId = await resolveSubjectId(input.subject, session.user.id)
      const result = await supabase
        .from('timetable_blocks')
        .insert({
          user_id: session.user.id,
          subject_id: subjectId,
          day_of_week: dayOfWeekToIndex(input.day),
          start_time: input.startTime,
          end_time: input.endTime,
          prep_rule: input.prepRule ?? null,
        })
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<TimetableBlockRow>(result))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TIMETABLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}

export function useUpdateClass() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ClassInput }): Promise<ClassEntry> => {
      if (!session) throw new Error('Not signed in.')
      const subjectId = await resolveSubjectId(input.subject, session.user.id)
      const result = await supabase
        .from('timetable_blocks')
        .update({
          subject_id: subjectId,
          day_of_week: dayOfWeekToIndex(input.day),
          start_time: input.startTime,
          end_time: input.endTime,
          prep_rule: input.prepRule ?? null,
        })
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<TimetableBlockRow>(result))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TIMETABLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}

export function useDeleteClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('timetable_blocks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TIMETABLE_QUERY_KEY }),
  })
}

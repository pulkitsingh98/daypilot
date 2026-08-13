import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DayOfWeek, PrepRule } from './types'
import { dayOfWeekToIndex, indexToDayOfWeek } from '../lib/time'
import { resolveSubjectId, resolveSubjectIdTracked, SUBJECTS_QUERY_KEY } from './subjects'
import { embeddedSubjectName, unwrap } from './shared'

/** Same shape as the old localStorage ClassEntry, so Timetable components barely change. */
export interface ClassEntry {
  id: string
  subject: string
  day: DayOfWeek
  startTime: string
  endTime: string
  location?: string
  prepRule?: PrepRule
}

interface TimetableBlockRow {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  location: string | null
  prep_rule: PrepRule | null
  subjects: { name: string }[] | { name: string } | null
}

function fromRow(row: TimetableBlockRow): ClassEntry {
  return {
    id: row.id,
    subject: embeddedSubjectName(row.subjects),
    day: indexToDayOfWeek(row.day_of_week),
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    location: row.location ?? undefined,
    prepRule: row.prep_rule ?? undefined,
  }
}

/** Fills in a subject's course code from extraction, but only if it doesn't already have one — never overwrites a code the user set intentionally. */
async function backfillSubjectCode(subjectId: string | null, code: string | null | undefined): Promise<void> {
  if (!subjectId || !code) return
  await supabase.from('subjects').update({ code }).eq('id', subjectId).is('code', null)
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

/** code is write-only here — it backfills the resolved subject's course code, it isn't stored on the class itself. */
export type ClassInput = Omit<ClassEntry, 'id'> & { code?: string | null }

export function useAddClass() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ClassInput): Promise<ClassEntry> => {
      if (!session) throw new Error('Not signed in.')
      const subjectId = await resolveSubjectId(input.subject, session.user.id)
      await backfillSubjectCode(subjectId, input.code)
      const result = await supabase
        .from('timetable_blocks')
        .insert({
          user_id: session.user.id,
          subject_id: subjectId,
          day_of_week: dayOfWeekToIndex(input.day),
          start_time: input.startTime,
          end_time: input.endTime,
          location: input.location ?? null,
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
      await backfillSubjectCode(subjectId, input.code)
      const result = await supabase
        .from('timetable_blocks')
        .update({
          subject_id: subjectId,
          day_of_week: dayOfWeekToIndex(input.day),
          start_time: input.startTime,
          end_time: input.endTime,
          location: input.location ?? null,
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

export interface NewSubjectRef {
  id: string
  name: string
}

/** Bulk-create from the document-extraction review flow. Sequential inserts
 * for the same subject-race reason as useImportTasks/useImportSessions.
 * Returns any subjects that didn't already exist, so the confirm flow can
 * prompt for a proficiency rating on each one. */
export function useImportClasses() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: ClassInput[]): Promise<{ newSubjects: NewSubjectRef[] }> => {
      if (!session) throw new Error('Not signed in.')
      const newSubjects: NewSubjectRef[] = []

      for (const input of inputs) {
        const resolved = await resolveSubjectIdTracked(input.subject, session.user.id)
        if (resolved?.isNew) newSubjects.push({ id: resolved.id, name: input.subject.trim() })
        await backfillSubjectCode(resolved?.id ?? null, input.code)
        const { error } = await supabase.from('timetable_blocks').insert({
          user_id: session.user.id,
          subject_id: resolved?.id ?? null,
          day_of_week: dayOfWeekToIndex(input.day),
          start_time: input.startTime,
          end_time: input.endTime,
          location: input.location ?? null,
          prep_rule: input.prepRule ?? null,
        })
        if (error) throw new Error(error.message)
      }

      return { newSubjects }
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

/**
 * Deletes every class, session (reading list), and class-occurrence status
 * on this user's timetable — Settings' "Clear timetable", for wiping stale
 * data the planner would otherwise keep reasoning about. Clears all three
 * tables together: leaving sessions behind while classes get recreated by a
 * re-import is exactly what produced doubled-up entries on the Timetable
 * page before this fix — every session from the prior import stayed in the
 * database and a fresh import just added a second copy on top.
 */
export function useClearTimetable() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!session) throw new Error('Not signed in.')
      const userId = session.user.id
      const [blocksResult, sessionsResult, occurrencesResult] = await Promise.all([
        supabase.from('timetable_blocks').delete().eq('user_id', userId),
        supabase.from('sessions').delete().eq('user_id', userId),
        supabase.from('class_occurrences').delete().eq('user_id', userId),
      ])
      if (blocksResult.error) throw new Error(blocksResult.error.message)
      if (sessionsResult.error) throw new Error(sessionsResult.error.message)
      if (occurrencesResult.error) throw new Error(occurrencesResult.error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TIMETABLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['class_occurrences'] })
    },
  })
}

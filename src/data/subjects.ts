import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { unwrap, unwrapNullable } from './shared'

export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5

export interface Subject {
  id: string
  name: string
  code: string | null
  proficiency: ProficiencyLevel | null
  notes: string | null
  isActive: boolean
}

interface SubjectRow {
  id: string
  name: string
  code: string | null
  proficiency: number | null
  notes: string | null
  is_active: boolean
}

function fromRow(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    proficiency: (row.proficiency as ProficiencyLevel | null) ?? null,
    notes: row.notes,
    isActive: row.is_active,
  }
}

export const SUBJECTS_QUERY_KEY = ['subjects'] as const

export async function fetchSubjects(): Promise<Subject[]> {
  const result = await supabase.from('subjects').select('*').order('name')
  return unwrap(result).map(fromRow)
}

export function useSubjects() {
  return useQuery({ queryKey: SUBJECTS_QUERY_KEY, queryFn: fetchSubjects })
}

export interface SubjectInput {
  name: string
  code?: string | null
  proficiency?: ProficiencyLevel | null
  notes?: string | null
  isActive?: boolean
}

/**
 * Finds an existing subject by name (case-insensitive) for this user, or
 * creates one. Lets tasks/timetable_blocks/task_history keep accepting a
 * plain subject name string while the schema underneath is normalized.
 * Returns null for a blank/whitespace name (no subject).
 */
export async function resolveSubjectId(name: string, userId: string): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = await supabase
    .from('subjects')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle()
  const found = unwrapNullable(existing)
  if (found) return found.id

  const created = await supabase
    .from('subjects')
    .insert({ user_id: userId, name: trimmed })
    .select('id')
    .single()
  return unwrap(created).id
}

export interface ResolvedSubject {
  id: string
  isNew: boolean
}

/**
 * Same lookup-or-create as resolveSubjectId, but reports whether the
 * subject was just created — used by the timetable-extraction import to
 * know which subjects need a proficiency prompt afterward. Kept separate
 * from resolveSubjectId rather than changing its return shape, since that
 * function has several existing callers that don't need this.
 */
export async function resolveSubjectIdTracked(name: string, userId: string): Promise<ResolvedSubject | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const existing = await supabase.from('subjects').select('id').ilike('name', trimmed).maybeSingle()
  const found = unwrapNullable(existing)
  if (found) return { id: found.id, isNew: false }

  const created = await supabase
    .from('subjects')
    .insert({ user_id: userId, name: trimmed })
    .select('id')
    .single()
  return { id: unwrap(created).id, isNew: true }
}

export function useAddSubject() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SubjectInput): Promise<Subject> => {
      if (!session) throw new Error('Not signed in.')
      const result = await supabase
        .from('subjects')
        .insert({
          user_id: session.user.id,
          name: input.name.trim(),
          code: input.code ?? null,
          proficiency: input.proficiency ?? null,
          notes: input.notes ?? null,
          is_active: input.isActive ?? true,
        })
        .select('*')
        .single()
      return fromRow(unwrap(result))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  })
}

export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SubjectInput }): Promise<Subject> => {
      const result = await supabase
        .from('subjects')
        .update({
          name: input.name.trim(),
          code: input.code ?? null,
          proficiency: input.proficiency ?? null,
          notes: input.notes ?? null,
          is_active: input.isActive ?? true,
        })
        .eq('id', id)
        .select('*')
        .single()
      return fromRow(unwrap(result))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('subjects').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY }),
  })
}

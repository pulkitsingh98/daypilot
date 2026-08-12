import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { unwrap } from './shared'

export type ClassOccurrenceStatus = 'done' | 'postponed' | 'cancelled'

interface ClassOccurrenceRow {
  timetable_block_id: string
  occurrence_date: string
  status: ClassOccurrenceStatus
}

/** Keyed by `${timetableBlockId}::${dateIso}`. Absence of a key means the default "scheduled, not yet marked" state. */
export type ClassOccurrenceMap = Map<string, ClassOccurrenceStatus>

export function occurrenceKey(timetableBlockId: string, dateIso: string): string {
  return `${timetableBlockId}::${dateIso}`
}

export const classOccurrencesQueryKey = (startIso: string, endIso: string) =>
  ['class_occurrences', startIso, endIso] as const

export async function fetchClassOccurrenceStatuses(startIso: string, endIso: string): Promise<ClassOccurrenceMap> {
  const result = await supabase
    .from('class_occurrences')
    .select('timetable_block_id, occurrence_date, status')
    .gte('occurrence_date', startIso)
    .lte('occurrence_date', endIso)
  const rows = unwrap<ClassOccurrenceRow[]>(result)
  return new Map(rows.map((r) => [occurrenceKey(r.timetable_block_id, r.occurrence_date), r.status]))
}

export function useClassOccurrenceStatuses(startIso: string, endIso: string) {
  return useQuery({
    queryKey: classOccurrencesQueryKey(startIso, endIso),
    queryFn: () => fetchClassOccurrenceStatuses(startIso, endIso),
  })
}

/**
 * Sets (or clears, when status is null) a specific occurrence's status.
 * Invalidates every class_occurrences range query rather than just one exact
 * range, since Today, Timetable's Upcoming list, and History each query
 * their own window over this same small table.
 */
export function useSetClassOccurrenceStatus() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      timetableBlockId,
      dateIso,
      status,
    }: {
      timetableBlockId: string
      dateIso: string
      status: ClassOccurrenceStatus | null
    }): Promise<void> => {
      if (!session) throw new Error('Not signed in.')
      if (status === null) {
        const { error } = await supabase
          .from('class_occurrences')
          .delete()
          .eq('timetable_block_id', timetableBlockId)
          .eq('occurrence_date', dateIso)
        if (error) throw new Error(error.message)
        return
      }
      const { error } = await supabase.from('class_occurrences').upsert(
        {
          user_id: session.user.id,
          timetable_block_id: timetableBlockId,
          occurrence_date: dateIso,
          status,
        },
        { onConflict: 'timetable_block_id,occurrence_date' },
      )
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['class_occurrences'] }),
  })
}

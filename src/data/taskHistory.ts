import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { resolveSubjectId } from './subjects'
import { unwrap } from './shared'
import type { TaskType } from './tasks'

/** One completed task's planned-vs-actual time, for the planner's estimate calibration. */
export interface TaskHistoryEntry {
  id: string
  type: TaskType
  subject: string
  plannedMinutes: number
  actualMinutes: number
  /** "YYYY-MM-DD" */
  completedDate: string
}

interface TaskHistoryRow {
  id: string
  task_type: string
  planned_minutes: number
  actual_minutes: number
  completed_date: string
  subjects: { name: string }[] | null
}

function fromRow(row: TaskHistoryRow): TaskHistoryEntry {
  return {
    id: row.id,
    type: row.task_type as TaskType,
    subject: row.subjects?.[0]?.name ?? '',
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    completedDate: row.completed_date,
  }
}

const SELECT_COLUMNS = 'id, task_type, planned_minutes, actual_minutes, completed_date, subjects(name)'

/** Plain fetcher — used by the plan generator, which runs outside React render. */
export async function fetchTaskHistory(): Promise<TaskHistoryEntry[]> {
  const result = await supabase.from('task_history').select(SELECT_COLUMNS)
  return unwrap<TaskHistoryRow[]>(result).map(fromRow)
}

export async function addTaskHistoryEntry(
  input: Omit<TaskHistoryEntry, 'id'>,
  userId: string,
): Promise<void> {
  const subjectId = await resolveSubjectId(input.subject, userId)
  const { error } = await supabase.from('task_history').insert({
    user_id: userId,
    task_type: input.type,
    subject_id: subjectId,
    planned_minutes: input.plannedMinutes,
    actual_minutes: input.actualMinutes,
    completed_date: input.completedDate,
  })
  if (error) throw new Error(error.message)
}

/**
 * Logs how long a just-completed task actually took, from the optional
 * "took about how long?" prompt shown after checking a task off. This is
 * currently the only normal-usage writer of task_history — without it, the
 * planner's "prefer historical actual durations" rule has nothing to read.
 */
export function useLogTaskActual() {
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: Omit<TaskHistoryEntry, 'id'>): Promise<void> => {
      if (!session) throw new Error('Not signed in.')
      await addTaskHistoryEntry(input, session.user.id)
    },
  })
}

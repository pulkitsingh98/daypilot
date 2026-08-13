import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { resolveSubjectId, SUBJECTS_QUERY_KEY } from './subjects'
import { embeddedSubjectName, unwrap } from './shared'
import { toIsoDate } from '../lib/time'

export type TaskType =
  | 'class-prep'
  | 'quiz-exam'
  | 'assignment'
  | 'application'
  | 'competition'
  | 'self-dev'
  | 'personal'
  | 'errand'

export type TaskPriority = 1 | 2 | 3
export type TaskStatus = 'open' | 'done' | 'deferred'
export type TaskSource = 'manual' | 'quick-add' | 'document'

export interface Task {
  id: string
  title: string
  subject: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  estimatedMinutes?: number
  notes?: string
  source: TaskSource
  /** Times this task has been pushed to a later day without being worked on. */
  snoozeCount: number
  /** ISO timestamp of when status last became 'done', via useToggleTaskDone. Undefined if never completed. */
  completedAt?: string
  /** ISO timestamp of when the task was created — the start point for the Backlog timeline view. */
  createdAt: string
}

interface TaskRow {
  id: string
  title: string
  due_date: string | null
  estimated_minutes: number | null
  priority: number | null
  status: string
  snooze_count: number
  notes: string | null
  source: string
  type: string
  completed_at: string | null
  created_at: string
  subjects: { name: string }[] | { name: string } | null
}

function fromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    subject: embeddedSubjectName(row.subjects),
    type: row.type as TaskType,
    priority: (row.priority as TaskPriority | null) ?? 2,
    status: row.status as TaskStatus,
    dueDate: row.due_date ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    notes: row.notes ?? undefined,
    source: (row.source as TaskSource) ?? 'manual',
    snoozeCount: row.snooze_count,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  }
}

const SELECT_COLUMNS =
  'id, title, due_date, estimated_minutes, priority, status, snooze_count, notes, source, type, completed_at, created_at, subjects(name)'

export const TASKS_QUERY_KEY = ['tasks'] as const

export async function fetchTasks(): Promise<Task[]> {
  const result = await supabase.from('tasks').select(SELECT_COLUMNS)
  return unwrap<TaskRow[]>(result).map(fromRow)
}

export function useTasks() {
  return useQuery({ queryKey: TASKS_QUERY_KEY, queryFn: fetchTasks })
}

export interface TaskInput {
  title: string
  subject: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  estimatedMinutes?: number
  notes?: string
  source?: TaskSource
}

function toOptimisticTask(input: TaskInput, id: string): Task {
  return {
    id,
    title: input.title.trim(),
    subject: input.subject.trim(),
    type: input.type,
    priority: input.priority,
    status: input.status,
    dueDate: input.dueDate || undefined,
    estimatedMinutes: input.estimatedMinutes,
    notes: input.notes,
    source: input.source ?? 'manual',
    snoozeCount: 0,
    // Only correct for the create case; an edit's optimistic entry briefly
    // shows "now" here too, self-corrected once onSettled refetches the row.
    createdAt: new Date().toISOString(),
  }
}

export function useAddTask() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TaskInput): Promise<Task> => {
      if (!session) throw new Error('Not signed in.')
      const subjectId = await resolveSubjectId(input.subject, session.user.id)
      const result = await supabase
        .from('tasks')
        .insert({
          user_id: session.user.id,
          title: input.title.trim(),
          subject_id: subjectId,
          type: input.type,
          priority: input.priority,
          status: input.status,
          due_date: input.dueDate || null,
          estimated_minutes: input.estimatedMinutes ?? null,
          notes: input.notes ?? null,
          source: input.source ?? 'manual',
        })
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<TaskRow>(result))
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY)
      const optimistic = toOptimisticTask(input, `optimistic-${crypto.randomUUID()}`)
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) => [...old, optimistic])
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}

export function useUpdateTask() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TaskInput }): Promise<Task> => {
      if (!session) throw new Error('Not signed in.')
      const subjectId = await resolveSubjectId(input.subject, session.user.id)
      const result = await supabase
        .from('tasks')
        .update({
          title: input.title.trim(),
          subject_id: subjectId,
          type: input.type,
          priority: input.priority,
          status: input.status,
          due_date: input.dueDate || null,
          estimated_minutes: input.estimatedMinutes ?? null,
          notes: input.notes ?? null,
          source: input.source ?? 'manual',
        })
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<TaskRow>(result))
    },
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY)
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) =>
        old.map((t) => (t.id === id ? toOptimisticTask(input, id) : t)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}

/**
 * The single source of truth for marking a task done/not-done — used by the
 * strike-off checkbox on both Backlog and Today, so both stay in sync
 * through the shared tasks query cache. Sets/clears completed_at, which the
 * History calendar relies on to know which specific day a task was actually
 * finished on (not just its current status).
 */
export function useToggleTaskDone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }): Promise<Task> => {
      const result = await supabase
        .from('tasks')
        .update({
          status: done ? 'done' : 'open',
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select(SELECT_COLUMNS)
        .single()
      return fromRow(unwrap<TaskRow>(result))
    },
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY)
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) =>
        old.map((t) =>
          t.id === id
            ? {
                ...t,
                status: done ? 'done' : 'open',
                completedAt: done ? new Date().toISOString() : undefined,
              }
            : t,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY })
      const previous = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY)
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, (old = []) => old.filter((t) => t.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(TASKS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })
}

/**
 * Deletes every task on this user's backlog — Settings' "Clear to-do list",
 * for wiping stale data the planner would otherwise keep reasoning about.
 * Today's (and any future) plan also gets cleared: its blocks are a
 * generated snapshot that baked in titles from tasks that no longer exist,
 * so leaving it in place would keep showing stale entries on Today even
 * though the backlog itself is empty. Past plans are left alone — they're
 * the historical record History reads from.
 */
export function useClearTasks() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!session) throw new Error('Not signed in.')
      const { error } = await supabase.from('tasks').delete().eq('user_id', session.user.id)
      if (error) throw new Error(error.message)

      const { error: planError } = await supabase
        .from('daily_plans')
        .delete()
        .eq('user_id', session.user.id)
        .gte('plan_date', toIsoDate(new Date()))
      if (planError) throw new Error(planError.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['daily_plans'] })
    },
  })
}

/** Bulk-add from the paste-import flow. Nothing is written until this is called.
 * Rows are inserted sequentially (not in parallel) so repeated subject names
 * within one batch resolve to the same subject row instead of racing to create
 * duplicates — subjects has no unique constraint on (user_id, name). */
export function useImportTasks() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: TaskInput[]): Promise<Task[]> => {
      if (!session) throw new Error('Not signed in.')
      const results: Task[] = []
      for (const input of inputs) {
        const subjectId = await resolveSubjectId(input.subject, session.user.id)
        const result = await supabase
          .from('tasks')
          .insert({
            user_id: session.user.id,
            title: input.title.trim(),
            subject_id: subjectId,
            type: input.type,
            priority: input.priority,
            status: input.status,
            due_date: input.dueDate || null,
            estimated_minutes: input.estimatedMinutes ?? null,
            notes: input.notes ?? null,
            source: input.source ?? 'manual',
          })
          .select(SELECT_COLUMNS)
          .single()
        results.push(fromRow(unwrap<TaskRow>(result)))
      }
      return results
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
    },
  })
}

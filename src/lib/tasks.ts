import type { Task, TaskPriority, TaskStatus, TaskType } from '../store'

export const TASK_STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

export const TASK_TYPES: { key: TaskType; label: string; chipClass: string }[] = [
  { key: 'homework', label: 'Homework', chipClass: 'bg-sky-100 text-sky-700' },
  { key: 'reading', label: 'Reading', chipClass: 'bg-violet-100 text-violet-700' },
  { key: 'project', label: 'Project', chipClass: 'bg-emerald-100 text-emerald-700' },
  { key: 'exam', label: 'Exam', chipClass: 'bg-rose-100 text-rose-700' },
  { key: 'other', label: 'Other', chipClass: 'bg-slate-100 text-slate-600' },
]

export const TASK_PRIORITIES: { key: TaskPriority; label: string; chipClass: string }[] = [
  { key: 'high', label: 'High', chipClass: 'bg-red-100 text-red-700' },
  { key: 'medium', label: 'Medium', chipClass: 'bg-amber-100 text-amber-700' },
  { key: 'low', label: 'Low', chipClass: 'bg-slate-100 text-slate-600' },
]

export function typeMeta(type: TaskType) {
  return TASK_TYPES.find((t) => t.key === type) ?? TASK_TYPES[TASK_TYPES.length - 1]
}

export function priorityMeta(priority: TaskPriority) {
  return TASK_PRIORITIES.find((p) => p.key === priority) ?? TASK_PRIORITIES[1]
}

function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return task.dueDate < todayIso()
}

export function formatDueDate(dueDate: string): string {
  const [y, m, d] = dueDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

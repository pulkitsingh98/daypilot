import type { Task, TaskPriority, TaskStatus, TaskType } from '../data/tasks'

export const TASK_STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'deferred', label: 'Deferred' },
]

export const TASK_TYPES: { key: TaskType; label: string; chipClass: string }[] = [
  { key: 'class-prep', label: 'Class Prep', chipClass: 'bg-violet-100 text-violet-700' },
  { key: 'quiz-exam', label: 'Quiz/Exam', chipClass: 'bg-rose-100 text-rose-700' },
  { key: 'assignment', label: 'Assignment', chipClass: 'bg-sky-100 text-sky-700' },
  { key: 'application', label: 'Application', chipClass: 'bg-emerald-100 text-emerald-700' },
  { key: 'competition', label: 'Competition', chipClass: 'bg-amber-100 text-amber-700' },
  { key: 'self-dev', label: 'Self-Dev', chipClass: 'bg-teal-100 text-teal-700' },
  { key: 'personal', label: 'Personal', chipClass: 'bg-pink-100 text-pink-700' },
  { key: 'errand', label: 'Errand', chipClass: 'bg-slate-100 text-slate-600' },
]

export const TASK_PRIORITIES: { key: TaskPriority; label: string; chipClass: string }[] = [
  { key: 1, label: 'High', chipClass: 'bg-red-100 text-red-700' },
  { key: 2, label: 'Medium', chipClass: 'bg-amber-100 text-amber-700' },
  { key: 3, label: 'Low', chipClass: 'bg-slate-100 text-slate-600' },
]

export function typeMeta(type: TaskType) {
  return TASK_TYPES.find((t) => t.key === type) ?? TASK_TYPES[TASK_TYPES.length - 1]
}

export function priorityMeta(priority: TaskPriority) {
  return TASK_PRIORITIES.find((p) => p.key === priority) ?? TASK_PRIORITIES[1]
}

export function todayIso(): string {
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

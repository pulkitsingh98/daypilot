import type { Task } from '../../store'
import { formatDueDate, isOverdue, priorityMeta, typeMeta } from '../../lib/tasks'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
}

export default function TaskCard({ task, onEdit }: TaskCardProps) {
  const type = typeMeta(task.type)
  const priority = priorityMeta(task.priority)
  const overdue = isOverdue(task)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{task.title}</h3>
          {task.subject && <p className="mt-0.5 truncate text-xs text-slate-500">{task.subject}</p>}
        </div>
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✏️
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${type.chipClass}`}>
          {type.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.chipClass}`}>
          {priority.label}
        </span>
        {task.dueDate && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {overdue && <span aria-hidden="true">⚠️</span>}
            {overdue ? 'Overdue · ' : 'Due '}
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  )
}

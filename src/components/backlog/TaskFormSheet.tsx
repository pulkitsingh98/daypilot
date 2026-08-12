import { useState } from 'react'
import {
  useAddTask,
  useDeleteTask,
  useUpdateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from '../../data/tasks'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '../../lib/tasks'

interface TaskFormSheetProps {
  initial: Task | null
  defaultStatus: TaskStatus
  subjectSuggestions: string[]
  onClose: () => void
}

export default function TaskFormSheet({
  initial,
  defaultStatus,
  subjectSuggestions,
  onClose,
}: TaskFormSheetProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [type, setType] = useState<TaskType>(initial?.type ?? 'assignment')
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 2)
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? defaultStatus)
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [error, setError] = useState<string | null>(null)

  const addTask = useAddTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const saving = addTask.isPending || updateTask.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Enter a task title.')
      return
    }

    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      type,
      priority,
      status,
      dueDate: dueDate || undefined,
    }

    try {
      if (initial) {
        await updateTask.mutateAsync({ id: initial.id, input: payload })
      } else {
        await addTask.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this task. Try again.')
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (window.confirm(`Delete "${initial.title}"? This can't be undone.`)) {
      try {
        await deleteTask.mutateAsync(initial.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this task. Try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {initial ? 'Edit task' : 'Add task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Problem set 4"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Subject</span>
            <input
              type="text"
              list="subject-suggestions"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <datalist id="subject-suggestions">
              {subjectSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteTask.isPending}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

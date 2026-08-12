import { useState } from 'react'
import { X } from 'lucide-react'
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
import SubjectPicker from '../subjects/SubjectPicker'

interface TaskFormSheetProps {
  initial: Task | null
  defaultStatus: TaskStatus
  /** Pre-fills the subject picker when adding a new task (e.g. from a subject's detail view). */
  defaultSubject?: string
  onClose: () => void
}

export default function TaskFormSheet({
  initial,
  defaultStatus,
  defaultSubject,
  onClose,
}: TaskFormSheetProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subject, setSubject] = useState(initial?.subject ?? defaultSubject ?? '')
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
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {initial ? 'Edit task' : 'Add task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Problem set 4"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Subject</span>
            <SubjectPicker value={subject} onChange={setSubject} placeholder="e.g. Biology" />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
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
              <span className="text-sm font-medium text-ink-soft">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Due date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
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
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:opacity-50"
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

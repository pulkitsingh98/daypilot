import { useMemo, useState } from 'react'
import { useTasks, type Task, type TaskStatus, type TaskType } from '../store'
import { TASK_STATUSES, TASK_TYPES } from '../lib/tasks'
import TaskCard from '../components/backlog/TaskCard'
import TaskFormSheet from '../components/backlog/TaskFormSheet'
import ImportSheet from '../components/backlog/ImportSheet'

type TypeFilter = TaskType | 'all'

export default function Backlog() {
  const tasks = useTasks()
  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')

  const subjects = useMemo(() => {
    const set = new Set(tasks.map((t) => t.subject).filter((s) => s.trim().length > 0))
    return Array.from(set).sort()
  }, [tasks])

  const filteredTasks = tasks.filter(
    (task) =>
      (typeFilter === 'all' || task.type === typeFilter) &&
      (subjectFilter === 'all' || task.subject === subjectFilter),
  )

  function openAdd(status: TaskStatus = 'todo') {
    setEditing(null)
    setDefaultStatus(status)
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Backlog</h1>
          <p className="mt-1 text-sm text-slate-500">Your unscheduled tasks.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => openAdd()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All types</option>
          {TASK_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-6">
        {TASK_STATUSES.map((statusMeta) => {
          const statusTasks = filteredTasks.filter((task) => task.status === statusMeta.key)
          return (
            <section key={statusMeta.key}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  {statusMeta.label}{' '}
                  <span className="font-normal text-slate-400">({statusTasks.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={() => openAdd(statusMeta.key)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  + Add
                </button>
              </div>

              {statusTasks.length === 0 ? (
                <p className="text-sm text-slate-400">No tasks</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {statusTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onEdit={openEdit} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {formOpen && (
        <TaskFormSheet
          key={editing?.id ?? 'new'}
          initial={editing}
          defaultStatus={defaultStatus}
          subjectSuggestions={subjects}
          onClose={closeForm}
        />
      )}

      {importOpen && <ImportSheet onClose={() => setImportOpen(false)} />}
    </div>
  )
}

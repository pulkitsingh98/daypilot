import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSubjects } from '../data/subjects'
import { useClasses } from '../data/timetableBlocks'
import { useSessionsForSubject } from '../data/sessions'
import { useTasks, type Task } from '../data/tasks'
import { proficiencyMeta, sortByUpcoming } from '../lib/subjects'
import { dayLabel, formatTimeLabel, toIsoDate } from '../lib/time'
import SubjectFormSheet from '../components/subjects/SubjectFormSheet'
import TaskCard from '../components/backlog/TaskCard'
import TaskFormSheet from '../components/backlog/TaskFormSheet'
import UploadDocumentButton from '../components/documents/UploadDocumentButton'

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects()
  const { data: classes = [] } = useClasses()
  const { data: tasks = [] } = useTasks()
  const [editingSubject, setEditingSubject] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskFormOpen, setTaskFormOpen] = useState(false)

  const subject = subjects.find((s) => s.id === id)
  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useSessionsForSubject(subject?.id ?? '')

  if (subjectsLoading) {
    return <div className="p-4 text-sm text-slate-500">Loading…</div>
  }

  if (!subject) {
    return (
      <div className="p-4">
        <Link to="/settings/subjects" className="text-sm text-slate-400 hover:text-slate-600">
          ← Subjects
        </Link>
        <p className="mt-4 text-sm text-slate-500">Subject not found.</p>
      </div>
    )
  }

  const upcomingClasses = sortByUpcoming(
    classes.filter((c) => c.subject === subject.name),
    new Date(),
  )
  const openTasks = tasks
    .filter((t) => t.subject === subject.name && t.status !== 'done')
    .sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))

  const proficiency = proficiencyMeta(subject.proficiency)
  const todayIso = toIsoDate(new Date())

  function openEditTask(task: Task) {
    setEditingTask(task)
    setTaskFormOpen(true)
  }

  function openAddTask() {
    setEditingTask(null)
    setTaskFormOpen(true)
  }

  return (
    <div className="p-4">
      <Link to="/settings/subjects" className="text-sm text-slate-400 hover:text-slate-600">
        ← Subjects
      </Link>

      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-slate-900">{subject.name}</h1>
          {subject.code && <p className="mt-0.5 text-sm text-slate-500">{subject.code}</p>}
        </div>
        <button
          type="button"
          onClick={() => setEditingSubject(true)}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Edit
        </button>
      </div>

      <div className="mt-2">
        {proficiency ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${proficiency.chipClass}`}>
            {proficiency.key} · {proficiency.label}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            No rating yet
          </span>
        )}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Weekly classes</h2>
        {upcomingClasses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No classes scheduled for this subject.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {upcomingClasses.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{dayLabel(entry.day)}</span>
                  <span className="text-slate-500">
                    {formatTimeLabel(entry.startTime)}–{formatTimeLabel(entry.endTime)}
                  </span>
                </div>
                {entry.prepRule && (
                  <p className="mt-1 text-xs text-slate-500">Prep: {entry.prepRule.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Sessions</h2>
        {sessionsLoading && <p className="mt-2 text-sm text-slate-500">Loading…</p>}
        {sessionsError && (
          <p className="mt-2 text-sm text-red-600">Could not load sessions. Try refreshing.</p>
        )}

        {!sessionsLoading && sessions.length === 0 && (
          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
            <p className="text-sm text-slate-500">
              No sessions yet — upload a session list or syllabus and DayPilot will read the
              topics and reading material for you.
            </p>
            <div className="mt-3">
              <UploadDocumentButton
                label="Upload session list"
                helperText="A session list or syllabus with dates, topics, or readings."
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              />
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {sessions.map((s) => {
              const isPast = s.scheduledDate < todayIso
              return (
                <li
                  key={s.id}
                  className={`rounded-xl border border-slate-200 bg-white p-3 text-sm ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium text-slate-900">
                      {s.sessionNumber ? `#${s.sessionNumber} — ` : ''}
                      {s.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {new Date(`${s.scheduledDate}T00:00:00`).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {s.topics.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Topics: {s.topics.join(', ')}</p>
                  )}
                  {s.readingMaterial && (
                    <p className="mt-1 text-xs text-slate-500">Read: {s.readingMaterial}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Open tasks</h2>
          <button
            type="button"
            onClick={openAddTask}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Add
          </button>
        </div>
        {openTasks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No open tasks for this subject.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {openTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={openEditTask} />
            ))}
          </div>
        )}
      </section>

      {editingSubject && (
        <SubjectFormSheet
          initial={subject}
          onClose={() => setEditingSubject(false)}
          onDeleted={() => navigate('/settings/subjects')}
        />
      )}

      {taskFormOpen && (
        <TaskFormSheet
          key={editingTask?.id ?? 'new'}
          initial={editingTask}
          defaultStatus="open"
          defaultSubject={subject.name}
          onClose={() => setTaskFormOpen(false)}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubjects, type Subject } from '../data/subjects'
import { proficiencyMeta } from '../lib/subjects'
import SubjectFormSheet from '../components/subjects/SubjectFormSheet'

export default function Subjects() {
  const { data: subjects = [], isLoading, error } = useSubjects()
  const [editing, setEditing] = useState<Subject | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(subject: Subject, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditing(subject)
    setFormOpen(true)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/settings" className="text-sm text-slate-400 hover:text-slate-600">
            ← Settings
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Subjects</h1>
          <p className="mt-1 text-sm text-slate-500">Your classes and how comfortable you are with each.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add subject
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading your subjects…</p>}
      {error && <p className="text-sm text-red-600">Could not load your subjects. Try refreshing.</p>}

      {!isLoading && subjects.length === 0 && (
        <p className="text-sm text-slate-400">
          No subjects yet — add one, or add a class or task and one will be created for you.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => {
          const proficiency = proficiencyMeta(subject.proficiency)
          return (
            <Link
              key={subject.id}
              to={`/settings/subjects/${subject.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{subject.name}</h3>
                  {subject.code && <p className="mt-0.5 truncate text-xs text-slate-500">{subject.code}</p>}
                </div>
                <button
                  type="button"
                  onClick={(e) => openEdit(subject, e)}
                  aria-label={`Edit ${subject.name}`}
                  className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✏️
                </button>
              </div>
              <div className="mt-2.5">
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
            </Link>
          )
        })}
      </div>

      {formOpen && (
        <SubjectFormSheet key={editing?.id ?? 'new'} initial={editing} onClose={() => setFormOpen(false)} />
      )}
    </div>
  )
}

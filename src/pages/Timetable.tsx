import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClasses, type ClassEntry } from '../data/timetableBlocks'
import type { DayOfWeek } from '../data/types'
import WeekGrid from '../components/timetable/WeekGrid'
import DayList from '../components/timetable/DayList'
import ClassFormSheet from '../components/timetable/ClassFormSheet'
import UploadDocumentButton from '../components/documents/UploadDocumentButton'

export default function Timetable() {
  const { data: classes = [], isLoading, error } = useClasses()
  const [editing, setEditing] = useState<ClassEntry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>('mon')

  function openAdd(day: DayOfWeek = 'mon') {
    setEditing(null)
    setDefaultDay(day)
    setFormOpen(true)
  }

  function openEdit(entry: ClassEntry) {
    setEditing(entry)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/settings" className="text-sm text-slate-400 hover:text-slate-600">
            ← Settings
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Timetable</h1>
          <p className="mt-1 text-sm text-slate-500">Your weekly recurring classes.</p>
        </div>
        <button
          type="button"
          onClick={() => openAdd()}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add class
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading your timetable…</p>}
      {error && <p className="text-sm text-red-600">Could not load your timetable. Try refreshing.</p>}

      {!isLoading && classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm font-medium text-slate-700">No classes yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Upload a photo or PDF of your timetable and DayPilot builds it for you — once per
            term, not something you'll redo daily.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <UploadDocumentButton
              label="Upload timetable"
              helperText="A photo or PDF of your class schedule."
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            />
            <button
              type="button"
              onClick={() => openAdd()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Add a class manually
            </button>
          </div>
        </div>
      ) : (
        <>
          <WeekGrid classes={classes} onEdit={openEdit} />
          <DayList classes={classes} onEdit={openEdit} onAdd={openAdd} />
        </>
      )}

      {formOpen && (
        <ClassFormSheet
          key={editing?.id ?? 'new'}
          initial={editing}
          defaultDay={defaultDay}
          onClose={closeForm}
        />
      )}
    </div>
  )
}

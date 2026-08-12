import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
          <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-mist hover:text-ink-soft">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Settings
          </Link>
          <h1 className="font-display text-2xl font-semibold text-ink">Timetable</h1>
          <p className="mt-1 text-sm text-mist">Your weekly recurring classes.</p>
        </div>
        <button
          type="button"
          onClick={() => openAdd()}
          className="shrink-0 rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep"
        >
          + Add class
        </button>
      </div>

      {isLoading && <p className="text-sm text-mist">Loading your timetable…</p>}
      {error && <p className="text-sm text-red-600">Could not load your timetable. Try refreshing.</p>}

      {!isLoading && classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-line bg-paper-raised p-6 text-center">
          <p className="text-sm font-medium text-ink-soft">No classes yet</p>
          <p className="mt-1 text-sm text-mist">
            Upload a photo or PDF of your timetable and DayPilot builds it for you — once per
            term, not something you'll redo daily.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <UploadDocumentButton
              label="Upload timetable"
              helperText="A photo or PDF of your class schedule."
              className="rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep"
            />
            <button
              type="button"
              onClick={() => openAdd()}
              className="rounded-lg border border-mist-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
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

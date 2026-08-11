import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClasses, type ClassEntry, type DayOfWeek } from '../store'
import WeekGrid from '../components/timetable/WeekGrid'
import DayList from '../components/timetable/DayList'
import ClassFormSheet from '../components/timetable/ClassFormSheet'

export default function Timetable() {
  const classes = useClasses()
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

      <WeekGrid classes={classes} onEdit={openEdit} />
      <DayList classes={classes} onEdit={openEdit} onAdd={openAdd} />

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

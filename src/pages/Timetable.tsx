import { useMemo, useState } from 'react'
import { useClasses, type ClassEntry } from '../data/timetableBlocks'
import { useUpcomingSessions } from '../data/sessions'
import type { DayOfWeek } from '../data/types'
import { addDays, dayKeyForDate, formatTimeLabel, toIsoDate, toMinutes } from '../lib/time'
import WeekGrid from '../components/timetable/WeekGrid'
import DayList from '../components/timetable/DayList'
import ClassFormSheet from '../components/timetable/ClassFormSheet'
import UploadDocumentButton from '../components/documents/UploadDocumentButton'

const UPCOMING_DAYS = 14

interface UpcomingClass {
  entry: ClassEntry
  sessionTitle: string | null
}

interface UpcomingDay {
  dateIso: string
  label: string
  classes: UpcomingClass[]
}

export default function Timetable() {
  const { data: classes = [], isLoading, error } = useClasses()
  const { data: sessions = [] } = useUpcomingSessions(UPCOMING_DAYS)
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

  const upcomingDays = useMemo(() => {
    const sessionByKey = new Map(sessions.map((s) => [`${s.subject}::${s.scheduledDate}`, s]))
    const today = new Date()
    const days: UpcomingDay[] = []

    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const date = addDays(today, i)
      const dateIso = toIsoDate(date)
      const dayKey = dayKeyForDate(date)
      const dayClasses = classes
        .filter((c) => c.day === dayKey)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
        .map((entry) => {
          const session = sessionByKey.get(`${entry.subject}::${dateIso}`)
          const sessionTitle = session
            ? `Session${session.sessionNumber ? ` ${session.sessionNumber}` : ''}: ${session.title}`
            : null
          return { entry, sessionTitle }
        })

      if (dayClasses.length > 0) {
        days.push({
          dateIso,
          label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
          classes: dayClasses,
        })
      }
    }

    return days
  }, [classes, sessions])

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Timetable</h1>
          <p className="mt-1 text-sm text-mist">Your classes, day by day.</p>
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
          <section>
            <h2 className="text-sm font-semibold text-ink">Upcoming</h2>
            {upcomingDays.length === 0 ? (
              <p className="mt-2 text-sm text-mist">No classes in the next {UPCOMING_DAYS} days.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {upcomingDays.map((day) => (
                  <div key={day.dateIso} className="rounded-xl border border-mist-line bg-paper-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-mist">{day.label}</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {day.classes.map(({ entry, sessionTitle }) => (
                        <li key={entry.id} className="flex items-start justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <span className="text-ink">{entry.subject || '(untitled class)'}</span>
                            {sessionTitle && <p className="text-xs text-mist">{sessionTitle}</p>}
                          </div>
                          <span className="shrink-0 text-xs text-mist">
                            {formatTimeLabel(entry.startTime)}–{formatTimeLabel(entry.endTime)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Weekly schedule</h2>
            <p className="mt-0.5 text-sm text-mist">Tap a class to edit it.</p>
            <div className="mt-2">
              <WeekGrid classes={classes} onEdit={openEdit} />
              <DayList classes={classes} onEdit={openEdit} onAdd={openAdd} />
            </div>
          </section>
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

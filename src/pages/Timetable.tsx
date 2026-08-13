import { useMemo, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { useClasses, type ClassEntry } from '../data/timetableBlocks'
import { useUpcomingSessions } from '../data/sessions'
import { useClassOccurrenceStatuses, useSetClassOccurrenceStatus } from '../data/classOccurrences'
import type { DayOfWeek } from '../data/types'
import { buildUpcomingOccurrences, type ClassOccurrence } from '../lib/sessionRollover'
import { formatTimeLabel, toIsoDate } from '../lib/time'
import ClassStatusControl from '../components/ClassStatusControl'
import ClassFormSheet from '../components/timetable/ClassFormSheet'
import ExcelSessionImportSheet from '../components/timetable/ExcelSessionImportSheet'
import UploadDocumentButton from '../components/documents/UploadDocumentButton'

const UPCOMING_DAYS = 14

interface UpcomingDay {
  dateIso: string
  label: string
  occurrences: ClassOccurrence[]
}

export default function Timetable() {
  const { data: classes = [], isLoading, error } = useClasses()
  const { data: sessions = [] } = useUpcomingSessions(UPCOMING_DAYS)
  const now = useMemo(() => new Date(), [])
  const rangeEndIso = useMemo(() => {
    const end = new Date(now)
    end.setDate(end.getDate() + UPCOMING_DAYS)
    return toIsoDate(end)
  }, [now])
  const { data: classOccurrences = new Map() } = useClassOccurrenceStatuses(toIsoDate(now), rangeEndIso)
  const setClassOccurrenceStatus = useSetClassOccurrenceStatus()
  const [editing, setEditing] = useState<ClassEntry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [excelImportOpen, setExcelImportOpen] = useState(false)
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
    const occurrences = buildUpcomingOccurrences(classes, sessions, classOccurrences, now, UPCOMING_DAYS)
    const byDate = new Map<string, ClassOccurrence[]>()
    for (const occ of occurrences) {
      const list = byDate.get(occ.dateIso) ?? []
      list.push(occ)
      byDate.set(occ.dateIso, list)
    }

    const days: UpcomingDay[] = []
    for (const [dateIso, dayOccurrences] of byDate) {
      days.push({
        dateIso,
        label: new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        occurrences: dayOccurrences,
      })
    }
    return days.sort((a, b) => a.dateIso.localeCompare(b.dateIso))
  }, [classes, sessions, classOccurrences, now])

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Timetable</h1>
          <p className="mt-1 text-sm text-mist">Your classes, day by day.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setExcelImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-mist-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Upload sheet
          </button>
          <button
            type="button"
            onClick={() => openAdd()}
            className="rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep"
          >
            + Add class
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-mist">Loading your timetable…</p>}
      {error && <p className="text-sm text-red-600">Could not load your timetable. Try refreshing.</p>}

      {!isLoading && classes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mist-line bg-paper-raised p-6 text-center">
          <p className="text-sm font-medium text-ink-soft">No classes yet</p>
          <p className="mt-1 text-sm text-mist">
            For best accuracy, run your timetable and syllabus through an AI first and upload the
            Excel it gives you back — or upload a photo or PDF directly, once per term.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setExcelImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Upload sheet (recommended)
            </button>
            <UploadDocumentButton
              label="Upload photo or PDF"
              helperText="A photo or PDF of your class schedule."
              className="rounded-lg border border-mist-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
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
            <p className="mt-0.5 text-xs text-mist">
              Mark a class postponed or cancelled and its reading rolls forward to the next time it
              actually happens.
            </p>
            {upcomingDays.length === 0 ? (
              <p className="mt-2 text-sm text-mist">No classes in the next {UPCOMING_DAYS} days.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {upcomingDays.map((day) => (
                  <div key={day.dateIso} className="rounded-xl border border-mist-line bg-paper-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-mist">{day.label}</p>
                    <ul className="mt-1.5 flex flex-col gap-2">
                      {day.occurrences.map(({ entry, dateIso, status, session }) => (
                        <li key={entry.id} className="flex items-start gap-2 text-sm">
                          <ClassStatusControl
                            status={status ?? 'pending'}
                            onSetStatus={(next) =>
                              setClassOccurrenceStatus.mutate({ timetableBlockId: entry.id, dateIso, status: next })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => openEdit(entry)}
                            className="min-w-0 flex-1 rounded text-left hover:opacity-70"
                          >
                            <span className={status === 'cancelled' ? 'text-mist' : 'text-ink'}>
                              {entry.subject || '(untitled class)'}
                            </span>
                            {session && (
                              <p className="text-xs text-mist">
                                Session{session.sessionNumber ? ` ${session.sessionNumber}` : ''}: {session.title}
                                {session.readingMaterial ? ` — read: ${session.readingMaterial}` : ''}
                              </p>
                            )}
                          </button>
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

      {excelImportOpen && <ExcelSessionImportSheet onClose={() => setExcelImportOpen(false)} />}
    </div>
  )
}

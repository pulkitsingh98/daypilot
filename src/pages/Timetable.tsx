import { useMemo, useState } from 'react'
import { FileSpreadsheet, GraduationCap } from 'lucide-react'
import { useClasses, type ClassEntry } from '../data/timetableBlocks'
import { useUpcomingSessions } from '../data/sessions'
import { useClassOccurrenceStatuses, useSetClassOccurrenceStatus } from '../data/classOccurrences'
import { useTasks, useToggleTaskDone, type Task } from '../data/tasks'
import type { DayOfWeek } from '../data/types'
import { buildUpcomingOccurrences, type ClassOccurrence } from '../lib/sessionRollover'
import { addDays, formatTimeLabel, toIsoDate } from '../lib/time'
import ClassStatusControl from '../components/ClassStatusControl'
import ClassFormSheet from '../components/timetable/ClassFormSheet'
import ExcelSessionImportSheet from '../components/timetable/ExcelSessionImportSheet'
import UploadDocumentButton from '../components/documents/UploadDocumentButton'

// How far to project classes that have no session data at all (manually
// added, purely weekly-recurring) — those never end on their own, so
// something has to bound them. Session-backed subjects aren't capped by
// this at all; they show every session there is, however far out.
const FALLBACK_PROJECTION_DAYS = 180

type WindowOption = '7' | '14' | 'all'
const WINDOW_OPTIONS: { value: WindowOption; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: 'all', label: 'All' },
]

interface UpcomingDay {
  dateIso: string
  label: string
  occurrences: ClassOccurrence[]
  moodleItems: Task[]
}

export default function Timetable() {
  const { data: classes = [], isLoading, error } = useClasses()
  const { data: sessions = [] } = useUpcomingSessions()
  const { data: tasks = [] } = useTasks()
  const toggleTaskDone = useToggleTaskDone()
  const moodleTasks = useMemo(() => tasks.filter((t) => t.source === 'moodle'), [tasks])
  const openMoodleTasks = useMemo(
    () =>
      moodleTasks
        .filter((t) => t.status !== 'done')
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [moodleTasks],
  )
  const [showMoodleSection, setShowMoodleSection] = useState(false)
  const now = useMemo(() => new Date(), [])
  const todayIso = useMemo(() => toIsoDate(now), [now])
  const moodleTasksByDate = useMemo(() => {
    // Only today-forward — an overdue, undone Moodle deadline stays visible via the dedicated
    // Moodle section below (sorted oldest-due-first) instead of cluttering Upcoming indefinitely.
    const map = new Map<string, Task[]>()
    for (const task of moodleTasks) {
      if (!task.dueDate || task.status === 'done' || task.dueDate < todayIso) continue
      const list = map.get(task.dueDate) ?? []
      list.push(task)
      map.set(task.dueDate, list)
    }
    return map
  }, [moodleTasks, todayIso])
  const rangeEndIso = useMemo(() => {
    const fallbackEnd = new Date(now)
    fallbackEnd.setDate(fallbackEnd.getDate() + FALLBACK_PROJECTION_DAYS)
    const fallbackIso = toIsoDate(fallbackEnd)
    const maxSessionIso = sessions.reduce((max, s) => (s.scheduledDate > max ? s.scheduledDate : max), '')
    return maxSessionIso > fallbackIso ? maxSessionIso : fallbackIso
  }, [now, sessions])
  const projectionDays = useMemo(
    () => Math.ceil((new Date(`${rangeEndIso}T00:00:00`).getTime() - now.getTime()) / 86_400_000) + 1,
    [now, rangeEndIso],
  )
  const { data: classOccurrences = new Map() } = useClassOccurrenceStatuses(toIsoDate(now), rangeEndIso)
  const setClassOccurrenceStatus = useSetClassOccurrenceStatus()
  const [editing, setEditing] = useState<ClassEntry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [excelImportOpen, setExcelImportOpen] = useState(false)
  const [defaultDay, setDefaultDay] = useState<DayOfWeek>('mon')
  const [windowOption, setWindowOption] = useState<WindowOption>('all')

  const displayEndIso = useMemo(() => {
    if (windowOption === 'all') return rangeEndIso
    return toIsoDate(addDays(now, Number(windowOption)))
  }, [windowOption, rangeEndIso, now])

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
    const occurrences = buildUpcomingOccurrences(classes, sessions, classOccurrences, now, projectionDays)
    const byDate = new Map<string, ClassOccurrence[]>()
    for (const occ of occurrences) {
      const list = byDate.get(occ.dateIso) ?? []
      list.push(occ)
      byDate.set(occ.dateIso, list)
    }

    const dateIsos = new Set([...byDate.keys(), ...moodleTasksByDate.keys()])
    const days: UpcomingDay[] = []
    for (const dateIso of dateIsos) {
      days.push({
        dateIso,
        label: new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        occurrences: byDate.get(dateIso) ?? [],
        moodleItems: moodleTasksByDate.get(dateIso) ?? [],
      })
    }
    return days.sort((a, b) => a.dateIso.localeCompare(b.dateIso))
  }, [classes, sessions, classOccurrences, now, projectionDays, moodleTasksByDate])

  const visibleDays = useMemo(
    () => upcomingDays.filter((d) => d.dateIso <= displayEndIso),
    [upcomingDays, displayEndIso],
  )

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
            onClick={() => setShowMoodleSection((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
              showMoodleSection
                ? 'border-tide bg-tide text-paper-raised'
                : 'border-tide/40 text-tide hover:bg-tide-soft'
            }`}
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Moodle{openMoodleTasks.length > 0 ? ` (${openMoodleTasks.length})` : ''}
          </button>
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

      {showMoodleSection && (
        <section className="mb-4 rounded-xl border border-tide/40 bg-tide-soft p-3">
          <h2 className="text-sm font-semibold text-ink">From Moodle</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Deadlines synced from your Moodle calendar export.{' '}
            <a href="/settings" className="font-medium text-tide underline hover:no-underline">
              Manage in Settings
            </a>
            .
          </p>
          {openMoodleTasks.length === 0 ? (
            <p className="mt-2 text-sm text-mist">
              No Moodle deadlines yet — add your calendar URL in Settings to sync them in.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {openMoodleTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 rounded-lg bg-paper-raised p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleTaskDone.mutate({ id: task.id, done: true })}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-tide"
                    aria-label={`Mark "${task.title}" done`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">{task.title}</p>
                    <p className="text-xs text-mist">
                      {task.subject ? `${task.subject} · ` : ''}
                      {task.dueDate && task.dueDate < todayIso ? (
                        <span className="font-medium text-danger">
                          Overdue — was due {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        task.dueDate &&
                        `Due ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                      )}
                    </p>
                    {task.notes && <p className="mt-0.5 text-xs text-mist">{task.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isLoading && <p className="text-sm text-mist">Loading your timetable…</p>}
      {error && <p className="text-sm text-danger">Could not load your timetable. Try refreshing.</p>}

      {!isLoading && classes.length === 0 && moodleTasks.length === 0 ? (
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
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Upcoming</h2>
              <div className="flex shrink-0 gap-1 rounded-lg border border-mist-line p-0.5">
                {WINDOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWindowOption(opt.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      windowOption === opt.value
                        ? 'bg-dusk text-paper-raised'
                        : 'text-ink-soft hover:bg-haze'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-0.5 text-xs text-mist">
              Mark a class postponed or cancelled and its reading rolls forward to the next time it
              actually happens.
            </p>
            {visibleDays.length === 0 ? (
              <p className="mt-2 text-sm text-mist">No upcoming classes.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {visibleDays.map((day) => (
                  <div key={day.dateIso} className="rounded-xl border border-mist-line bg-paper-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-mist">{day.label}</p>
                    <ul className="mt-1.5 flex flex-col gap-2">
                      {day.occurrences.map(({ entry, dateIso, status, session, timeUncertain }) => (
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
                            {timeUncertain && (
                              <p className="mt-0.5 text-xs font-medium text-dawn-deep">
                                Time may be wrong — re-upload your sheet to fix it
                              </p>
                            )}
                          </button>
                          <span className={`shrink-0 text-xs ${timeUncertain ? 'text-dawn-deep' : 'text-mist'}`}>
                            {timeUncertain && '~'}
                            {formatTimeLabel(entry.startTime)}–{formatTimeLabel(entry.endTime)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {day.moodleItems.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-1.5 border-t border-tide/20 pt-1.5">
                        {day.moodleItems.map((task) => (
                          <li key={task.id} className="flex items-start gap-2 text-sm">
                            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-tide" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <span className="text-ink">{task.title}</span>
                              <p className="text-xs text-tide">{task.subject || 'Moodle'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-tide-soft px-2 py-0.5 text-xs font-medium text-tide">
                              Moodle
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
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

import { BookOpen } from 'lucide-react'
import type { ClassEntry } from '../../data/timetableBlocks'
import type { DayOfWeek } from '../../data/types'
import { DAYS, formatTimeLabel, toMinutes } from '../../lib/time'

interface DayListProps {
  classes: ClassEntry[]
  onEdit: (entry: ClassEntry) => void
  onAdd: (day: DayOfWeek) => void
}

export default function DayList({ classes, onEdit, onAdd }: DayListProps) {
  return (
    <div className="divide-y divide-mist-line rounded-xl border border-mist-line bg-paper-raised md:hidden">
      {DAYS.map((day) => {
        const dayClasses = classes
          .filter((entry) => entry.day === day.key)
          .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))

        return (
          <section key={day.key} className="py-3">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-semibold text-ink">{day.label}</h2>
              <button
                type="button"
                onClick={() => onAdd(day.key)}
                className="text-xs font-medium text-dusk hover:text-dusk-deep"
              >
                + Add
              </button>
            </div>

            {dayClasses.length === 0 ? (
              <p className="px-4 py-2 text-sm text-mist">No classes</p>
            ) : (
              <ul className="mt-1">
                {dayClasses.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-haze"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-ink">
                          {entry.subject.trim() || '(untitled class)'}
                        </div>
                        <div className="text-xs text-mist">
                          {formatTimeLabel(entry.startTime)} – {formatTimeLabel(entry.endTime)}
                        </div>
                      </div>
                      {entry.prepRule && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-amber-600">
                          <BookOpen className="h-3 w-3" aria-hidden="true" /> prep
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

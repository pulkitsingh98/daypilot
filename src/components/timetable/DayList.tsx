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
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white md:hidden">
      {DAYS.map((day) => {
        const dayClasses = classes
          .filter((entry) => entry.day === day.key)
          .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))

        return (
          <section key={day.key} className="py-3">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-sm font-semibold text-slate-900">{day.label}</h2>
              <button
                type="button"
                onClick={() => onAdd(day.key)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                + Add
              </button>
            </div>

            {dayClasses.length === 0 ? (
              <p className="px-4 py-2 text-sm text-slate-400">No classes</p>
            ) : (
              <ul className="mt-1">
                {dayClasses.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {entry.subject}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatTimeLabel(entry.startTime)} – {formatTimeLabel(entry.endTime)}
                        </div>
                      </div>
                      {entry.prepRule && (
                        <span className="shrink-0 text-xs text-amber-600">📖 prep</span>
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

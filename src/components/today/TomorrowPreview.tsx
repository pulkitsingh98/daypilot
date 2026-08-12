import type { ClassEntry } from '../../data/timetableBlocks'
import type { DailyPlan } from '../../data/dailyPlans'
import { formatTimeLabel } from '../../lib/time'
import { isPrepScheduledForClass } from '../../lib/todayView'

interface TomorrowPreviewProps {
  classes: ClassEntry[]
  plan: DailyPlan | null
}

export default function TomorrowPreview({ classes, plan }: TomorrowPreviewProps) {
  if (classes.length === 0) return null

  const sorted = [...classes].sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-slate-900">Tomorrow</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {sorted.map((entry) => {
          const scheduled = entry.prepRule ? isPrepScheduledForClass(plan, entry.subject) : null
          return (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-slate-700">
                {entry.subject} · {formatTimeLabel(entry.startTime)}
              </span>
              {scheduled !== null && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    scheduled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {scheduled ? 'Prep scheduled' : 'Prep missing'}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

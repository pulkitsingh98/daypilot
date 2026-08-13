import type { DailyPlan } from '../../data/dailyPlans'
import type { ClassOccurrence } from '../../lib/sessionRollover'
import { formatTimeLabel } from '../../lib/time'
import { isPrepScheduledForClass } from '../../lib/todayView'

interface TomorrowPreviewProps {
  occurrences: ClassOccurrence[]
  plan: DailyPlan | null
}

export default function TomorrowPreview({ occurrences, plan }: TomorrowPreviewProps) {
  const active = occurrences.filter((o) => o.status !== 'cancelled')
  if (active.length === 0) return null

  const sorted = [...active].sort((a, b) => a.entry.startTime.localeCompare(b.entry.startTime))

  return (
    <div className="mb-4 rounded-xl border border-mist-line bg-paper-raised p-3">
      <h2 className="text-sm font-semibold text-ink">Tomorrow</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {sorted.map(({ entry, status }) => {
          const scheduled = entry.prepRule ? isPrepScheduledForClass(plan, entry.subject) : null
          return (
            <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={`truncate ${status === 'postponed' ? 'text-mist line-through' : 'text-ink-soft'}`}>
                {entry.subject} · {formatTimeLabel(entry.startTime)}
              </span>
              {status === 'postponed' ? (
                <span className="shrink-0 rounded-full bg-haze px-2 py-0.5 text-xs font-medium text-mist">
                  Postponed
                </span>
              ) : (
                scheduled !== null && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      scheduled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {scheduled ? 'Prep scheduled' : 'Prep missing'}
                  </span>
                )
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

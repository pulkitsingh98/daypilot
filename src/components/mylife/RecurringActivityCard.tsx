import type { RecurringActivity } from '../../data/recurringActivities'
import { categoryMeta } from '../../lib/recurringActivities'
import { dayLabel, formatTimeLabel } from '../../lib/time'

interface RecurringActivityCardProps {
  activity: RecurringActivity
  onEdit: (activity: RecurringActivity) => void
}

export default function RecurringActivityCard({ activity, onEdit }: RecurringActivityCardProps) {
  const category = categoryMeta(activity.category)

  const scheduleParts: string[] = []
  if (activity.day) scheduleParts.push(dayLabel(activity.day))
  else scheduleParts.push('No fixed day')
  if (activity.preferredTime) scheduleParts.push(formatTimeLabel(activity.preferredTime))
  if (activity.durationMinutes) scheduleParts.push(`${activity.durationMinutes} min`)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-slate-900">{activity.title}</h3>
        <button
          type="button"
          onClick={() => onEdit(activity)}
          aria-label={`Edit ${activity.title}`}
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✏️
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">{scheduleParts.join(' · ')}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${category.chipClass}`}>
          {category.label}
        </span>
        {activity.timesPerWeek && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {activity.timesPerWeek}x/week
          </span>
        )}
        {activity.isFlexible && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Flexible
          </span>
        )}
      </div>
    </div>
  )
}

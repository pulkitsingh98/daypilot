import { AlertTriangle, Pencil } from 'lucide-react'
import { useLogGoalMinutes, type Goal } from '../../data/goals'

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
}

const QUICK_LOG_MINUTES = [15, 30, 60]

export default function GoalCard({ goal, onEdit }: GoalCardProps) {
  const logGoalMinutes = useLogGoalMinutes()
  const pct =
    goal.weeklyTargetMinutes > 0
      ? Math.min(100, Math.round((goal.minutesThisWeek / goal.weeklyTargetMinutes) * 100))
      : 0
  const isZero = goal.minutesThisWeek === 0

  return (
    <div className="rounded-xl border border-mist-line bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{goal.title}</h3>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label={`Edit ${goal.title}`}
          className="shrink-0 rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs text-mist">
          <span>
            {goal.minutesThisWeek} / {goal.weeklyTargetMinutes} min this week
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-haze">
          <div
            className="h-full rounded-full bg-dusk transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {isZero && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <span>No time logged this week</span>
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        {QUICK_LOG_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => logGoalMinutes.mutate({ goalId: goal.id, deltaMinutes: minutes })}
            className="rounded-full border border-mist-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-haze"
          >
            +{minutes}m
          </button>
        ))}
      </div>
    </div>
  )
}

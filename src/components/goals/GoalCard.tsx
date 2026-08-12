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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{goal.title}</h3>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label={`Edit ${goal.title}`}
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✏️
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs text-slate-500">
          <span>
            {goal.minutesThisWeek} / {goal.weeklyTargetMinutes} min this week
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#cde2fb]">
          <div
            className="h-full rounded-full bg-[#2a78d6] transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {isZero && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#d03b3b]">
          <span aria-hidden="true">⚠️</span>
          <span>No time logged this week</span>
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        {QUICK_LOG_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => logGoalMinutes.mutate({ goalId: goal.id, deltaMinutes: minutes })}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            +{minutes}m
          </button>
        ))}
      </div>
    </div>
  )
}

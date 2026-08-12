import type { ClassEntry } from '../../data/timetableBlocks'
import type { DailyPlan } from '../../data/dailyPlans'
import type { Task } from '../../data/tasks'
import { buildTimelineItems } from '../../lib/todayView'
import { wasTaskCompletedOn, computeDayCompletion } from '../../lib/dayCompletion'
import { formatTimeLabel } from '../../lib/time'

interface DayDetailProps {
  dateIso: string
  classesForDay: ClassEntry[]
  plan: DailyPlan | undefined
  tasksById: Map<string, Task>
}

export default function DayDetail({ dateIso, classesForDay, plan, tasksById }: DayDetailProps) {
  const items = buildTimelineItems(classesForDay, plan ?? null)
  const completion = computeDayCompletion(plan, dateIso, tasksById)

  const dateLabel = new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{dateLabel}</h3>
        {completion.total > 0 && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {completion.done}/{completion.total} done
          </span>
        )}
      </div>

      {!plan && items.length === 0 && (
        <p className="mt-2 text-sm text-slate-400">No plan was generated for this day.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((item) => {
            const task = item.taskId ? tasksById.get(item.taskId) : undefined
            const done = item.taskId ? wasTaskCompletedOn(task, dateIso) : null

            return (
              <li key={item.key} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className={done ? 'text-slate-400 line-through' : 'text-slate-800'}>
                    {item.title}
                  </span>
                  <span className="ml-1.5 text-xs text-slate-400">
                    {formatTimeLabel(item.start)}–{formatTimeLabel(item.end)}
                  </span>
                </div>
                {item.kind === 'class' ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Fixed
                  </span>
                ) : done !== null ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {done ? 'Done' : 'Not completed'}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {plan && plan.deferred.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Deferred that day
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {plan.deferred.map((d, i) => (
              <li key={i} className="text-sm text-slate-600">
                {d.title}
                {d.reason && <span className="text-xs text-slate-400"> — {d.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan?.note && <p className="mt-3 text-xs italic text-slate-400">"{plan.note}"</p>}
    </div>
  )
}

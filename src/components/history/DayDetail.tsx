import type { ClassEntry } from '../../data/timetableBlocks'
import type { DailyPlan } from '../../data/dailyPlans'
import type { Task } from '../../data/tasks'
import { occurrenceKey, type ClassOccurrenceMap } from '../../data/classOccurrences'
import { buildTimelineItems } from '../../lib/todayView'
import { wasTimelineItemCompletedOn, computeDayCompletion } from '../../lib/dayCompletion'
import { formatTimeLabel } from '../../lib/time'

interface DayDetailProps {
  dateIso: string
  classesForDay: ClassEntry[]
  plan: DailyPlan | undefined
  tasksById: Map<string, Task>
  classOccurrences: ClassOccurrenceMap
}

const STATUS_BADGE: Record<'done' | 'postponed' | 'cancelled' | 'not-completed', string> = {
  done: 'bg-success-soft text-success',
  postponed: 'bg-warning-soft text-dawn-deep',
  cancelled: 'bg-mist-line text-mist',
  'not-completed': 'bg-haze text-mist',
}

export default function DayDetail({ dateIso, classesForDay, plan, tasksById, classOccurrences }: DayDetailProps) {
  const items = buildTimelineItems(classesForDay, plan ?? null)
  const completedItemKeys = plan?.completedItemKeys ?? []
  const completion = computeDayCompletion(plan, dateIso, tasksById, classesForDay, classOccurrences)

  const dateLabel = new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mt-4 rounded-xl border border-mist-line bg-paper-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{dateLabel}</h3>
        {completion.total > 0 && (
          <span className="shrink-0 rounded-full bg-haze px-2 py-0.5 text-xs font-medium text-ink-soft">
            {completion.done}/{completion.total} done
          </span>
        )}
      </div>

      {!plan && items.length === 0 && (
        <p className="mt-2 text-sm text-mist">No plan was generated for this day.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((item) => {
            const occurrenceStatus = item.classId ? classOccurrences.get(occurrenceKey(item.classId, dateIso)) : undefined
            const done = wasTimelineItemCompletedOn(item, tasksById, completedItemKeys, classOccurrences, dateIso)
            const badgeKey: keyof typeof STATUS_BADGE =
              occurrenceStatus === 'postponed' || occurrenceStatus === 'cancelled'
                ? occurrenceStatus
                : done
                  ? 'done'
                  : 'not-completed'

            return (
              <li key={item.key} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className={done ? 'text-mist line-through' : 'text-ink'}>
                    {item.title}
                  </span>
                  <span className="ml-1.5 font-mono text-xs text-mist">
                    {formatTimeLabel(item.start)}–{formatTimeLabel(item.end)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.kind === 'class' && (
                    <span className="rounded-full bg-haze px-2 py-0.5 text-[10px] font-medium text-mist">
                      Fixed
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[badgeKey]}`}>
                    {badgeKey === 'not-completed'
                      ? 'Not completed'
                      : badgeKey === 'done'
                        ? 'Done'
                        : badgeKey === 'postponed'
                          ? 'Postponed'
                          : 'Cancelled'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {plan && plan.deferred.length > 0 && (
        <div className="mt-3 border-t border-mist-line pt-2">
          <p className="text-xs font-medium uppercase tracking-wide text-mist">
            Deferred that day
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {plan.deferred.map((d, i) => (
              <li key={i} className="text-sm text-ink-soft">
                {d.title}
                {d.reason && <span className="text-xs text-mist"> — {d.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan?.note && <p className="mt-3 text-xs italic text-mist">"{plan.note}"</p>}
    </div>
  )
}

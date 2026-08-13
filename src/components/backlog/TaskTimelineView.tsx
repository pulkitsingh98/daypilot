import type { Task } from '../../data/tasks'
import { buildTaskTimeline, type TaskBarStatus } from '../../lib/taskTimeline'

const DAY_WIDTH = 28
const LABEL_WIDTH = 140

const STATUS_META: Record<TaskBarStatus, { bar: string; label: string }> = {
  'on-track': { bar: 'bg-dusk', label: 'On track' },
  'due-soon': { bar: 'bg-amber-500', label: 'Due soon' },
  overdue: { bar: 'bg-red-500', label: 'Overdue — still open' },
}

interface TaskTimelineViewProps {
  tasks: Task[]
  now: Date
}

/** Each open task as a horizontal bar from when it was created to its due date — or, if it's still open past that date, to today, so a task that keeps getting pushed visibly keeps extending instead of just quietly sitting there. */
export default function TaskTimelineView({ tasks, now }: TaskTimelineViewProps) {
  const { totalDays, dayLabels, bars } = buildTaskTimeline(tasks, now)

  if (bars.length === 0) {
    return <p className="text-sm text-mist">No open tasks to show on the timeline.</p>
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-mist">
        {(Object.entries(STATUS_META) as [TaskBarStatus, (typeof STATUS_META)[TaskBarStatus]][]).map(
          ([status, meta]) => (
            <span key={status} className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full ${meta.bar}`} /> {meta.label}
            </span>
          ),
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-mist-line bg-paper-raised">
        <div style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}>
          <div className="flex border-b border-mist-line">
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-mist-line bg-paper-raised p-2 text-xs font-semibold text-mist"
              style={{ width: LABEL_WIDTH }}
            >
              Task
            </div>
            <div className="flex flex-1">
              {dayLabels.map((d) => (
                <div
                  key={d.dateIso}
                  style={{ width: DAY_WIDTH }}
                  className={`shrink-0 border-l border-mist-line p-1 text-center text-[9px] ${
                    d.isToday ? 'bg-haze font-semibold text-dusk-deep' : 'text-mist'
                  }`}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </div>

          {bars.map(({ task, startOffset, spanDays, status }) => (
            <div key={task.id} className="flex border-b border-mist-line last:border-b-0">
              <div
                className="sticky left-0 z-10 shrink-0 truncate border-r border-mist-line bg-paper-raised p-2 text-xs font-medium text-ink"
                style={{ width: LABEL_WIDTH }}
                title={task.title}
              >
                {task.title}
              </div>
              <div className="relative flex-1" style={{ height: 36 }}>
                <div
                  className={`absolute top-1.5 h-6 rounded-full ${STATUS_META[status].bar}`}
                  style={{ left: startOffset * DAY_WIDTH, width: spanDays * DAY_WIDTH - 2 }}
                  title={`${task.title} — ${spanDays} day${spanDays === 1 ? '' : 's'}${
                    task.snoozeCount > 0 ? ` · snoozed ${task.snoozeCount}x` : ''
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

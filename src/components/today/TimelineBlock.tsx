import { useState } from 'react'
import type { TimelineItem } from '../../lib/todayView'
import { formatTimeLabel } from '../../lib/time'
import type { Task } from '../../data/tasks'
import TaskDoneToggle from '../backlog/TaskDoneToggle'

interface TimelineBlockProps {
  item: TimelineItem
  /** The task this block is linked to, if any — lets it be struck off directly from the timeline. */
  task?: Task
}

export default function TimelineBlock({ item, task }: TimelineBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const isClass = item.kind === 'class'
  const done = task?.status === 'done'

  return (
    <div
      className={`w-full rounded-xl border p-3 transition-colors ${
        isClass
          ? 'border-slate-300 bg-slate-100 hover:bg-slate-200'
          : done
            ? 'border-slate-200 bg-white opacity-60 hover:bg-slate-50'
            : 'border-indigo-200 bg-white hover:bg-indigo-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {task && <TaskDoneToggle task={task} className="mt-0.5" />}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isClass ? (
                  <span className="shrink-0 rounded-full bg-slate-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                    Fixed
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                    {item.subtitle || 'Planned'}
                  </span>
                )}
                <span
                  className={`truncate text-sm font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                >
                  {item.title}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {formatTimeLabel(item.start)} – {formatTimeLabel(item.end)}
              </div>
            </div>
            <span className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
              ⌄
            </span>
          </div>

          {expanded && (
            <div className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600">
              {isClass ? (
                item.prepRule ? (
                  <p>
                    Prep due: {item.prepRule.description} ({item.prepRule.minutes} min, preferably{' '}
                    {formatTimeLabel(item.prepRule.windowStart)}–{formatTimeLabel(item.prepRule.windowEnd)}
                    ).
                  </p>
                ) : (
                  <p>Fixed class — can't be moved.</p>
                )
              ) : (
                <p>{item.reason || 'No reason given.'}</p>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

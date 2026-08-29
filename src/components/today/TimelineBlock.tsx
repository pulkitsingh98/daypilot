import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { ItemStatus, TimelineItem } from '../../lib/todayView'
import { formatTimeLabel } from '../../lib/time'
import type { Task } from '../../data/tasks'
import TaskDoneToggle from '../backlog/TaskDoneToggle'
import ClassStatusControl, { CLASS_STATUS_META } from '../ClassStatusControl'

interface TimelineBlockProps {
  item: TimelineItem
  /** The task this block is linked to, if any — lets it be struck off directly from the timeline. */
  task?: Task
  status: ItemStatus
  /** Only meaningful for a class item whose status is 'postponed'. */
  rescheduledDate?: string | null
  /** Sets status for items with no linked task (classes, buffer/meal blocks). null resets to pending. Ignored when `task` is set — TaskDoneToggle handles those. */
  onSetStatus: (status: Exclude<ItemStatus, 'pending'> | null, rescheduledDate?: string | null) => void
}

export default function TimelineBlock({ item, task, status, rescheduledDate, onSetStatus }: TimelineBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const isClass = item.kind === 'class'
  const done = status === 'done'

  return (
    <div className="relative">
      {/* Spine node: square = fixed and immovable, circle = flexible, filled = done. */}
      <span
        className={`absolute -left-[26px] top-3.5 h-3.5 w-3.5 border-2 border-dusk bg-paper-raised ${
          isClass ? 'rounded-[4px]' : 'rounded-full'
        } ${done ? 'bg-dusk' : ''}`}
      >
        {done && (
          <span className="flex h-full w-full items-center justify-center text-paper-raised">
            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </span>

      <div
        className={`w-full rounded-xl border p-3 transition-colors ${
          isClass ? 'border-mist-line bg-haze hover:bg-mist-line/70' : 'border-mist-line bg-paper-raised hover:bg-haze'
        }`}
      >
        <div className="flex items-start gap-2">
          {task ? (
            <TaskDoneToggle task={task} className="mt-0.5" />
          ) : isClass ? (
            <ClassStatusControl status={status} rescheduledDate={rescheduledDate} onSetStatus={onSetStatus} />
          ) : (
            <input
              type="checkbox"
              checked={done}
              onChange={() => onSetStatus(done ? null : 'done')}
              onClick={(e) => e.stopPropagation()}
              aria-label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-mist-line"
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isClass ? (
                    <span className="shrink-0 rounded-full bg-dusk px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-raised">
                      Fixed
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-haze px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dusk">
                      {item.subtitle || 'Planned'}
                    </span>
                  )}
                  {(status === 'postponed' || status === 'cancelled') && (
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper-raised ${CLASS_STATUS_META[status].dot}`}
                    >
                      {CLASS_STATUS_META[status].label}
                    </span>
                  )}
                  <span
                    data-done={done}
                    className={`strike-target truncate text-sm font-semibold ${done ? 'text-mist' : 'text-ink'}`}
                  >
                    {item.title}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-xs text-mist">
                  {formatTimeLabel(item.start)} – {formatTimeLabel(item.end)}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-mist transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </div>

            {expanded && (
              <div className="mt-2 border-t border-mist-line pt-2 text-sm text-ink-soft">
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
    </div>
  )
}

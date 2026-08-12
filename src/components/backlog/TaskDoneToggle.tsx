import { useState } from 'react'
import { useToggleTaskDone, type Task } from '../../data/tasks'
import { useLogTaskActual } from '../../data/taskHistory'
import { todayIso } from '../../lib/tasks'

interface TaskDoneToggleProps {
  task: Task
  className?: string
}

/**
 * The one strike-off control used everywhere a task can be marked done
 * (Backlog, Subject detail, Today's timeline) — same mutation, same tasks
 * query cache, so checking it off in one place is reflected everywhere else.
 * Checking it off is instant; if the task has an estimate, a small
 * dismissible prompt offers to log how long it actually took, which is what
 * feeds the planner's historical-duration calibration.
 */
export default function TaskDoneToggle({ task, className }: TaskDoneToggleProps) {
  const done = task.status === 'done'
  const toggleDone = useToggleTaskDone()
  const logActual = useLogTaskActual()
  const [showLogPrompt, setShowLogPrompt] = useState(false)
  const [minutesInput, setMinutesInput] = useState('')

  function handleToggle() {
    const nextDone = !done
    toggleDone.mutate({ id: task.id, done: nextDone })
    if (nextDone && task.estimatedMinutes) {
      setMinutesInput(String(task.estimatedMinutes))
      setShowLogPrompt(true)
    } else {
      setShowLogPrompt(false)
    }
  }

  function handleLog() {
    const minutes = Number(minutesInput)
    if (Number.isFinite(minutes) && minutes > 0) {
      logActual.mutate({
        type: task.type,
        subject: task.subject,
        plannedMinutes: task.estimatedMinutes ?? Math.round(minutes),
        actualMinutes: Math.round(minutes),
        completedDate: todayIso(),
      })
    }
    setShowLogPrompt(false)
  }

  return (
    <div className={`relative inline-flex ${className ?? ''}`}>
      <input
        type="checkbox"
        checked={done}
        onChange={handleToggle}
        onClick={(e) => e.stopPropagation()}
        aria-label={done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-mist-line"
      />
      {showLogPrompt && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-6 z-10 flex w-56 flex-wrap items-center gap-2 rounded-lg border border-mist-line bg-paper-raised p-2 text-xs text-ink-soft shadow-lg"
        >
          <span>Took about how long?</span>
          <input
            type="number"
            min={1}
            value={minutesInput}
            onChange={(e) => setMinutesInput(e.target.value)}
            className="w-16 rounded border border-mist-line px-1.5 py-1 text-xs focus:border-dusk focus:outline-none"
          />
          <span>min</span>
          <button
            type="button"
            onClick={handleLog}
            className="font-medium text-dusk hover:text-dusk-deep"
          >
            Log
          </button>
          <button
            type="button"
            onClick={() => setShowLogPrompt(false)}
            className="text-mist hover:text-ink-soft"
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

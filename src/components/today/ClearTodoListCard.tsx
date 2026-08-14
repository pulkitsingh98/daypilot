import { useState } from 'react'
import type { DailyPlan } from '../../data/dailyPlans'
import { useClearTodayPlan } from '../../data/dailyPlans'
import { useSubmitFeedback } from '../../data/userFeedback'

interface ClearTodoListCardProps {
  dateIso: string
  plan: DailyPlan | null
  onRegenerate: (userNote: string) => void
  regenerating: boolean
}

/**
 * Scoped deliberately to TODAY's generated plan only — never touches the
 * Backlog (tasks table), which is the durable list and stays put regardless
 * of what happens to any one day's schedule. Settings' Danger Zone still
 * offers the full-backlog wipe separately, for anyone who actually wants that.
 */
export default function ClearTodoListCard({ dateIso, plan, onRegenerate, regenerating }: ClearTodoListCardProps) {
  const clearTodayPlan = useClearTodayPlan(dateIso)
  const submitFeedback = useSubmitFeedback()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const isEmpty = !plan || (plan.blocks.length === 0 && plan.deferred.length === 0)

  async function handleClear() {
    if (!window.confirm("Clear today's list? This resets Today back to no plan yet — your Backlog stays exactly as it is.")) {
      return
    }
    setError(null)
    try {
      if (message.trim()) {
        await submitFeedback.mutateAsync({ context: 'clear-today-list', message })
      }
      await clearTodayPlan.mutateAsync()
      setMessage('')
      setCleared(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear today's list. Try again.")
    }
  }

  async function handleRegenerate() {
    setError(null)
    setCleared(false)
    if (message.trim()) {
      try {
        await submitFeedback.mutateAsync({ context: 'regenerate-with-note', message })
      } catch {
        // Feedback logging is best-effort — never block the actual regenerate on it.
      }
    }
    onRegenerate(message)
  }

  return (
    <div className="rounded-xl border border-mist-line bg-paper-raised p-3">
      <p className="text-sm font-medium text-ink-soft">Not happy with today's list?</p>
      <label className="mt-2 flex flex-col gap-1">
        <span className="text-xs text-mist">
          Tell us what's off — too packed, wrong priorities, whatever — then have the AI regenerate
          it with that in mind, or just clear it. Optional either way.
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="e.g. reframe the list — too much low-priority stuff up front"
          className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
        />
      </label>

      {cleared && <p className="mt-2 text-sm text-success">Cleared. Thanks for the note.</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {isEmpty && !cleared && <p className="mt-2 text-xs text-mist">Today's list is already empty.</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={regenerating || submitFeedback.isPending}
          onClick={() => void handleRegenerate()}
          className="rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {regenerating ? 'Regenerating…' : 'Regenerate with this note'}
        </button>
        <button
          type="button"
          disabled={isEmpty || clearTodayPlan.isPending || submitFeedback.isPending}
          onClick={() => void handleClear()}
          className="rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearTodayPlan.isPending ? 'Clearing…' : "Clear today's list"}
        </button>
      </div>
    </div>
  )
}

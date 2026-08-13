import { useState } from 'react'
import { useClearTasks, useTasks } from '../../data/tasks'
import { useSubmitFeedback } from '../../data/userFeedback'

/** A quieter, always-visible entry point for the same reset Settings' Danger Zone offers — with a space to say what you wanted different, so that context doesn't just vanish when the list does. */
export default function ClearTodoListCard() {
  const { data: tasks = [] } = useTasks()
  const clearTasks = useClearTasks()
  const submitFeedback = useSubmitFeedback()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cleared, setCleared] = useState(false)
  const isEmpty = tasks.length === 0

  async function handleClear() {
    if (
      !window.confirm(
        `Clear your entire to-do list? This removes all ${tasks.length} task${tasks.length === 1 ? '' : 's'} — open, done, and deferred — and can't be undone.`,
      )
    ) {
      return
    }
    setError(null)
    try {
      if (message.trim()) {
        await submitFeedback.mutateAsync({ context: 'clear-todo-list', message })
      }
      await clearTasks.mutateAsync()
      setMessage('')
      setCleared(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear your to-do list. Try again.')
    }
  }

  return (
    <div className="rounded-xl border border-mist-line bg-paper-raised p-3">
      <p className="text-sm font-medium text-ink-soft">Want a fresh start?</p>
      <label className="mt-2 flex flex-col gap-1">
        <span className="text-xs text-mist">
          Anything you'd want different about your to-do list? Tell us before you clear it — optional.
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="e.g. too many low-priority tasks piling up, wish snoozed items stood out more..."
          className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
        />
      </label>

      {cleared && <p className="mt-2 text-sm text-emerald-700">Cleared. Thanks for the note.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {isEmpty && !cleared && <p className="mt-2 text-xs text-mist">Your to-do list is already empty.</p>}

      <button
        type="button"
        disabled={isEmpty || clearTasks.isPending || submitFeedback.isPending}
        onClick={() => void handleClear()}
        className="mt-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {clearTasks.isPending ? 'Clearing…' : 'Clear to-do list'}
      </button>
    </div>
  )
}

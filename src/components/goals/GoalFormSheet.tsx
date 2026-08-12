import { useState } from 'react'
import { useAddGoal, useDeleteGoal, useUpdateGoal, type Goal, type GoalHorizon } from '../../data/goals'
import { GOAL_HORIZONS } from '../../lib/goals'

interface GoalFormSheetProps {
  initial: Goal | null
  defaultHorizon: GoalHorizon
  onClose: () => void
}

export default function GoalFormSheet({ initial, defaultHorizon, onClose }: GoalFormSheetProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [horizon, setHorizon] = useState<GoalHorizon>(initial?.horizon ?? defaultHorizon)
  const [weeklyTargetMinutes, setWeeklyTargetMinutes] = useState(
    String(initial?.weeklyTargetMinutes ?? 60),
  )
  const [error, setError] = useState<string | null>(null)

  const addGoal = useAddGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const saving = addGoal.isPending || updateGoal.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Enter a goal title.')
      return
    }
    const minutes = Number(weeklyTargetMinutes)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError('Enter a weekly target greater than 0 minutes.')
      return
    }

    const payload = { title: title.trim(), horizon, weeklyTargetMinutes: minutes }
    try {
      if (initial) {
        await updateGoal.mutateAsync({ id: initial.id, input: payload })
      } else {
        await addGoal.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this goal. Try again.')
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (window.confirm(`Delete "${initial.title}"? This can't be undone.`)) {
      try {
        await deleteGoal.mutateAsync(initial.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this goal. Try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {initial ? 'Edit goal' : 'Add goal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish thesis draft"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Goal type</span>
            <select
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            >
              {GOAL_HORIZONS.map((h) => (
                <option key={h.key} value={h.key}>
                  {h.short}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Weekly target (minutes)</span>
            <input
              type="number"
              min={1}
              value={weeklyTargetMinutes}
              onChange={(e) => setWeeklyTargetMinutes(e.target.value)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteGoal.isPending}
                className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

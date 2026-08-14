import { useState } from 'react'
import { X } from 'lucide-react'
import {
  useAddRecurringActivity,
  useDeleteRecurringActivity,
  useUpdateRecurringActivity,
  type ActivityCategory,
  type RecurringActivity,
} from '../../data/recurringActivities'
import type { DayOfWeek } from '../../data/types'
import { ACTIVITY_CATEGORIES } from '../../lib/recurringActivities'
import { DAYS } from '../../lib/time'

interface RecurringActivityFormSheetProps {
  initial: RecurringActivity | null
  onClose: () => void
}

const NO_FIXED_DAY = 'none'

export default function RecurringActivityFormSheet({ initial, onClose }: RecurringActivityFormSheetProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<ActivityCategory>(initial?.category ?? 'sport')
  const [day, setDay] = useState<DayOfWeek | typeof NO_FIXED_DAY>(initial?.day ?? NO_FIXED_DAY)
  const [preferredTime, setPreferredTime] = useState(initial?.preferredTime ?? '')
  const [durationMinutes, setDurationMinutes] = useState(String(initial?.durationMinutes ?? 60))
  const [timesPerWeek, setTimesPerWeek] = useState(String(initial?.timesPerWeek ?? 1))
  const [isFlexible, setIsFlexible] = useState(initial?.isFlexible ?? false)
  const [error, setError] = useState<string | null>(null)

  const addActivity = useAddRecurringActivity()
  const updateActivity = useUpdateRecurringActivity()
  const deleteActivity = useDeleteRecurringActivity()
  const saving = addActivity.isPending || updateActivity.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Enter a title.')
      return
    }

    const duration = Number(durationMinutes)
    const timesWeek = Number(timesPerWeek)

    const payload = {
      title: title.trim(),
      category,
      day: day === NO_FIXED_DAY ? null : day,
      preferredTime: preferredTime || null,
      durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
      timesPerWeek: Number.isFinite(timesWeek) && timesWeek > 0 ? Math.round(timesWeek) : null,
      isFlexible,
    }

    try {
      if (initial) {
        await updateActivity.mutateAsync({ id: initial.id, input: payload })
      } else {
        await addActivity.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this activity. Try again.')
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (window.confirm(`Delete "${initial.title}"? This can't be undone.`)) {
      try {
        await deleteActivity.mutateAsync(initial.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this activity. Try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {initial ? 'Edit activity' : 'Add activity'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Table tennis"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ActivityCategory)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            >
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Preferred day (optional)</span>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as DayOfWeek | typeof NO_FIXED_DAY)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            >
              <option value={NO_FIXED_DAY}>No fixed day</option>
              {DAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Preferred time</span>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Duration (min)</span>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Times per week</span>
            <input
              type="number"
              min={1}
              max={14}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(e.target.value)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <div className="rounded-xl bg-haze p-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink-soft">
                Flexible — the planner may move or shorten this if deadlines are tight
              </span>
              <input
                type="checkbox"
                checked={isFlexible}
                onChange={(e) => setIsFlexible(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-mist-line"
              />
            </label>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteActivity.isPending}
                className="text-sm font-medium text-danger hover:text-danger disabled:opacity-50"
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

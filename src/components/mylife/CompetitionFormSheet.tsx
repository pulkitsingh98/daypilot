import { useState } from 'react'
import { X } from 'lucide-react'
import {
  useAddCompetition,
  useDeleteCompetition,
  useUpdateCompetition,
  type Competition,
  type CompetitionStatus,
} from '../../data/competitions'
import { COMPETITION_STATUSES } from '../../lib/competitions'

interface CompetitionFormSheetProps {
  initial: Competition | null
  onClose: () => void
}

export default function CompetitionFormSheet({ initial, onClose }: CompetitionFormSheetProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [organiser, setOrganiser] = useState(initial?.organiser ?? '')
  const [stage, setStage] = useState(initial?.stage ?? '')
  const [deadlineDate, setDeadlineDate] = useState(initial?.deadlineDate ?? '')
  const [deadlineTime, setDeadlineTime] = useState(initial?.deadlineTime ?? '')
  const [effortEstimateMinutes, setEffortEstimateMinutes] = useState(
    initial?.effortEstimateMinutes ? String(initial.effortEstimateMinutes) : '',
  )
  const [status, setStatus] = useState<CompetitionStatus>(initial?.status ?? 'interested')
  const [error, setError] = useState<string | null>(null)

  const addCompetition = useAddCompetition()
  const updateCompetition = useUpdateCompetition()
  const deleteCompetition = useDeleteCompetition()
  const saving = addCompetition.isPending || updateCompetition.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Enter a title.')
      return
    }

    const effort = Number(effortEstimateMinutes)

    const payload = {
      title: title.trim(),
      organiser: organiser.trim() || null,
      stage: stage.trim() || null,
      deadlineDate: deadlineDate || null,
      deadlineTime: deadlineTime || null,
      effortEstimateMinutes: Number.isFinite(effort) && effort > 0 ? Math.round(effort) : null,
      status,
    }

    try {
      if (initial) {
        await updateCompetition.mutateAsync({ id: initial.id, input: payload })
      } else {
        await addCompetition.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this entry. Try again.')
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (window.confirm(`Delete "${initial.title}"? This can't be undone.`)) {
      try {
        await deleteCompetition.mutateAsync(initial.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this entry. Try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {initial ? 'Edit entry' : 'Add competition or opportunity'}
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
              placeholder="e.g. McKinsey Case Competition"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Organiser</span>
              <input
                type="text"
                value={organiser}
                onChange={(e) => setOrganiser(e.target.value)}
                placeholder="e.g. McKinsey & Co."
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Current stage</span>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="e.g. Round 2"
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Deadline date</span>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Deadline time</span>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Effort estimate (min)</span>
              <input
                type="number"
                min={1}
                value={effortEstimateMinutes}
                onChange={(e) => setEffortEstimateMinutes(e.target.value)}
                placeholder="e.g. 600"
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CompetitionStatus)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              >
                {COMPETITION_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteCompetition.isPending}
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

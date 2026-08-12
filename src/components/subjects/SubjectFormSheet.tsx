import { useState } from 'react'
import {
  useAddSubject,
  useDeleteSubject,
  useUpdateSubject,
  type ProficiencyLevel,
  type Subject,
} from '../../data/subjects'
import { PROFICIENCY_LEVELS } from '../../lib/subjects'

interface SubjectFormSheetProps {
  initial: Subject | null
  onClose: () => void
  /** Called after a successful delete, in addition to onClose (e.g. to navigate away from a detail view). */
  onDeleted?: () => void
}

export default function SubjectFormSheet({ initial, onClose, onDeleted }: SubjectFormSheetProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [proficiency, setProficiency] = useState<ProficiencyLevel | null>(initial?.proficiency ?? null)
  const [error, setError] = useState<string | null>(null)

  const addSubject = useAddSubject()
  const updateSubject = useUpdateSubject()
  const deleteSubject = useDeleteSubject()
  const saving = addSubject.isPending || updateSubject.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) {
      setError('Enter a subject name.')
      return
    }

    const payload = { name: name.trim(), code: code.trim() || null, proficiency }

    try {
      if (initial) {
        await updateSubject.mutateAsync({ id: initial.id, input: payload })
      } else {
        await addSubject.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this subject. Try again.')
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (
      window.confirm(
        `Delete ${initial.name}? Classes and tasks linked to it will keep their other details but lose this subject.`,
      )
    ) {
      try {
        await deleteSubject.mutateAsync(initial.id)
        onDeleted?.()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this subject. Try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {initial ? 'Edit subject' : 'Add subject'}
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
            <span className="text-sm font-medium text-ink-soft">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Chemistry"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Code (optional)</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CHEM 301"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-ink-soft">Proficiency</span>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {PROFICIENCY_LEVELS.map((level) => (
                <button
                  key={level.key}
                  type="button"
                  onClick={() => setProficiency((prev) => (prev === level.key ? null : level.key))}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors ${
                    proficiency === level.key
                      ? 'border-dusk bg-dusk text-paper-raised'
                      : 'border-mist-line bg-paper-raised text-ink-soft hover:bg-haze'
                  }`}
                >
                  <span className="text-sm font-semibold">{level.key}</span>
                  <span className="text-[10px] leading-tight">{level.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-mist">
              Optional — helps the planner pad time estimates for weaker subjects.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteSubject.isPending}
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

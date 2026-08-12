import { useState } from 'react'
import { useUpdateSubject, type ProficiencyLevel } from '../../data/subjects'
import type { NewSubjectRef } from '../../data/timetableBlocks'
import { PROFICIENCY_LEVELS } from '../../lib/subjects'

interface NewSubjectProficiencyPromptProps {
  subjects: NewSubjectRef[]
  onDone: () => void
}

export default function NewSubjectProficiencyPrompt({ subjects, onDone }: NewSubjectProficiencyPromptProps) {
  const [ratings, setRatings] = useState<Record<string, ProficiencyLevel | null>>(() =>
    Object.fromEntries(subjects.map((s) => [s.id, null])),
  )
  const [saving, setSaving] = useState(false)
  const updateSubject = useUpdateSubject()

  async function handleSave() {
    setSaving(true)
    try {
      for (const subject of subjects) {
        const rating = ratings[subject.id]
        if (rating !== null) {
          await updateSubject.mutateAsync({ id: subject.id, input: { name: subject.name, proficiency: rating } })
        }
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-slate-900">New subjects added</h2>
        <p className="mt-1 text-sm text-slate-500">
          Rate how comfortable you are with each — this helps the planner pad prep time for the
          ones you're weaker in. Optional, skip any you're not sure about yet.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {subjects.map((subject) => (
            <div key={subject.id}>
              <p className="text-sm font-medium text-slate-900">{subject.name}</p>
              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {PROFICIENCY_LEVELS.map((level) => (
                  <button
                    key={level.key}
                    type="button"
                    onClick={() =>
                      setRatings((prev) => ({
                        ...prev,
                        [subject.id]: prev[subject.id] === level.key ? null : level.key,
                      }))
                    }
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors ${
                      ratings[subject.id] === level.key
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm font-semibold">{level.key}</span>
                    <span className="text-[10px] leading-tight">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save ratings'}
          </button>
        </div>
      </div>
    </div>
  )
}

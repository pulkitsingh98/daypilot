import { useState } from 'react'
import { useAddClass, useDeleteClass, useUpdateClass, type ClassEntry } from '../../data/timetableBlocks'
import type { DayOfWeek } from '../../data/types'
import { DAYS, toMinutes } from '../../lib/time'
import SubjectPicker from '../subjects/SubjectPicker'

interface ClassFormSheetProps {
  initial: ClassEntry | null
  defaultDay: DayOfWeek
  onClose: () => void
}

type PrepChoice = 'yes' | 'no' | null

export default function ClassFormSheet({ initial, defaultDay, onClose }: ClassFormSheetProps) {
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [day, setDay] = useState<DayOfWeek>(initial?.day ?? defaultDay)
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '10:00')
  const [prepChoice, setPrepChoice] = useState<PrepChoice>(
    initial ? (initial.prepRule ? 'yes' : 'no') : null,
  )
  const [prepMinutes, setPrepMinutes] = useState(String(initial?.prepRule?.minutes ?? 30))
  const [prepDescription, setPrepDescription] = useState(initial?.prepRule?.description ?? '')
  const [prepWindowStart, setPrepWindowStart] = useState(initial?.prepRule?.windowStart ?? '18:00')
  const [prepWindowEnd, setPrepWindowEnd] = useState(initial?.prepRule?.windowEnd ?? '21:00')
  const [error, setError] = useState<string | null>(null)

  const addClass = useAddClass()
  const updateClass = useUpdateClass()
  const deleteClass = useDeleteClass()
  const saving = addClass.isPending || updateClass.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!subject.trim()) {
      setError('Enter a subject name.')
      return
    }
    if (toMinutes(startTime) >= toMinutes(endTime)) {
      setError('End time must be after start time.')
      return
    }
    if (prepChoice === null) {
      setError('Please answer the prep question below.')
      return
    }
    if (prepChoice === 'yes') {
      const minutes = Number(prepMinutes)
      if (!Number.isFinite(minutes) || minutes <= 0) {
        setError('Enter how many minutes of prep this needs.')
        return
      }
      if (!prepDescription.trim()) {
        setError('Describe what the prep involves.')
        return
      }
      if (toMinutes(prepWindowStart) >= toMinutes(prepWindowEnd)) {
        setError('Prep window end must be after its start.')
        return
      }
    }

    const payload: Omit<ClassEntry, 'id'> = {
      subject: subject.trim(),
      day,
      startTime,
      endTime,
      prepRule:
        prepChoice === 'yes'
          ? {
              minutes: Number(prepMinutes),
              description: prepDescription.trim(),
              windowStart: prepWindowStart,
              windowEnd: prepWindowEnd,
            }
          : undefined,
    }

    try {
      if (initial) {
        await updateClass.mutateAsync({ id: initial.id, input: payload })
      } else {
        await addClass.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this class. Try again.')
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (window.confirm(`Delete ${initial.subject}? This can't be undone.`)) {
      try {
        await deleteClass.mutateAsync(initial.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete this class. Try again.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {initial ? 'Edit class' : 'Add class'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Subject</span>
            <SubjectPicker value={subject} onChange={setSubject} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Day of week</span>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as DayOfWeek)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {DAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-700">
              Does this class usually need reading or prep the day before?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPrepChoice('yes')}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  prepChoice === 'yes'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setPrepChoice('no')}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  prepChoice === 'no'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                No
              </button>
            </div>

            {prepChoice === 'yes' && (
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-700">Prep minutes</span>
                  <input
                    type="number"
                    min={1}
                    value={prepMinutes}
                    onChange={(e) => setPrepMinutes(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-700">What's the prep?</span>
                  <input
                    type="text"
                    value={prepDescription}
                    onChange={(e) => setPrepDescription(e.target.value)}
                    placeholder="e.g. read the case"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  />
                </label>
                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-medium text-slate-700">Window start</span>
                    <input
                      type="time"
                      value={prepWindowStart}
                      onChange={(e) => setPrepWindowStart(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-medium text-slate-700">Window end</span>
                    <input
                      type="time"
                      value={prepWindowEnd}
                      onChange={(e) => setPrepWindowEnd(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3">
            {initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteClass.isPending}
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
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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

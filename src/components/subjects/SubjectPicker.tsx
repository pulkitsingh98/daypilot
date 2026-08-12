import { useEffect, useRef, useState } from 'react'
import { useAddSubject, useSubjects } from '../../data/subjects'

interface SubjectPickerProps {
  value: string
  onChange: (name: string) => void
  placeholder?: string
}

/**
 * Free-text input backed by the subjects table: shows matching existing
 * subjects as you type, and offers to create a new one inline. Leaving the
 * typed text as-is without picking a suggestion still works — the write path
 * resolves it to a subject by exact name (see resolveSubjectId) — this just
 * makes browsing/creating easier and cuts down on near-duplicate names.
 */
export default function SubjectPicker({ value, onChange, placeholder }: SubjectPickerProps) {
  const { data: subjects = [] } = useSubjects()
  const addSubject = useAddSubject()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const trimmed = value.trim()
  const matches = trimmed
    ? subjects.filter((s) => s.name.toLowerCase().includes(trimmed.toLowerCase()))
    : subjects
  const exactMatch = subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())

  async function handleCreate() {
    if (!trimmed || addSubject.isPending) return
    const created = await addSubject.mutateAsync({ name: trimmed })
    onChange(created.name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'e.g. Organic Chemistry'}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      {open && (matches.length > 0 || (trimmed.length > 0 && !exactMatch)) && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {matches.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.name)
                setOpen(false)
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              {s.name}
            </button>
          ))}
          {trimmed.length > 0 && !exactMatch && (
            <button
              type="button"
              disabled={addSubject.isPending}
              onClick={() => void handleCreate()}
              className="block w-full px-3 py-1.5 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            >
              {addSubject.isPending ? 'Creating…' : `+ Create "${trimmed}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

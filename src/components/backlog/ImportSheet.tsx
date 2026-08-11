import { useMemo, useState } from 'react'
import { importTasks, type Task, type TaskPriority, type TaskStatus, type TaskType } from '../../store'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '../../lib/tasks'
import {
  guessFieldForHeader,
  normalizeDueDate,
  normalizePriority,
  normalizeStatus,
  normalizeType,
  parseTsv,
  IMPORT_FIELDS,
  type ImportField,
} from '../../lib/tsv'

interface ImportSheetProps {
  onClose: () => void
}

interface PreviewRow {
  key: string
  title: string
  subject: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate: string
  dueDateWarning?: string
}

type Step = 'paste' | 'preview'

export default function ImportSheet({ onClose }: ImportSheetProps) {
  const [step, setStep] = useState<Step>('paste')
  const [rawText, setRawText] = useState('')
  const [hasHeader, setHasHeader] = useState(true)
  const [mappingOverrides, setMappingOverrides] = useState<Record<number, ImportField>>({})
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])

  const parsedMatrix = useMemo(() => parseTsv(rawText), [rawText])
  const headerRow = hasHeader ? (parsedMatrix[0] ?? []) : []
  const dataRows = hasHeader ? parsedMatrix.slice(1) : parsedMatrix
  const columnCount = parsedMatrix.reduce((max, row) => Math.max(max, row.length), 0)

  function guessColumnField(index: number): ImportField {
    if (hasHeader && headerRow[index]) return guessFieldForHeader(headerRow[index])
    if (!hasHeader && index === 0) return 'title'
    return 'ignore'
  }

  function effectiveMapping(index: number): ImportField {
    return mappingOverrides[index] ?? guessColumnField(index)
  }

  const mapping = Array.from({ length: columnCount }, (_, i) => effectiveMapping(i))
  const hasTitleColumn = mapping.includes('title')

  function handleRawTextChange(value: string) {
    setRawText(value)
    setMappingOverrides({})
  }

  function handleContinue() {
    const titleCol = mapping.indexOf('title')
    const subjectCol = mapping.indexOf('subject')
    const typeCol = mapping.indexOf('type')
    const priorityCol = mapping.indexOf('priority')
    const statusCol = mapping.indexOf('status')
    const dueDateCol = mapping.indexOf('dueDate')

    const rows: PreviewRow[] = dataRows.map((cells) => {
      const cell = (col: number) => (col === -1 ? '' : (cells[col] ?? '').trim())
      const rawDue = cell(dueDateCol)
      const dueDate = normalizeDueDate(rawDue)
      return {
        key: crypto.randomUUID(),
        title: cell(titleCol),
        subject: cell(subjectCol),
        type: normalizeType(cell(typeCol)),
        priority: normalizePriority(cell(priorityCol)),
        status: normalizeStatus(cell(statusCol)),
        dueDate: dueDate ?? '',
        dueDateWarning: rawDue && !dueDate ? `Couldn't parse "${rawDue}" — set manually` : undefined,
      }
    })
    setPreviewRows(rows)
    setStep('preview')
  }

  function updateRow(key: string, patch: Partial<PreviewRow>) {
    setPreviewRows((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function removeRow(key: string) {
    setPreviewRows((rows) => rows.filter((row) => row.key !== key))
  }

  const validRows = previewRows.filter((row) => row.title.trim().length > 0)
  const skippedCount = previewRows.length - validRows.length

  function handleConfirm() {
    const inputs: Omit<Task, 'id'>[] = validRows.map((row) => ({
      title: row.title.trim(),
      subject: row.subject.trim(),
      type: row.type,
      priority: row.priority,
      status: row.status,
      dueDate: row.dueDate || undefined,
    }))
    importTasks(inputs)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-3xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {step === 'paste' ? 'Import from Excel / Sheets' : 'Review & fix values'}
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

        {step === 'paste' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">
                Paste rows copied from Excel or Google Sheets
              </span>
              <textarea
                value={rawText}
                onChange={(e) => handleRawTextChange(e.target.value)}
                rows={6}
                placeholder={'Title\tSubject\tDue Date\nProblem set 4\tBiology\t2026-08-20'}
                className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(e) => setHasHeader(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              First row contains headers
            </label>

            {columnCount > 0 && (
              <div>
                <p className="mb-2 text-sm text-slate-500">
                  {dataRows.length} row{dataRows.length === 1 ? '' : 's'} detected. Map each column
                  to a field:
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <div className="flex min-w-max gap-3 p-3">
                    {Array.from({ length: columnCount }).map((_, i) => (
                      <div key={i} className="w-36 shrink-0">
                        <div className="truncate text-xs text-slate-400">
                          Column {i + 1}
                          {hasHeader && headerRow[i] ? ` — "${headerRow[i]}"` : ''}
                        </div>
                        <select
                          value={mapping[i]}
                          onChange={(e) =>
                            setMappingOverrides((prev) => ({
                              ...prev,
                              [i]: e.target.value as ImportField,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                        >
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                {!hasTitleColumn && (
                  <p className="mt-2 text-sm text-red-600">Map a column to Title to continue.</p>
                )}
              </div>
            )}

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!hasTitleColumn || dataRows.length === 0}
                onClick={handleContinue}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500">
              Nothing is saved yet — fix any values below, then confirm.
            </p>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Due date</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => {
                    const titleMissing = row.title.trim().length === 0
                    return (
                      <tr
                        key={row.key}
                        className={`border-b border-slate-100 align-top ${titleMissing ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateRow(row.key, { title: e.target.value })}
                            className="w-36 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                          />
                          {titleMissing && (
                            <p className="mt-1 text-xs text-red-600">Title required — row skipped</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.subject}
                            onChange={(e) => updateRow(row.key, { subject: e.target.value })}
                            className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.type}
                            onChange={(e) =>
                              updateRow(row.key, { type: e.target.value as TaskType })
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                          >
                            {TASK_TYPES.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.priority}
                            onChange={(e) =>
                              updateRow(row.key, { priority: e.target.value as TaskPriority })
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                          >
                            {TASK_PRIORITIES.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.status}
                            onChange={(e) =>
                              updateRow(row.key, { status: e.target.value as TaskStatus })
                            }
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={row.dueDate}
                            onChange={(e) => updateRow(row.key, { dueDate: e.target.value })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
                          />
                          {row.dueDateWarning && (
                            <p className="mt-1 w-32 text-xs text-amber-600">{row.dueDateWarning}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            aria-label="Remove row"
                            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-slate-500">
              {validRows.length} task{validRows.length === 1 ? '' : 's'} ready to import
              {skippedCount > 0 ? `, ${skippedCount} skipped (missing title)` : ''}.
            </p>

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep('paste')}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validRows.length === 0}
                onClick={handleConfirm}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Confirm import ({validRows.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

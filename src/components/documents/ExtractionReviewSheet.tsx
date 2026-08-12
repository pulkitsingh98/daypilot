import { useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useConfirmDocument, useSignedUrl, type AppDocument } from '../../data/documents'
import { useClasses, useImportClasses, type ClassInput, type NewSubjectRef } from '../../data/timetableBlocks'
import { useImportSessions, type SessionInput } from '../../data/sessions'
import { useImportTasks, type TaskInput, type TaskPriority, type TaskType } from '../../data/tasks'
import type { Confidence, ExtractionResult } from '../../lib/documentExtraction'
import { buildPrepTaskInput, findPrepRuleForSubject } from '../../lib/sessionPrep'
import { suggestPriority } from '../../lib/prioritySuggestion'
import { TASK_PRIORITIES, TASK_TYPES } from '../../lib/tasks'
import { DAYS, formatTimeLabel, toMinutes } from '../../lib/time'
import NewSubjectProficiencyPrompt from './NewSubjectProficiencyPrompt'

interface ExtractionReviewSheetProps {
  appDocument: AppDocument
  extraction: ExtractionResult
  onClose: () => void
}

function ConfidenceCell({
  confidence,
  note,
  touched,
  onAcknowledge,
}: {
  confidence: Confidence
  note: string | null
  touched: boolean
  onAcknowledge: () => void
}) {
  if (confidence === 'high') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        High
      </span>
    )
  }
  return (
    <div>
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" /> Low
      </span>
      {note && <p className="mt-1 w-32 text-xs text-mist">{note}</p>}
      {!touched && (
        <button
          type="button"
          onClick={onAcknowledge}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-dusk hover:text-dusk-deep"
        >
          <Check className="h-3 w-3" aria-hidden="true" /> Looks good
        </button>
      )}
    </div>
  )
}

// ---- Timetable ----

interface PreviewTimetableRow {
  key: string
  subject: string
  code: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string
  confidence: Confidence
  note: string | null
  touched: boolean
}

function isValidTimetableRow(row: PreviewTimetableRow): boolean {
  return row.subject.trim().length > 0 && toMinutes(row.startTime) < toMinutes(row.endTime)
}

function blankTimetableRow(): PreviewTimetableRow {
  return {
    key: crypto.randomUUID(),
    subject: '',
    code: '',
    dayOfWeek: 0,
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    confidence: 'high',
    note: null,
    touched: true,
  }
}

// ---- Sessions ----

interface PreviewSessionRow {
  key: string
  subject: string
  sessionNumber: string
  title: string
  topicsText: string
  date: string
  readingMaterial: string
  confidence: Confidence
  note: string | null
  touched: boolean
}

function isValidSessionRow(row: PreviewSessionRow): boolean {
  return row.subject.trim().length > 0 && row.title.trim().length > 0 && row.date.trim().length > 0
}

function blankSessionRow(): PreviewSessionRow {
  return {
    key: crypto.randomUUID(),
    subject: '',
    sessionNumber: '',
    title: '',
    topicsText: '',
    date: '',
    readingMaterial: '',
    confidence: 'high',
    note: null,
    touched: true,
  }
}

// ---- Mixed (poster / notice / other / not sure) ----

interface PreviewMixedRow {
  key: string
  title: string
  type: TaskType
  subject: string
  date: string
  time: string
  notes: string
  priority: TaskPriority
  confidence: Confidence
  touched: boolean
}

function isValidMixedRow(row: PreviewMixedRow): boolean {
  return row.title.trim().length > 0
}

function blankMixedRow(): PreviewMixedRow {
  return {
    key: crypto.randomUUID(),
    title: '',
    type: 'personal',
    subject: '',
    date: '',
    time: '',
    notes: '',
    priority: 2,
    confidence: 'high',
    touched: true,
  }
}

export default function ExtractionReviewSheet({ appDocument, extraction, onClose }: ExtractionReviewSheetProps) {
  const [timetableRows, setTimetableRows] = useState<PreviewTimetableRow[]>(() =>
    extraction.kind === 'timetable'
      ? extraction.items.map((i) => ({
          key: crypto.randomUUID(),
          subject: i.subject,
          code: i.code ?? '',
          dayOfWeek: i.dayOfWeek,
          startTime: i.startTime,
          endTime: i.endTime,
          location: i.location ?? '',
          confidence: i.confidence,
          note: i.note,
          touched: i.confidence === 'high',
        }))
      : [],
  )
  const [sessionRows, setSessionRows] = useState<PreviewSessionRow[]>(() =>
    extraction.kind === 'sessions'
      ? extraction.items.map((i) => ({
          key: crypto.randomUUID(),
          subject: i.subject ?? '',
          sessionNumber: i.sessionNumber !== null ? String(i.sessionNumber) : '',
          title: i.title,
          topicsText: i.topics.join(', '),
          date: i.date ?? '',
          readingMaterial: i.readingMaterial ?? '',
          confidence: i.confidence,
          note: i.note,
          touched: i.confidence === 'high',
        }))
      : [],
  )
  const [mixedRows, setMixedRows] = useState<PreviewMixedRow[]>(() =>
    extraction.kind === 'mixed'
      ? extraction.items.map((i) => ({
          key: crypto.randomUUID(),
          title: i.title,
          type: i.type,
          subject: i.subject ?? '',
          date: i.date ?? '',
          time: i.time ?? '',
          notes: i.notes ?? '',
          priority: suggestPriority(i.type, i.date),
          confidence: i.confidence,
          touched: i.confidence === 'high',
        }))
      : [],
  )
  const [error, setError] = useState<string | null>(null)
  const [pendingNewSubjects, setPendingNewSubjects] = useState<NewSubjectRef[] | null>(null)

  const isImage = appDocument.fileType?.startsWith('image/') ?? false
  const isPdf = appDocument.fileType === 'application/pdf'
  const { data: signedUrl } = useSignedUrl(appDocument.storagePath)

  const { data: classes = [] } = useClasses()
  const importClasses = useImportClasses()
  const importSessions = useImportSessions()
  const importTasks = useImportTasks()
  const confirmDocument = useConfirmDocument()
  const saving =
    importClasses.isPending || importSessions.isPending || importTasks.isPending || confirmDocument.isPending

  function updateTimetableRow(key: string, patch: Partial<PreviewTimetableRow>) {
    setTimetableRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch, touched: true } : r)))
  }
  function updateSessionRow(key: string, patch: Partial<PreviewSessionRow>) {
    setSessionRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch, touched: true } : r)))
  }
  function updateMixedRow(key: string, patch: Partial<PreviewMixedRow>) {
    setMixedRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch, touched: true } : r)))
  }

  const itemsFoundCount = extraction.items.length
  const liveRows: { touched: boolean }[] =
    extraction.kind === 'timetable' ? timetableRows : extraction.kind === 'sessions' ? sessionRows : mixedRows
  const needsAttentionCount = liveRows.filter((r) => !r.touched).length
  const totalFound = timetableRows.length + sessionRows.length + mixedRows.length

  const validTimetableRows = timetableRows.filter(isValidTimetableRow)
  const validSessionRows = sessionRows.filter(isValidSessionRow)
  const validMixedRows = mixedRows.filter(isValidMixedRow)
  const validCount = validTimetableRows.length + validSessionRows.length + validMixedRows.length

  async function finalizeConfirm() {
    await confirmDocument.mutateAsync(appDocument.id)
    onClose()
  }

  function handleProficiencyDone() {
    setPendingNewSubjects(null)
    void finalizeConfirm()
  }

  async function handleConfirm() {
    setError(null)
    try {
      if (extraction.kind === 'timetable' && validTimetableRows.length > 0) {
        const inputs: ClassInput[] = validTimetableRows.map((r) => ({
          subject: r.subject.trim(),
          code: r.code.trim() || null,
          day: DAYS[r.dayOfWeek].key,
          startTime: r.startTime,
          endTime: r.endTime,
          location: r.location.trim() || undefined,
        }))
        const result = await importClasses.mutateAsync(inputs)
        if (result.newSubjects.length > 0) {
          setPendingNewSubjects(result.newSubjects)
          return
        }
      }

      if (extraction.kind === 'sessions' && validSessionRows.length > 0) {
        const sessionInputs: SessionInput[] = validSessionRows.map((r) => ({
          subject: r.subject.trim(),
          sessionNumber: r.sessionNumber ? Number(r.sessionNumber) : null,
          title: r.title.trim(),
          topics: r.topicsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          scheduledDate: r.date,
          readingMaterial: r.readingMaterial.trim() || null,
        }))
        await importSessions.mutateAsync({ inputs: sessionInputs, sourceDocumentId: appDocument.id })

        const prepTaskInputs: TaskInput[] = validSessionRows
          .filter((r) => r.readingMaterial.trim().length > 0)
          .map((r) =>
            buildPrepTaskInput(
              { subject: r.subject.trim(), title: r.title.trim(), date: r.date, readingMaterial: r.readingMaterial.trim() },
              findPrepRuleForSubject(r.subject, classes),
            ),
          )
        if (prepTaskInputs.length > 0) {
          await importTasks.mutateAsync(prepTaskInputs)
        }
      }

      if (extraction.kind === 'mixed' && validMixedRows.length > 0) {
        const inputs: TaskInput[] = validMixedRows.map((r) => ({
          title: r.title.trim(),
          subject: r.subject.trim(),
          type: r.type,
          priority: r.priority,
          status: 'open',
          dueDate: r.date || undefined,
          notes:
            [r.time ? `Time: ${formatTimeLabel(r.time)}` : null, r.notes.trim() || null]
              .filter(Boolean)
              .join(' — ') || undefined,
          source: 'document',
        }))
        await importTasks.mutateAsync(inputs)
      }

      await finalizeConfirm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save these items. Try again.')
    }
  }

  if (pendingNewSubjects) {
    return <NewSubjectProficiencyPrompt subjects={pendingNewSubjects} onDone={handleProficiencyDone} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-6xl sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Review what we found</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-4 text-sm text-mist">
          {itemsFoundCount} item{itemsFoundCount === 1 ? '' : 's'} found
          {needsAttentionCount > 0
            ? `, ${needsAttentionCount} need${needsAttentionCount === 1 ? 's' : ''} your attention`
            : ' — all reviewed'}
          . Nothing is saved until you confirm.
        </p>

        {totalFound === 0 ? (
          <p className="text-sm text-mist">
            Nothing was found in this document. You can close this and try a different file, or
            add things manually.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              {signedUrl && isImage && (
                <img
                  src={signedUrl}
                  alt={appDocument.fileName}
                  className="max-h-[70vh] w-full rounded-lg border border-mist-line object-contain"
                />
              )}
              {signedUrl && isPdf && (
                <iframe
                  src={signedUrl}
                  title={appDocument.fileName}
                  className="h-[70vh] w-full rounded-lg border border-mist-line"
                />
              )}
              {!signedUrl && (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-mist-line text-sm text-mist">
                  Loading preview…
                </div>
              )}
            </div>

            <div className="order-1 overflow-x-auto rounded-lg border border-mist-line lg:order-2">
              {extraction.kind === 'timetable' && (
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-mist-line bg-haze text-left text-xs text-mist">
                      <th className="px-3 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 font-medium">Code</th>
                      <th className="px-3 py-2 font-medium">Day</th>
                      <th className="px-3 py-2 font-medium">Start</th>
                      <th className="px-3 py-2 font-medium">End</th>
                      <th className="px-3 py-2 font-medium">Location</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {timetableRows.map((row) => {
                      const invalid = !isValidTimetableRow(row)
                      return (
                        <tr
                          key={row.key}
                          className={`border-b border-mist-line align-top ${invalid ? 'bg-red-50' : !row.touched ? 'bg-amber-50' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.subject}
                              onChange={(e) => updateTimetableRow(row.key, { subject: e.target.value })}
                              className="w-28 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.code}
                              onChange={(e) => updateTimetableRow(row.key, { code: e.target.value })}
                              className="w-20 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.dayOfWeek}
                              onChange={(e) => updateTimetableRow(row.key, { dayOfWeek: Number(e.target.value) })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            >
                              {DAYS.map((d, i) => (
                                <option key={d.key} value={i}>
                                  {d.short}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={row.startTime}
                              onChange={(e) => updateTimetableRow(row.key, { startTime: e.target.value })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={row.endTime}
                              onChange={(e) => updateTimetableRow(row.key, { endTime: e.target.value })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.location}
                              onChange={(e) => updateTimetableRow(row.key, { location: e.target.value })}
                              className="w-24 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <ConfidenceCell
                              confidence={row.confidence}
                              note={row.note}
                              touched={row.touched}
                              onAcknowledge={() => updateTimetableRow(row.key, {})}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setTimetableRows((rows) => rows.filter((r) => r.key !== row.key))}
                              aria-label="Remove row"
                              className="rounded-full p-1 text-mist hover:bg-haze hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {extraction.kind === 'sessions' && (
                <table className="w-full min-w-[920px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-mist-line bg-haze text-left text-xs text-mist">
                      <th className="px-3 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Topics</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Reading</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.map((row) => {
                      const invalid = !isValidSessionRow(row)
                      return (
                        <tr
                          key={row.key}
                          className={`border-b border-mist-line align-top ${invalid ? 'bg-red-50' : !row.touched ? 'bg-amber-50' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.subject}
                              onChange={(e) => updateSessionRow(row.key, { subject: e.target.value })}
                              className="w-24 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                            {row.subject.trim().length === 0 && (
                              <p className="mt-1 text-xs text-red-600">Required</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={row.sessionNumber}
                              onChange={(e) => updateSessionRow(row.key, { sessionNumber: e.target.value })}
                              className="w-14 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.title}
                              onChange={(e) => updateSessionRow(row.key, { title: e.target.value })}
                              className="w-36 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                            {row.title.trim().length === 0 && (
                              <p className="mt-1 text-xs text-red-600">Required</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.topicsText}
                              onChange={(e) => updateSessionRow(row.key, { topicsText: e.target.value })}
                              placeholder="comma-separated"
                              className="w-40 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateSessionRow(row.key, { date: e.target.value })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                            {row.date.trim().length === 0 && (
                              <p className="mt-1 w-28 text-xs text-red-600">Date required</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.readingMaterial}
                              onChange={(e) => updateSessionRow(row.key, { readingMaterial: e.target.value })}
                              className="w-40 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <ConfidenceCell
                              confidence={row.confidence}
                              note={row.note}
                              touched={row.touched}
                              onAcknowledge={() => updateSessionRow(row.key, {})}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setSessionRows((rows) => rows.filter((r) => r.key !== row.key))}
                              aria-label="Remove row"
                              className="rounded-full p-1 text-mist hover:bg-haze hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              {extraction.kind === 'mixed' && (
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-mist-line bg-haze text-left text-xs text-mist">
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                      <th className="px-3 py-2 font-medium">Confidence</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {mixedRows.map((row) => {
                      const invalid = !isValidMixedRow(row)
                      return (
                        <tr
                          key={row.key}
                          className={`border-b border-mist-line align-top ${invalid ? 'bg-red-50' : !row.touched ? 'bg-amber-50' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.title}
                              onChange={(e) => updateMixedRow(row.key, { title: e.target.value })}
                              className="w-36 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                            {row.title.trim().length === 0 && (
                              <p className="mt-1 text-xs text-red-600">Required</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.type}
                              onChange={(e) => updateMixedRow(row.key, { type: e.target.value as TaskType })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
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
                                updateMixedRow(row.key, { priority: Number(e.target.value) as TaskPriority })
                              }
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            >
                              {TASK_PRIORITIES.map((p) => (
                                <option key={p.key} value={p.key}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.subject}
                              onChange={(e) => updateMixedRow(row.key, { subject: e.target.value })}
                              className="w-24 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateMixedRow(row.key, { date: e.target.value })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="time"
                              value={row.time}
                              onChange={(e) => updateMixedRow(row.key, { time: e.target.value })}
                              className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => updateMixedRow(row.key, { notes: e.target.value })}
                              className="w-40 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <ConfidenceCell
                              confidence={row.confidence}
                              note={null}
                              touched={row.touched}
                              onAcknowledge={() => updateMixedRow(row.key, {})}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setMixedRows((rows) => rows.filter((r) => r.key !== row.key))}
                              aria-label="Remove row"
                              className="rounded-full p-1 text-mist hover:bg-haze hover:text-red-600"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}

              <div className="border-t border-mist-line p-2">
                <button
                  type="button"
                  onClick={() => {
                    if (extraction.kind === 'timetable') setTimetableRows((rows) => [...rows, blankTimetableRow()])
                    if (extraction.kind === 'sessions') setSessionRows((rows) => [...rows, blankSessionRow()])
                    if (extraction.kind === 'mixed') setMixedRows((rows) => [...rows, blankMixedRow()])
                  }}
                  className="text-xs font-medium text-dusk hover:text-dusk-deep"
                >
                  + Add row
                </button>
              </div>
            </div>
          </div>
        )}

        {totalFound > 0 && (
          <p className="mt-3 text-sm text-mist">{validCount} of {totalFound} ready to save.</p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
          >
            {totalFound === 0 ? 'Close' : 'Cancel'}
          </button>
          {totalFound > 0 && (
            <button
              type="button"
              disabled={validCount === 0 || needsAttentionCount > 0 || saving}
              onClick={() => void handleConfirm()}
              title={needsAttentionCount > 0 ? 'Review the low-confidence rows first' : undefined}
              className="rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:bg-mist-line"
            >
              {saving ? 'Saving…' : `Confirm (${validCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

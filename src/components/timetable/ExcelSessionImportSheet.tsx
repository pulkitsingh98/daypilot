import { useRef, useState } from 'react'
import { Check, Copy, Upload, X } from 'lucide-react'
import { parseExcelWorkbook, type ParsedSessionRow } from '../../lib/excelImport'
import { useImportExcelSessions, type ExcelImportSummary } from '../../data/excelSessionImport'

interface ExcelSessionImportSheetProps {
  onClose: () => void
}

const PROMPT_TEXT = `I have a class timetable and session/reading schedule for my course(s). Read the attached document(s) and produce an Excel workbook in exactly this format.

SHEET 1 — name it "Subjects". Columns: Full Name | Short Name | Section
One row per course, e.g. "Organizational Behavior | OB | Section A". This is the master list — get it right, everything else refers back to it.

REMAINING SHEETS — one per subject, named after that subject's Full Name from the Subjects sheet. Columns:
Subject | Date | Start Time | End Time | Session # | Topic | Reading Required

Rules:
- Subject: repeat the exact Full Name from the Subjects sheet on every row — don't leave this blank, and don't abbreviate it here even though the sheet name already says it. This column is what actually gets read, so it must never be empty.
- Date: one row per actual class date, in YYYY-MM-DD format — the specific calendar date each session happens, not a day-of-week or a range.
- Start Time / End Time: 24-hour "HH:MM" format (e.g. 14:00, not 2:00 PM).
- Session #: the session number if known (1, 2, 3...), or leave blank.
- Topic: what that session covers, briefly.
- Reading Required: what to read or prepare before that session, or leave blank if there's nothing.

If you don't have exact calendar dates for every session, use the class's known weekly meeting day(s) and time(s) starting from [the date your term/semester starts] and spread the sessions across them in order, skipping any holidays I've told you about.

Before producing the file, list out the Subjects sheet rows first and confirm them with me if anything about a course's name is ambiguous. Output only the Excel file (or a data table I can paste straight into Excel) matching this exact format.`

export default function ExcelSessionImportSheet({ onClose }: ExcelSessionImportSheetProps) {
  const [copied, setCopied] = useState(false)
  const [rows, setRows] = useState<ParsedSessionRow[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ExcelImportSummary | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const importSessions = useImportExcelSessions()

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(PROMPT_TEXT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleFile(file: File) {
    setParseError(null)
    setSaveError(null)
    setSummary(null)
    setFileName(file.name)
    try {
      const parsed = await parseExcelWorkbook(file)
      if (parsed.rows.length === 0) {
        setParseError("Couldn't find any rows — check the file has one sheet per subject with the expected columns.")
        setRows(null)
        return
      }
      setRows(parsed.rows)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read this file. Make sure it\'s a .xlsx file.')
      setRows(null)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleFile(file)
  }

  const validRows = rows?.filter((r) => !r.error) ?? []
  const errorRows = rows?.filter((r) => r.error) ?? []
  const bySubject = new Map<string, number>()
  for (const r of validRows) bySubject.set(r.subject, (bySubject.get(r.subject) ?? 0) + 1)

  async function handleConfirm() {
    if (!rows) return
    setSaveError(null)
    try {
      const result = await importSessions.mutateAsync(rows)
      setSummary(result)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not import this sheet. Try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-paper-raised p-5 sm:max-w-2xl sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Upload a session sheet</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {summary ? (
          <div className="mt-3">
            <p className="text-sm text-emerald-700">
              Imported {summary.classesCreated} class{summary.classesCreated === 1 ? '' : 'es'} and{' '}
              {summary.sessionsCreated} session{summary.sessionsCreated === 1 ? '' : 's'}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-mist">
              Run this prompt in any AI (ChatGPT, Gemini, Claude...) with your timetable and syllabus
              attached, then upload the Excel it gives you back — this reads far more reliably than a
              raw photo or PDF.
            </p>

            <div className="rounded-lg border border-mist-line bg-haze p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-mist">Prompt</p>
                <button
                  type="button"
                  onClick={() => void handleCopyPrompt()}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-dusk hover:text-dusk-deep"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden="true" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                {PROMPT_TEXT}
              </pre>
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-mist-line bg-haze p-6 text-center hover:bg-mist-line/40"
            >
              <input ref={inputRef} type="file" accept=".xlsx" onChange={handleInputChange} className="hidden" />
              <Upload className="h-6 w-6 text-mist" aria-hidden="true" />
              <p className="text-sm font-medium text-ink-soft">
                {fileName ?? 'Tap to choose the .xlsx file'}
              </p>
            </div>

            {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}

            {rows && (
              <div className="mt-4">
                <p className="text-sm text-ink-soft">
                  {validRows.length} row{validRows.length === 1 ? '' : 's'} ready
                  {errorRows.length > 0 ? `, ${errorRows.length} skipped` : ''} across {bySubject.size} subject
                  {bySubject.size === 1 ? '' : 's'}.
                </p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {Array.from(bySubject.entries()).map(([subject, count]) => (
                    <li
                      key={subject}
                      className="rounded-full bg-haze px-2 py-0.5 text-xs font-medium text-ink-soft"
                    >
                      {subject} · {count}
                    </li>
                  ))}
                </ul>

                {errorRows.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2">
                    {errorRows.map((r, i) => (
                      <p key={i} className="text-xs text-amber-800">
                        {r.sheetName}, row {r.sheetRow}: {r.error}
                      </p>
                    ))}
                  </div>
                )}

                {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={validRows.length === 0 || importSessions.isPending}
                    onClick={() => void handleConfirm()}
                    className="rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:bg-mist-line"
                  >
                    {importSessions.isPending ? 'Importing…' : `Import ${validRows.length}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

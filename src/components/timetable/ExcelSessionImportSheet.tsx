import { useRef, useState } from 'react'
import { Check, Copy, Upload, X } from 'lucide-react'
import { parseExcelWorkbook, type ParsedSessionRow } from '../../lib/excelImport'
import { useImportExcelSessions, type ExcelImportSummary } from '../../data/excelSessionImport'

interface ExcelSessionImportSheetProps {
  onClose: () => void
}

const PROMPT_TEXT = `I am attaching:
1. A **master class timetable** (grid: rows = dates, columns = time slots, cells = course short codes; may be split into Section A and Section B side by side).
2. **Course outlines** — one per subject — each containing a session-wise table of topics and pre-readings.

**My details**
- Today's date: \`{{today's date}}\`. Term runs \`{{start date}}\` to \`{{end date}}\`.
- My subjects and sections: \`{{e.g. OA1 – Sec A, DPM – Sec A, LDT – Sec A, DAMDM – Sec B, IAPM – Sec B, SMTI – Sec B}}\`
- Holidays / dates to skip: \`{{list, or "none beyond what the timetable shows"}}\`

## Ask me first if anything is genuinely ambiguous

Do not guess on these. Stop and ask, then build once I answer:

- **Section allocation.** If I haven't stated my section for a subject, or my list doesn't cover every subject that appears in my outlines, ask. Most courses run in both sections at different times, so this cannot be inferred from the timetable — a wrong guess puts every class of that subject at the wrong time and date.
- **Which subjects are mine at all.** If the master timetable lists more courses than the outlines I attached, confirm my list is complete rather than assuming the outlines define it.
- **Slot ambiguity.** If a cell is a shared or merged slot (\`SR | DPM\`) and it's unclear whether I attend one, the other, or both, ask.
- **A count mismatch you cannot resolve.** If a subject's timetable slots don't equal its outline sessions and the cause isn't obvious from the grid, show me the candidate dates and ask which is right instead of picking one.
- **A conflict in my own inputs.** If two attached documents disagree, or something I typed contradicts a document, quote both and ask which wins.

Batch your questions into one message rather than asking them one at a time, and ask only what actually blocks you — if a detail is missing but genuinely inferable from the documents, infer it, state the assumption in your reply, and carry on.

**Deliverable:** one Excel workbook (.xlsx). Give me the file only — no long explanation.

## Sheet structure

One sheet per subject, plus one reference sheet.

Each **subject sheet** has exactly these headers in row 1, in this order:

\`Date | Start Time | End Time | Session # | Topic | Reading Required\`

- **Date** — \`YYYY-MM-DD\`, one row per actual calendar class date. Never a weekday name or a range.
- **Start Time / End Time** — 24-hour \`HH:MM\` (e.g. \`14:00\`, not \`2:00 PM\`), taken from the timetable's slot header for the column that cell sits in.
- **Session #** — the running session number.
- **Topic** — what that session covers, briefly.
- **Reading Required** — chapters, cases (include HBS/Ivey product numbers), exercises, or prep due before that session. Blank if none. Fold in any evaluation deadline the outline pins to a session (quiz, project submission).

The first sheet is a **reference sheet named \`Subjects\`** with columns:
\`Full Course Name | Short Form | My Section | Course Code | Credits | Instructor | Classroom | Total Sessions | Sheet in this Workbook\`

## Rules that matter most

1. **Read the timetable by column position, not by reading order.** Text extraction from a grid PDF loses which column a cell was in, and the column determines the class time. Extract each word with its x-coordinate, map x to the correct session-slot column, and derive Start/End Time from that column's header. If two sections sit side by side, map each half separately and pull each subject from the section I'm actually in.
2. **Watch for shared slots** — a cell may read \`SR | DPM\`, meaning two electives run in parallel in that one slot. Both belong to their own column's time.
3. **Number sessions across the entire term, then filter.** Assign session 1, 2, 3… to every occurrence of a subject from the first day of term in chronological order (by date, then by slot within a day). Only after numbering, drop every row dated on or before today. Numbering must reflect the full term so it lines up with the course outline.
4. **Map outline sessions to slots one-to-one, in order.** Where the outline gives a range ("5–6", "12, 13"), that consumes that many slots; split the topic across them sensibly.
5. **Verify before writing.** For each subject, the number of timetable slots must equal the number of sessions in its outline. If they differ, say so explicitly and tell me which date looks wrong rather than silently shifting the numbering — an off-by-one here misnumbers every later session.
6. **Excel sheet names cap at 31 characters.** Shorten long course names, keep them recognisable, and record the mapping in the \`Subjects\` sheet's "Sheet in this Workbook" column. Whatever you shorten it to, keep it an exact prefix of the Full Course Name (don't abbreviate mid-word or reorder) so it can still be matched back automatically.
7. Use a professional font throughout, bold header row, frozen header, sensible column widths, and wrapped text for Topic and Reading.

## If I also give you a second, personalised timetable

Diff it against the master across the **whole term**, not just future dates. Report every mismatch as a short table (date, what the master says, what the personal sheet says), state which one you built the workbook from, and call out any mismatch that shifts session numbering. Build from the master.`

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

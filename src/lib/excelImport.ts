/**
 * One row parsed from the session-sheet template: one sheet per subject,
 * one row per actual class occurrence. This is a deterministic parse of a
 * file the user's own AI already produced from their syllabus — no AI call
 * happens here, which is the whole point: the hard interpretation work
 * happened once, externally, in a tool the user trusts, and this only has
 * to read a predictable table.
 *
 * Subject is resolved from three possible sources, in order of trust: an
 * explicit "Subject" column on the row, a match against the optional
 * "Subjects" registry sheet (by short name or full name), or the sheet
 * name itself as a last resort. Relying on sheet name alone was the
 * original design and turned out fragile — if whatever tool generated the
 * workbook didn't name sheets cleanly, every row from that sheet silently
 * got an empty subject. A blank subject is now always a validation error
 * on the row, never a silent "(untitled class)".
 */
export interface ParsedSessionRow {
  subject: string
  sheetName: string
  sheetRow: number
  date: string | null
  startTime: string | null
  endTime: string | null
  sessionNumber: number | null
  topic: string
  readingRequired: string
  error: string | null
}

export interface SubjectRegistryEntry {
  fullName: string
  shortName: string
  section: string
}

export interface ParsedWorkbook {
  subjects: SubjectRegistryEntry[]
  rows: ParsedSessionRow[]
}

const SUBJECTS_SHEET_NAME = 'subjects'

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_ALIASES = {
  subject: ['subject', 'coursename', 'course', 'subjectname'],
  date: ['date'],
  startTime: ['starttime', 'start'],
  endTime: ['endtime', 'end'],
  sessionNumber: ['session', 'sessionnumber', 'sessionno'],
  topic: ['topic', 'topics'],
  readingRequired: ['readingrequired', 'reading', 'readingmaterial', 'preread', 'prereads'],
} satisfies Record<string, string[]>

const SUBJECTS_SHEET_HEADER_ALIASES = {
  fullName: ['fullname', 'subject', 'subjectname', 'course', 'coursename'],
  shortName: ['shortname', 'short', 'code', 'abbreviation'],
  section: ['section', 'batch', 'group'],
} satisfies Record<string, string[]>

function buildHeaderMap<T extends Record<string, string[]>>(
  rawHeaders: string[],
  aliases: T,
): Partial<Record<keyof T, string>> {
  const map: Partial<Record<keyof T, string>> = {}
  const normalized = rawHeaders.map((h) => ({ raw: h, norm: normalizeHeader(h) }))
  for (const field of Object.keys(aliases) as (keyof T)[]) {
    const match = normalized.find((h) => aliases[field].includes(h.norm))
    if (match) map[field] = match.raw
  }
  return map
}

/** Accepts "9:00", "09:00", "9:00 AM", "2:30 PM" — returns 24-hour "HH:MM", or null if unparseable. */
export function normalizeTimeString(raw: unknown): string | null {
  if (raw instanceof Date) {
    return `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`
  }
  const text = String(raw ?? '').trim()
  if (!text) return null

  const match = text.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const period = match[3]?.toLowerCase()
  if (hours > 23 || minutes > 59) return null

  if (period === 'pm' && hours < 12) hours += 12
  if (period === 'am' && hours === 12) hours = 0

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Accepts an Excel date cell (already a Date via cellDates) or a "YYYY-MM-DD" string — returns ISO date, or null if unparseable. */
export function normalizeDateString(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const text = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  return null
}

function parseSubjectsSheet(rows: Record<string, unknown>[]): SubjectRegistryEntry[] {
  if (rows.length === 0) return []
  const headerMap = buildHeaderMap(Object.keys(rows[0]), SUBJECTS_SHEET_HEADER_ALIASES)

  return rows
    .map((raw): SubjectRegistryEntry => {
      const get = (field: keyof typeof SUBJECTS_SHEET_HEADER_ALIASES) => {
        const header = headerMap[field]
        return header ? String(raw[header] ?? '').trim() : ''
      }
      return { fullName: get('fullName'), shortName: get('shortName'), section: get('section') }
    })
    .filter((s) => s.fullName.length > 0)
}

/** xlsx is only needed on this one screen, so it's dynamically imported — same reasoning as heic2any in fileConversion.ts. */
export async function parseExcelWorkbook(file: File): Promise<ParsedWorkbook> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

  let subjects: SubjectRegistryEntry[] = []
  const dataSheetNames = workbook.SheetNames.filter((name) => {
    if (normalizeHeader(name) === SUBJECTS_SHEET_NAME) {
      const sheet = workbook.Sheets[name]
      subjects = parseSubjectsSheet(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }))
      return false
    }
    return true
  })

  // Matches an explicit Subject cell (or, failing that, the sheet name)
  // against the registry by short name first, then full name — so "OB" on
  // a row resolves to "Organizational Behavior" if that's what's registered.
  // A third tier handles Excel's 31-character sheet-name cap: a long course
  // name gets truncated to fit, so a near-cap-length candidate that's an
  // exact, uniquely-matching prefix of one registered full name is treated
  // as that subject rather than becoming its own separate (truncated) one.
  const SHEET_NAME_LIMIT = 31
  function resolveSubjectName(candidate: string): string {
    const trimmed = candidate.trim()
    if (!trimmed) return ''
    const byShort = subjects.find((s) => s.shortName.toLowerCase() === trimmed.toLowerCase())
    if (byShort) return byShort.fullName
    const byFull = subjects.find((s) => s.fullName.toLowerCase() === trimmed.toLowerCase())
    if (byFull) return byFull.fullName
    if (trimmed.length >= SHEET_NAME_LIMIT - 3) {
      const prefixMatches = subjects.filter((s) => s.fullName.toLowerCase().startsWith(trimmed.toLowerCase()))
      if (prefixMatches.length === 1) return prefixMatches[0].fullName
    }
    return trimmed
  }

  const rows: ParsedSessionRow[] = []

  for (const sheetName of dataSheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (table.length === 0) continue

    const headerMap = buildHeaderMap(Object.keys(table[0]), HEADER_ALIASES)

    table.forEach((raw, index) => {
      const get = (field: keyof typeof HEADER_ALIASES) => {
        const header = headerMap[field]
        return header ? raw[header] : undefined
      }

      const subjectCell = String(get('subject') ?? '').trim()
      const subject = resolveSubjectName(subjectCell || sheetName)

      const date = normalizeDateString(get('date'))
      const startTime = normalizeTimeString(get('startTime'))
      const endTime = normalizeTimeString(get('endTime'))
      const rawSessionNumber = get('sessionNumber')
      const sessionNumber =
        rawSessionNumber !== undefined && rawSessionNumber !== '' && !isNaN(Number(rawSessionNumber))
          ? Number(rawSessionNumber)
          : null
      const topic = String(get('topic') ?? '').trim()
      const readingRequired = String(get('readingRequired') ?? '').trim()

      let error: string | null = null
      if (!subject) error = 'Missing subject — add a Subject column, list it on a Subjects sheet, or name this sheet after it'
      else if (!date) error = 'Missing or unreadable date (expected YYYY-MM-DD)'
      else if (!startTime) error = 'Missing or unreadable start time'
      else if (!endTime) error = 'Missing or unreadable end time'

      rows.push({
        subject,
        sheetName,
        sheetRow: index + 2, // +1 for header row, +1 for 1-indexing
        date,
        startTime,
        endTime,
        sessionNumber,
        topic,
        readingRequired,
        error,
      })
    })
  }

  return { subjects, rows }
}

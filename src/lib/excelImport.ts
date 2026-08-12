/**
 * One row parsed from the session-sheet template: one sheet per subject
 * (the sheet name), one row per actual class occurrence. This is a
 * deterministic parse of a file the user's own AI already produced from
 * their syllabus — no AI call happens here, which is the whole point: the
 * hard interpretation work happened once, externally, in a tool the user
 * trusts, and this only has to read a predictable table.
 */
export interface ParsedSessionRow {
  subject: string
  sheetRow: number
  date: string | null
  startTime: string | null
  endTime: string | null
  sessionNumber: number | null
  topic: string
  readingRequired: string
  error: string | null
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_ALIASES: Record<string, string[]> = {
  date: ['date'],
  startTime: ['starttime', 'start'],
  endTime: ['endtime', 'end'],
  sessionNumber: ['session', 'sessionnumber', 'sessionno'],
  topic: ['topic', 'topics'],
  readingRequired: ['readingrequired', 'reading', 'readingmaterial', 'preread', 'prereads'],
}

function buildHeaderMap(rawHeaders: string[]): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const map: Partial<Record<keyof typeof HEADER_ALIASES, string>> = {}
  const normalized = rawHeaders.map((h) => ({ raw: h, norm: normalizeHeader(h) }))
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = normalized.find((h) => aliases.includes(h.norm))
    if (match) map[field as keyof typeof HEADER_ALIASES] = match.raw
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

/** xlsx is only needed on this one screen, so it's dynamically imported — same reasoning as heic2any in fileConversion.ts. */
export async function parseExcelWorkbook(file: File): Promise<ParsedSessionRow[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const rows: ParsedSessionRow[] = []

  for (const sheetName of workbook.SheetNames) {
    const subject = sheetName.trim()
    if (!subject) continue

    const sheet = workbook.Sheets[sheetName]
    const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (table.length === 0) continue

    const headerMap = buildHeaderMap(Object.keys(table[0]))

    table.forEach((raw, index) => {
      const get = (field: keyof typeof HEADER_ALIASES) => {
        const header = headerMap[field]
        return header ? raw[header] : undefined
      }

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
      if (!date) error = 'Missing or unreadable date (expected YYYY-MM-DD)'
      else if (!startTime) error = 'Missing or unreadable start time'
      else if (!endTime) error = 'Missing or unreadable end time'

      rows.push({
        subject,
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

  return rows
}

/**
 * Deterministic parser for the subset of iCalendar (RFC 5545) that Moodle's
 * calendar export actually produces — VEVENT blocks describing assignment
 * deadlines, not class time-blocks. No third-party ICS library: Moodle's
 * output is simple enough (no recurrence rules, no timezone VTIMEZONE
 * blocks observed) that a small hand-written parser is easier to reason
 * about and audit than pulling in a dependency for it.
 */

export interface ParsedIcsEvent {
  /** Stable per-event id (ICS UID) — used as tasks.source_uid so re-syncing updates in place instead of duplicating. */
  uid: string
  title: string
  description: string | null
  /** Moodle's CATEGORIES field — a course code like "DAMDMT4P25-B", not a full subject name. */
  courseCode: string | null
  /** yyyy-mm-dd, always present — Moodle deadline events are a single point in time (DTSTART == DTEND). */
  dueDate: string
  /** HH:MM in local time, present whenever DTSTART carried a time component (not an all-day DATE value). */
  dueTime: string | null
}

/** Undoes RFC 5545 line folding: a continuation line starts with a single space or tab. */
function unfoldLines(raw: string): string[] {
  const rawLines = raw.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else if (line.trim() !== '') {
      lines.push(line)
    }
  }
  return lines
}

/** Reverses ICS TEXT escaping: \\, \;, \,, \n. */
function unescapeText(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

/** Splits "NAME;PARAM=X:value" into its bare property name and value, ignoring parameters. */
function splitProperty(line: string): { name: string; value: string } | null {
  const colonIndex = line.indexOf(':')
  if (colonIndex === -1) return null
  const left = line.slice(0, colonIndex)
  const name = left.split(';')[0]!.toUpperCase()
  return { name, value: line.slice(colonIndex + 1) }
}

/** Parses a DTSTART/DTEND value: "20260824T182900Z", "20260824T182900", or the all-day "20260824". */
function parseIcsDate(value: string): { dateIso: string; time: string | null } | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim())
  if (!match) return null
  const [, year, month, day, hour, minute, , isUtc] = match
  const dateIso = `${year}-${month}-${day}`
  if (hour === undefined || minute === undefined) return { dateIso, time: null }

  if (!isUtc) return { dateIso, time: `${hour}:${minute}` }

  // Convert UTC to the browser's local time so the shown deadline matches what the student sees on Moodle's own site.
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)))
  const localDateIso = `${utcDate.getFullYear()}-${String(utcDate.getMonth() + 1).padStart(2, '0')}-${String(utcDate.getDate()).padStart(2, '0')}`
  const localTime = `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`
  return { dateIso: localDateIso, time: localTime }
}

/** Parses raw ICS text into deadline events. Malformed VEVENT blocks (no UID, no parseable DTSTART) are skipped, not thrown. */
export function parseIcsEvents(raw: string): ParsedIcsEvent[] {
  const lines = unfoldLines(raw)
  const events: ParsedIcsEvent[] = []
  let current: Record<string, string> | null = null

  for (const line of lines) {
    if (line.toUpperCase() === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line.toUpperCase() === 'END:VEVENT') {
      if (current) {
        const parsed = eventFromFields(current)
        if (parsed) events.push(parsed)
      }
      current = null
      continue
    }
    if (!current) continue

    const prop = splitProperty(line)
    if (!prop) continue
    current[prop.name] = prop.value
  }

  return events
}

function eventFromFields(fields: Record<string, string>): ParsedIcsEvent | null {
  const uid = fields.UID?.trim()
  const summary = fields.SUMMARY?.trim()
  const dtstart = fields.DTSTART
  if (!uid || !summary || !dtstart) return null

  const parsedDate = parseIcsDate(dtstart)
  if (!parsedDate) return null

  return {
    uid,
    title: unescapeText(summary),
    description: fields.DESCRIPTION ? unescapeText(fields.DESCRIPTION).trim() || null : null,
    courseCode: fields.CATEGORIES?.trim() || null,
    dueDate: parsedDate.dateIso,
    dueTime: parsedDate.time,
  }
}

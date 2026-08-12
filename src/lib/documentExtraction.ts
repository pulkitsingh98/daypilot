import type { TaskType } from '../data/tasks'
import { normalizeType } from './tsv'

export type Confidence = 'high' | 'low'

export interface ExtractedTimetableItem {
  subject: string
  code: string | null
  /** 0 = Monday .. 6 = Sunday, matching timetable_blocks.day_of_week. */
  dayOfWeek: number
  startTime: string
  endTime: string
  location: string | null
  confidence: Confidence
  note: string | null
}

export interface ExtractedSessionItem {
  subject: string | null
  sessionNumber: number | null
  title: string
  topics: string[]
  date: string | null
  readingMaterial: string | null
  confidence: Confidence
  note: string | null
}

export interface ExtractedMixedItem {
  title: string
  type: TaskType
  subject: string | null
  date: string | null
  time: string | null
  notes: string | null
  confidence: Confidence
}

export type ExtractionResult =
  | { kind: 'timetable'; items: ExtractedTimetableItem[] }
  | { kind: 'sessions'; items: ExtractedSessionItem[] }
  | { kind: 'mixed'; items: ExtractedMixedItem[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function coerceString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function coerceNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function isValidDayOfWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}

function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Missing/unrecognized confidence defaults to "low" — safer to have the review UI flag it than to silently trust it. */
function coerceConfidence(value: unknown): Confidence {
  return value === 'high' ? 'high' : 'low'
}

/**
 * Coerces the extraction AI's JSON response into safe data regardless of
 * what the model actually returned, per the `kind` we asked for (not
 * whatever "kind" the model claims — trusting our own request is safer than
 * trusting a field the model could get wrong). A timetable item missing a
 * day or time, or a mixed/session item missing a title, is dropped rather
 * than guessed — an incomplete but accurate extraction beats a confident
 * wrong one. Call after parseJsonResponse().
 */
/** Reads back the "kind" tag from a previously-saved extraction result (documents.extracted_json), for reopening the review sheet without re-asking the AI. Falls back to 'mixed' if the stored value is somehow missing or invalid. */
export function inferStoredExtractionKind(raw: unknown): 'timetable' | 'sessions' | 'mixed' {
  if (isRecord(raw) && (raw.kind === 'timetable' || raw.kind === 'sessions' || raw.kind === 'mixed')) {
    return raw.kind
  }
  return 'mixed'
}

export function normalizeExtractionResult(raw: unknown, kind: 'timetable' | 'sessions' | 'mixed'): ExtractionResult {
  const obj = isRecord(raw) ? raw : {}
  const rawItems = Array.isArray(obj.items) ? obj.items : []

  if (kind === 'timetable') {
    const items: ExtractedTimetableItem[] = rawItems
      .filter(isRecord)
      .filter(
        (i) =>
          coerceString(i.subject).trim().length > 0 &&
          isValidDayOfWeek(i.dayOfWeek) &&
          isValidTimeString(i.startTime) &&
          isValidTimeString(i.endTime),
      )
      .map((i) => ({
        subject: coerceString(i.subject).trim(),
        code: coerceNullableString(i.code),
        dayOfWeek: i.dayOfWeek as number,
        startTime: i.startTime as string,
        endTime: i.endTime as string,
        location: coerceNullableString(i.location),
        confidence: coerceConfidence(i.confidence),
        note: coerceNullableString(i.note),
      }))
    return { kind: 'timetable', items }
  }

  if (kind === 'sessions') {
    const items: ExtractedSessionItem[] = rawItems
      .filter(isRecord)
      .filter((i) => coerceString(i.title).trim().length > 0)
      .map((i) => ({
        subject: coerceNullableString(i.subject),
        sessionNumber: typeof i.sessionNumber === 'number' ? i.sessionNumber : null,
        title: coerceString(i.title).trim(),
        topics: Array.isArray(i.topics) ? i.topics.filter((t): t is string => typeof t === 'string') : [],
        date: isValidDateString(i.date) ? i.date : null,
        readingMaterial: coerceNullableString(i.readingMaterial),
        confidence: coerceConfidence(i.confidence),
        note: coerceNullableString(i.note),
      }))
    return { kind: 'sessions', items }
  }

  const items: ExtractedMixedItem[] = rawItems
    .filter(isRecord)
    .filter((i) => coerceString(i.title).trim().length > 0)
    .map((i) => ({
      title: coerceString(i.title).trim(),
      type: normalizeType(coerceString(i.type, 'personal')),
      subject: coerceNullableString(i.subject),
      date: isValidDateString(i.date) ? i.date : null,
      time: isValidTimeString(i.time) ? i.time : null,
      notes: coerceNullableString(i.notes),
      confidence: coerceConfidence(i.confidence),
    }))
  return { kind: 'mixed', items }
}

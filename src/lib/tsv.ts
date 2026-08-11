import type { TaskPriority, TaskStatus, TaskType } from '../store'

export type ImportField =
  | 'title'
  | 'subject'
  | 'type'
  | 'priority'
  | 'status'
  | 'dueDate'
  | 'ignore'

export const IMPORT_FIELDS: { key: ImportField; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'subject', label: 'Subject' },
  { key: 'type', label: 'Type' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'ignore', label: 'Ignore' },
]

const HEADER_KEYWORDS: Record<Exclude<ImportField, 'ignore'>, string[]> = {
  title: ['title', 'task', 'name', 'assignment'],
  subject: ['subject', 'class', 'course'],
  type: ['type', 'category'],
  priority: ['priority', 'importance'],
  status: ['status', 'state'],
  dueDate: ['due', 'deadline', 'date'],
}

/** Splits pasted Excel/Sheets text into a rectangular matrix of cells. */
export function parseTsv(raw: string): string[][] {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0)
  return lines.map((line) => line.split('\t').map((cell) => cell.trim()))
}

export function guessFieldForHeader(header: string): ImportField {
  const h = header.trim().toLowerCase()
  for (const [field, keywords] of Object.entries(HEADER_KEYWORDS)) {
    if (keywords.some((kw) => h.includes(kw))) return field as ImportField
  }
  return 'ignore'
}

export function normalizeType(raw: string): TaskType {
  const v = raw.trim().toLowerCase()
  if (v.startsWith('home')) return 'homework'
  if (v.startsWith('read')) return 'reading'
  if (v.startsWith('proj')) return 'project'
  if (v.startsWith('exam') || v.startsWith('test')) return 'exam'
  return 'other'
}

export function normalizePriority(raw: string): TaskPriority {
  const v = raw.trim().toLowerCase()
  if (v.startsWith('h')) return 'high'
  if (v.startsWith('l')) return 'low'
  return 'medium'
}

export function normalizeStatus(raw: string): TaskStatus {
  const v = raw.trim().toLowerCase()
  if (v.startsWith('done') || v.startsWith('complete')) return 'done'
  if (v.includes('progress') || v.startsWith('doing')) return 'in-progress'
  return 'todo'
}

/** Returns "YYYY-MM-DD" for a parseable date string, or undefined if raw is empty/unparseable. */
export function normalizeDueDate(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return undefined
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

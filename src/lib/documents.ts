import type { DocKind, DocumentStatus } from '../data/documents'

export const DOC_KINDS: { key: DocKind; label: string }[] = [
  { key: 'timetable', label: 'Timetable' },
  { key: 'session-list', label: 'Session list' },
  { key: 'syllabus', label: 'Syllabus' },
  { key: 'poster', label: 'Poster' },
  { key: 'other', label: 'Other' },
]

export function docKindLabel(kind: DocKind): string {
  return DOC_KINDS.find((k) => k.key === kind)?.label ?? kind
}

export const DOCUMENT_STATUSES: { key: DocumentStatus; label: string; chipClass: string }[] = [
  { key: 'uploaded', label: 'Uploaded', chipClass: 'bg-slate-100 text-slate-600' },
  { key: 'extracted', label: 'Extracted', chipClass: 'bg-amber-100 text-amber-700' },
  { key: 'confirmed', label: 'Confirmed', chipClass: 'bg-emerald-100 text-emerald-700' },
]

export function statusMeta(status: DocumentStatus) {
  return DOCUMENT_STATUSES.find((s) => s.key === status) ?? DOCUMENT_STATUSES[0]
}

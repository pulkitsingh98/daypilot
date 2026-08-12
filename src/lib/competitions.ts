import type { Competition, CompetitionStatus } from '../data/competitions'
import { toIsoDate } from './time'

export const COMPETITION_STATUSES: { key: CompetitionStatus; label: string; chipClass: string }[] = [
  { key: 'interested', label: 'Interested', chipClass: 'bg-slate-100 text-slate-600' },
  { key: 'registered', label: 'Registered', chipClass: 'bg-sky-100 text-sky-700' },
  { key: 'in-progress', label: 'In Progress', chipClass: 'bg-amber-100 text-amber-700' },
  { key: 'submitted', label: 'Submitted', chipClass: 'bg-emerald-100 text-emerald-700' },
  { key: 'closed', label: 'Closed', chipClass: 'bg-slate-100 text-slate-400' },
]

export function statusMeta(status: CompetitionStatus) {
  return COMPETITION_STATUSES.find((s) => s.key === status) ?? COMPETITION_STATUSES[0]
}

/** Statuses where a deadline still matters — submitted/closed items don't need a countdown. */
const ACTIVE_STATUSES: CompetitionStatus[] = ['interested', 'registered', 'in-progress']

export interface DeadlineInfo {
  daysUntil: number
  label: string
  isOverdue: boolean
  isDueSoon: boolean
}

export function getDeadlineInfo(deadlineDate: string | null, now: Date = new Date()): DeadlineInfo | null {
  if (!deadlineDate) return null

  const todayIso = toIsoDate(now)
  const [y1, m1, d1] = todayIso.split('-').map(Number)
  const [y2, m2, d2] = deadlineDate.split('-').map(Number)
  const today = new Date(y1, m1 - 1, d1)
  const deadline = new Date(y2, m2 - 1, d2)
  const daysUntil = Math.round((deadline.getTime() - today.getTime()) / 86_400_000)

  let label: string
  if (daysUntil === 0) label = 'Today'
  else if (daysUntil === 1) label = 'Tomorrow'
  else if (daysUntil === -1) label = 'Overdue by 1 day'
  else if (daysUntil < 0) label = `Overdue by ${-daysUntil} days`
  else label = `in ${daysUntil} days`

  return {
    daysUntil,
    label,
    isOverdue: daysUntil < 0,
    isDueSoon: daysUntil >= 0 && daysUntil <= 7,
  }
}

/** Nearest upcoming deadline among competitions that still need attention. */
export function findNearestDeadline(competitions: Competition[]): Competition | null {
  const withDeadlines = competitions.filter(
    (c) => c.deadlineDate && ACTIVE_STATUSES.includes(c.status),
  )
  if (withDeadlines.length === 0) return null
  return withDeadlines.reduce((nearest, current) =>
    (current.deadlineDate as string) < (nearest.deadlineDate as string) ? current : nearest,
  )
}

/** Competitions due within 7 days (or overdue) that still need attention, nearest first. */
export function dueSoon(competitions: Competition[], now: Date = new Date()): Competition[] {
  return competitions
    .filter((c) => ACTIVE_STATUSES.includes(c.status))
    .filter((c) => {
      const info = getDeadlineInfo(c.deadlineDate, now)
      return info !== null && (info.isDueSoon || info.isOverdue)
    })
    .sort((a, b) => (a.deadlineDate as string).localeCompare(b.deadlineDate as string))
}

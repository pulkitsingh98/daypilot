import type { DayOfWeek } from '../data/types'

export const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
]

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function formatTimeLabel(time: string): string {
  const total = toMinutes(time)
  const hour24 = Math.floor(total / 60)
  const minute = total % 60
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export function formatHourLabel(minutesOfDay: number): string {
  const hour24 = Math.floor(minutesOfDay / 60) % 24
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12} ${period}`
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local wall-clock time as "HH:MM". */
export function formatTimeOfDay(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

/** First of the month `months` away from `date`'s month (negative to go back). */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Maps a JS Date to the DayOfWeek key of the ClassEntry/DAYS schedule. */
export function dayKeyForDate(date: Date): DayOfWeek {
  const jsDay = date.getDay() // 0 = Sun .. 6 = Sat
  const index = (jsDay + 6) % 7 // 0 = Mon .. 6 = Sun, matching DAYS order
  return DAYS[index].key
}

/** DayOfWeek key -> the smallint (0=Mon..6=Sun) stored in timetable_blocks.day_of_week. */
export function dayOfWeekToIndex(day: DayOfWeek): number {
  return DAYS.findIndex((d) => d.key === day)
}

export function indexToDayOfWeek(index: number): DayOfWeek {
  return DAYS[index]?.key ?? 'mon'
}

export function dayLabel(day: DayOfWeek): string {
  return DAYS.find((d) => d.key === day)?.label ?? day
}

/** ISO 8601 week key (e.g. "2026-W33"), used to detect when a new week has started. */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const weekNum = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** Monday of the given date's week, as "YYYY-MM-DD" (local time) — matches goal_progress.week_start_date. */
export function getWeekStartDate(date: Date = new Date()): string {
  const dayNum = (date.getDay() + 6) % 7 // 0 = Mon .. 6 = Sun
  return toIsoDate(addDays(date, -dayNum))
}

/** Shared cross-module domain types that don't belong to any single table. */

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface PrepRule {
  minutes: number
  description: string
  windowStart: string
  windowEnd: string
}

const STORAGE_KEY = 'daypilot:lastEveningNudgeDate'

/**
 * Per-device dismissal for the evening "plan tomorrow" nudge — separate from
 * planNudge.ts's morning one, since they trigger on different conditions
 * (time of day + tomorrow's plan, not today's) and can both be relevant on
 * the same day.
 */
export function getLastEveningNudgeDate(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setLastEveningNudgeDate(dateIso: string): void {
  localStorage.setItem(STORAGE_KEY, dateIso)
}

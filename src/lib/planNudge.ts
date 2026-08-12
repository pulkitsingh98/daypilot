const STORAGE_KEY = 'daypilot:lastPlanNudgeDate'

/**
 * Per-device dismissal flag for the morning "plan my day?" nudge. Not app
 * data worth syncing across devices, so it stays in localStorage rather than
 * profiles — remains untouched by the local-data import/clear flow.
 */
export function getLastPlanNudgeDate(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setLastPlanNudgeDate(dateIso: string): void {
  localStorage.setItem(STORAGE_KEY, dateIso)
}

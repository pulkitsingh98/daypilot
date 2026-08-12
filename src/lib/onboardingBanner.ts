const STORAGE_KEY = 'daypilot:onboardingBannerDismissed'

/**
 * Per-device dismissal for the first-time "upload your timetable" banner.
 * This is a once-a-term setup step, not a daily habit, so once dismissed it
 * stays dismissed permanently — no re-nagging on every visit.
 */
export function isOnboardingBannerDismissed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function dismissOnboardingBanner(): void {
  localStorage.setItem(STORAGE_KEY, 'true')
}

import type { GoalHorizon } from '../store'

export const GOAL_HORIZONS: { key: GoalHorizon; label: string; short: string }[] = [
  { key: '30', label: '30-day goals', short: '30-day' },
  { key: '60', label: '60-day goals', short: '60-day' },
  { key: '90', label: '90-day goals', short: '90-day' },
  { key: 'major', label: 'Major goals', short: 'Major' },
]

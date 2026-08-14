import type { ProficiencyLevel } from '../data/subjects'

export const PROFICIENCY_LEVELS: {
  key: ProficiencyLevel
  label: string
  chipClass: string
}[] = [
  { key: 1, label: 'Struggling', chipClass: 'bg-danger-soft text-danger' },
  { key: 2, label: 'Shaky', chipClass: 'bg-danger-soft text-dusk-deep' },
  { key: 3, label: 'Okay', chipClass: 'bg-warning-soft text-dawn-deep' },
  { key: 4, label: 'Comfortable', chipClass: 'bg-haze text-ink-soft' },
  { key: 5, label: 'Strong', chipClass: 'bg-success-soft text-success' },
]

export function proficiencyMeta(level: ProficiencyLevel | null) {
  if (level === null) return null
  return PROFICIENCY_LEVELS.find((p) => p.key === level) ?? null
}

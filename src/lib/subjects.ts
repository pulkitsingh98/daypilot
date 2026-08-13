import type { ProficiencyLevel } from '../data/subjects'

export const PROFICIENCY_LEVELS: {
  key: ProficiencyLevel
  label: string
  chipClass: string
}[] = [
  { key: 1, label: 'Struggling', chipClass: 'bg-red-100 text-red-700' },
  { key: 2, label: 'Shaky', chipClass: 'bg-orange-100 text-orange-700' },
  { key: 3, label: 'Okay', chipClass: 'bg-amber-100 text-amber-700' },
  { key: 4, label: 'Comfortable', chipClass: 'bg-sky-100 text-sky-700' },
  { key: 5, label: 'Strong', chipClass: 'bg-emerald-100 text-emerald-700' },
]

export function proficiencyMeta(level: ProficiencyLevel | null) {
  if (level === null) return null
  return PROFICIENCY_LEVELS.find((p) => p.key === level) ?? null
}

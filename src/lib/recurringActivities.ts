import type { ActivityCategory } from '../data/recurringActivities'

export const ACTIVITY_CATEGORIES: { key: ActivityCategory; label: string; chipClass: string }[] = [
  { key: 'sport', label: 'Sport', chipClass: 'bg-emerald-100 text-emerald-700' },
  { key: 'hobby', label: 'Hobby', chipClass: 'bg-violet-100 text-violet-700' },
  { key: 'health', label: 'Health', chipClass: 'bg-sky-100 text-sky-700' },
  { key: 'social', label: 'Social', chipClass: 'bg-pink-100 text-pink-700' },
  { key: 'other', label: 'Other', chipClass: 'bg-slate-100 text-slate-600' },
]

export function categoryMeta(category: ActivityCategory) {
  return ACTIVITY_CATEGORIES.find((c) => c.key === category) ?? ACTIVITY_CATEGORIES[ACTIVITY_CATEGORIES.length - 1]
}

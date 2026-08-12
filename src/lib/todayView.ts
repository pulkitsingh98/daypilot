import type { ClassEntry } from '../data/timetableBlocks'
import type { DailyPlan } from '../data/dailyPlans'
import type { PrepRule } from '../data/types'
import { toMinutes } from './time'

export interface TimelineItem {
  key: string
  kind: 'class' | 'planned'
  start: string
  end: string
  title: string
  /** For planned blocks: the AI's block type (e.g. "prep", "buffer", "homework"). */
  subtitle?: string
  /** For planned blocks: why it's scheduled. */
  reason?: string
  /** For class blocks: the class's prep rule, if any. */
  prepRule?: PrepRule
}

/** Merges today's fixed classes with today's AI-planned blocks into one time-sorted list. */
export function buildTimelineItems(classesToday: ClassEntry[], plan: DailyPlan | null): TimelineItem[] {
  const items: TimelineItem[] = classesToday.map((entry) => ({
    key: `class-${entry.id}`,
    kind: 'class',
    start: entry.startTime,
    end: entry.endTime,
    title: entry.subject,
    prepRule: entry.prepRule,
  }))

  plan?.blocks.forEach((block, index) => {
    items.push({
      key: `block-${index}-${block.start}`,
      kind: 'planned',
      start: block.start,
      end: block.end,
      title: block.title,
      subtitle: block.type,
      reason: block.reason,
    })
  })

  return items.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

/**
 * Best-effort check for whether today's plan already scheduled prep for a
 * given tomorrow-class subject. There's no explicit link between a plan
 * block and the class it preps for (the planner's JSON contract doesn't
 * carry one), so this matches on the block being prep-typed and mentioning
 * the subject — a heuristic, not a guarantee. Checks the full subject name,
 * its word-initials (e.g. "Organizational Behavior" -> "ob", since students
 * and the planner both use shorthand), and any individually distinctive word.
 */
export function isPrepScheduledForClass(plan: DailyPlan | null, subject: string): boolean {
  if (!plan || !subject.trim()) return false
  const trimmedSubject = subject.trim()
  const subjectLower = trimmedSubject.toLowerCase()
  const subjectWords = trimmedSubject.split(/\s+/).filter(Boolean)
  const subjectInitials = subjectWords.map((word) => word[0]).join('').toLowerCase()
  const significantWords = subjectWords.filter((word) => word.length >= 4).map((word) => word.toLowerCase())

  return plan.blocks.some((block) => {
    if (!block.type.toLowerCase().includes('prep')) return false
    const haystack = `${block.title} ${block.reason}`.toLowerCase()
    const haystackWords = haystack.split(/\W+/).filter(Boolean)
    const titleLower = block.title.trim().toLowerCase()

    if (haystack.includes(subjectLower)) return true
    if (titleLower && subjectLower.includes(titleLower)) return true
    if (subjectInitials.length >= 2 && haystackWords.includes(subjectInitials)) return true
    return significantWords.some((word) => haystackWords.includes(word))
  })
}

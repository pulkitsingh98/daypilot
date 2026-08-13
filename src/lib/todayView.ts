import type { ClassEntry } from '../data/timetableBlocks'
import type { DailyPlan } from '../data/dailyPlans'
import type { Task } from '../data/tasks'
import type { PrepRule } from '../data/types'
import { occurrenceKey, type ClassOccurrenceMap } from '../data/classOccurrences'
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
  /** For planned blocks linked to a real task — lets the timeline strike it off directly. Null for fixed classes and un-linked blocks (buffer, meals). */
  taskId: string | null
  /** The timetable_blocks id, for class items only — looks up this occurrence's status in class_occurrences. Null for planned blocks. */
  classId: string | null
}

/** Merges today's fixed classes with today's AI-planned blocks into one time-sorted list. */
export function buildTimelineItems(classesToday: ClassEntry[], plan: DailyPlan | null): TimelineItem[] {
  const items: TimelineItem[] = classesToday.map((entry) => ({
    key: `class-${entry.id}`,
    kind: 'class',
    start: entry.startTime,
    end: entry.endTime,
    title: entry.subject.trim() || '(untitled class)',
    prepRule: entry.prepRule,
    taskId: null,
    classId: entry.id,
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
      taskId: block.taskId,
      classId: null,
    })
  })

  return items.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

export type ItemStatus = 'done' | 'postponed' | 'cancelled' | 'pending'

/**
 * Every timeline item's status, from whichever store actually owns it:
 * task-linked items resolve through the task's own status; class items
 * resolve through class_occurrences (done/postponed/cancelled, tracked per
 * calendar date so a recurring class's status on one day doesn't affect any
 * other); everything else (un-linked buffer/meal blocks) resolves through
 * the day's completedItemKeys, done/not-done only.
 */
export function getTimelineItemStatus(
  item: TimelineItem,
  tasksById: Map<string, Task>,
  completedItemKeys: string[],
  classOccurrences: ClassOccurrenceMap,
  dateIso: string,
): ItemStatus {
  if (item.taskId) return tasksById.get(item.taskId)?.status === 'done' ? 'done' : 'pending'
  if (item.classId) return classOccurrences.get(occurrenceKey(item.classId, dateIso)) ?? 'pending'
  return completedItemKeys.includes(item.key) ? 'done' : 'pending'
}


import type { DailyPlan, PlanBlock, PlanDeferredItem } from '../data/dailyPlans'

function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function coerceString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/**
 * Coerces the AI's JSON response into a safe DailyPlan regardless of what the
 * model actually returned. Blocks missing a valid start/end/title are
 * dropped rather than stored malformed — a garbled time block is worse than
 * no block. Call after parseJsonResponse() has handled markdown-fence
 * stripping and JSON syntax errors; this handles shape/semantic validity.
 * `defaultDateIso` fills in a block's date when the AI omits it (or gets it
 * wrong) — the requested window can cross midnight, so a missing date can't
 * just be left blank; today's date is the safer assumption.
 */
export function normalizeDailyPlanResult(raw: unknown, defaultDateIso: string): DailyPlan {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : []
  const blocks: PlanBlock[] = rawBlocks
    .filter((b): b is Record<string, unknown> => typeof b === 'object' && b !== null)
    .map(
      (b): PlanBlock => ({
        date: isValidDateString(b.date) ? b.date : defaultDateIso,
        start: coerceString(b.start),
        end: coerceString(b.end),
        title: coerceString(b.title),
        taskId: typeof b.taskId === 'string' ? b.taskId : null,
        type: coerceString(b.type, 'other'),
        reason: coerceString(b.reason),
      }),
    )
    .filter((b) => isValidTimeString(b.start) && isValidTimeString(b.end) && b.title.trim().length > 0)

  const rawDeferred = Array.isArray(obj.deferred) ? obj.deferred : []
  const deferred: PlanDeferredItem[] = rawDeferred
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map((d): PlanDeferredItem => ({ title: coerceString(d.title), reason: coerceString(d.reason) }))
    .filter((d) => d.title.trim().length > 0)

  const note = coerceString(obj.note)

  return { blocks, deferred, note, generatedAt: new Date().toISOString(), planUntil: null, completedItemKeys: [] }
}

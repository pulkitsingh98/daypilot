import type { DailyPlan } from '../data/dailyPlans'
import { fetchDailyPlan, saveDailyPlan } from '../data/dailyPlans'
import { PLANNER_SYSTEM_PROMPT } from '../prompts/plannerPrompt'
import { buildPlanUserMessage, getPlanningContext } from '../lib/planning'
import { normalizeDailyPlanResult } from '../lib/dailyPlan'
import { callAI, parseJsonResponse } from './ai'

/** Marks a tomorrow-dated plan as an incidental rolling-window spillover rather than a deliberately-generated full day — lets the Today page tell the two apart (e.g. so the evening nudge still offers to properly plan tomorrow). */
export const SPILLOVER_NOTE = 'An early look-ahead, generated as part of an earlier plan today.'

export interface GeneratePlanOptions {
  now?: Date
  /** "Replan rest of day": only schedule from the current time onward. */
  remainingOnly?: boolean
  /**
   * Plans a full target day instead of a rolling 24-hour window from `now`
   * — the evening nudge's "plan tomorrow" flow, where `now` is deliberately
   * set to tomorrow. See PlanningContextOptions.planAheadFullDay.
   */
  planAheadFullDay?: boolean
  /** Freeform instruction from the user about what's wrong with the current plan — passed straight to the AI alongside the structured state. */
  userNote?: string
}

/**
 * Gathers the full planning state, asks the AI for a time-blocked plan
 * covering a rolling 24-hour window, defensively parses the result, and
 * stores it in dailyPlans. The window usually crosses midnight, so the AI
 * tags each block with its own calendar date; blocks dated `state.today` are
 * saved there as usual, and any dated `state.tomorrow` spill over into
 * tomorrow's plan too — but only if tomorrow doesn't already have one, so an
 * early rolling-window generation never clobbers a deliberately-generated
 * full plan for tomorrow (e.g. from the evening nudge). Throws AIError on
 * failure (missing key, network, http, or unparseable response) — callers
 * should catch it and offer a retry.
 */
export async function generateDailyPlan(userId: string, options: GeneratePlanOptions = {}): Promise<DailyPlan> {
  const now = options.now ?? new Date()
  const state = await getPlanningContext(userId, now, { planAheadFullDay: options.planAheadFullDay })

  const userMessage = buildPlanUserMessage(state, {
    remainingOnly: options.remainingOnly,
    userNote: options.userNote,
  })

  const raw = await callAI({
    system: PLANNER_SYSTEM_PROMPT,
    user: userMessage,
    kind: options.remainingOnly ? 'replan' : 'plan',
  })
  const parsed = parseJsonResponse<unknown>(raw)
  const plan = normalizeDailyPlanResult(parsed, state.today)
  const planUntil = `${state.planUntil.date}T${state.planUntil.time}:00`

  const todayBlocks = plan.blocks.filter((b) => b.date === state.today)
  const tomorrowBlocks = plan.blocks.filter((b) => b.date === state.tomorrow)

  const todayPlan: DailyPlan = { ...plan, blocks: todayBlocks, planUntil }
  await saveDailyPlan(state.today, todayPlan, userId)

  if (tomorrowBlocks.length > 0) {
    const existingTomorrow = await fetchDailyPlan(state.tomorrow)
    if (!existingTomorrow) {
      const tomorrowPlan: DailyPlan = {
        blocks: tomorrowBlocks,
        deferred: [],
        note: SPILLOVER_NOTE,
        generatedAt: plan.generatedAt,
        planUntil,
        completedItemKeys: [],
      }
      await saveDailyPlan(state.tomorrow, tomorrowPlan, userId)
    }
  }

  return todayPlan
}

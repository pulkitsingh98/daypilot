import { setDailyPlan, type DailyPlan } from '../store'
import { PLANNER_SYSTEM_PROMPT } from '../prompts/plannerPrompt'
import { buildPlanUserMessage, gatherPlanningState } from '../lib/planning'
import { normalizeDailyPlanResult } from '../lib/dailyPlan'
import { formatTimeOfDay } from '../lib/time'
import { callAI, parseJsonResponse } from './ai'

export interface GeneratePlanOptions {
  now?: Date
  /** "Replan rest of day": only schedule from the current time onward. */
  remainingOnly?: boolean
}

/**
 * Gathers the full planning state, asks the AI for a time-blocked plan for
 * today, defensively parses the result, and stores it in dailyPlans keyed
 * by today's date. Throws AIError on failure (missing key, network, http,
 * or unparseable response) — callers should catch it and offer a retry.
 */
export async function generateDailyPlan(options: GeneratePlanOptions = {}): Promise<DailyPlan> {
  const now = options.now ?? new Date()
  const state = gatherPlanningState(now)
  const effectiveState = options.remainingOnly ? { ...state, wakeTime: formatTimeOfDay(now) } : state

  const userMessage = buildPlanUserMessage(effectiveState, { remainingOnly: options.remainingOnly })

  const raw = await callAI({ system: PLANNER_SYSTEM_PROMPT, user: userMessage })
  const parsed = parseJsonResponse<unknown>(raw)
  const plan = normalizeDailyPlanResult(parsed)

  setDailyPlan(state.today, plan)
  return plan
}

import { setDailyPlan, type DailyPlan } from '../store'
import { PLANNER_SYSTEM_PROMPT } from '../prompts/plannerPrompt'
import { buildPlanUserMessage, gatherPlanningState } from '../lib/planning'
import { normalizeDailyPlanResult } from '../lib/dailyPlan'
import { callAI, parseJsonResponse } from './ai'

/**
 * Gathers the full planning state, asks the AI for a time-blocked plan for
 * today, defensively parses the result, and stores it in dailyPlans keyed
 * by today's date. Throws AIError on failure (missing key, network, http,
 * or unparseable response) — callers should catch it and offer a retry.
 */
export async function generateDailyPlan(now: Date = new Date()): Promise<DailyPlan> {
  const state = gatherPlanningState(now)
  const userMessage = buildPlanUserMessage(state)

  const raw = await callAI({ system: PLANNER_SYSTEM_PROMPT, user: userMessage })
  const parsed = parseJsonResponse<unknown>(raw)
  const plan = normalizeDailyPlanResult(parsed)

  setDailyPlan(state.today, plan)
  return plan
}

/**
 * Turns the raw strings logged for a plan/replan AI call back into plain
 * objects, so the debug panel can show labeled sections (Classes, Tasks,
 * Goals, ...) instead of a JSON dump. Best-effort only — if anything doesn't
 * parse the way buildPlanUserMessage/the planner's JSON contract expect,
 * callers fall back to showing the raw text, same "parse defensively, never
 * throw" approach used for the AI's actual JSON responses elsewhere.
 */

type PlainObject = Record<string, unknown>

function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

/** buildPlanUserMessage always puts the JSON planning state after this exact marker. */
const PLANNING_STATE_MARKER = 'Planning state (JSON):\n'

export function extractPlanningState(userMessage: string): PlainObject | null {
  const markerIndex = userMessage.indexOf(PLANNING_STATE_MARKER)
  if (markerIndex === -1) return null
  try {
    const parsed = JSON.parse(userMessage.slice(markerIndex + PLANNING_STATE_MARKER.length))
    return typeof parsed === 'object' && parsed !== null ? (parsed as PlainObject) : null
  } catch {
    return null
  }
}

export function extractPlanResponse(response: string): PlainObject | null {
  try {
    const parsed = JSON.parse(stripCodeFence(response))
    return typeof parsed === 'object' && parsed !== null ? (parsed as PlainObject) : null
  } catch {
    return null
  }
}

export function asObjectArray(value: unknown): PlainObject[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is PlainObject => typeof v === 'object' && v !== null)
}

export function asText(obj: PlainObject, key: string): string {
  const value = obj[key]
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value : String(value)
}

import { supabase } from '../lib/supabase'
import { unwrap, unwrapNullable } from './shared'

export interface GoalProgressEntry {
  id: string
  goalId: string
  weekStartDate: string
  minutesLogged: number
}

interface GoalProgressRow {
  id: string
  goal_id: string
  week_start_date: string
  minutes_logged: number
}

function fromRow(row: GoalProgressRow): GoalProgressEntry {
  return {
    id: row.id,
    goalId: row.goal_id,
    weekStartDate: row.week_start_date,
    minutesLogged: row.minutes_logged,
  }
}

/**
 * Adds deltaMinutes to the (goal, week) row, creating it if it doesn't exist
 * yet. Select-then-upsert rather than a single atomic increment, since
 * PostgREST has no server-side "increment" verb — fine here since this is
 * driven by a single user clicking a button, not high-concurrency writes.
 */
export async function logGoalProgress(
  goalId: string,
  userId: string,
  weekStartDate: string,
  deltaMinutes: number,
): Promise<GoalProgressEntry> {
  const existing = await supabase
    .from('goal_progress')
    .select('*')
    .eq('goal_id', goalId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle()
  const existingRow = unwrapNullable<GoalProgressRow>(existing)
  const newMinutes = Math.max(0, (existingRow?.minutes_logged ?? 0) + deltaMinutes)

  if (existingRow) {
    const updated = await supabase
      .from('goal_progress')
      .update({ minutes_logged: newMinutes })
      .eq('id', existingRow.id)
      .select('*')
      .single()
    return fromRow(unwrap<GoalProgressRow>(updated))
  }

  const created = await supabase
    .from('goal_progress')
    .insert({ user_id: userId, goal_id: goalId, week_start_date: weekStartDate, minutes_logged: newMinutes })
    .select('*')
    .single()
  return fromRow(unwrap<GoalProgressRow>(created))
}

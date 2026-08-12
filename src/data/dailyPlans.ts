import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrap, unwrapNullable } from './shared'

export interface PlanBlock {
  /** "HH:MM" */
  start: string
  /** "HH:MM" */
  end: string
  title: string
  taskId: string | null
  type: string
  reason: string
}

export interface PlanDeferredItem {
  title: string
  reason: string
}

export interface DailyPlan {
  blocks: PlanBlock[]
  deferred: PlanDeferredItem[]
  note: string
  /** ISO timestamp of when this plan was generated. */
  generatedAt: string
}

interface DailyPlanRow {
  blocks: PlanBlock[]
  deferred: PlanDeferredItem[]
  note: string
  generated_at: string
}

function fromRow(row: DailyPlanRow): DailyPlan {
  return { blocks: row.blocks, deferred: row.deferred, note: row.note, generatedAt: row.generated_at }
}

export const dailyPlanQueryKey = (dateIso: string) => ['daily_plans', dateIso] as const

export async function fetchDailyPlan(dateIso: string): Promise<DailyPlan | null> {
  const result = await supabase
    .from('daily_plans')
    .select('blocks, deferred, note, generated_at')
    .eq('plan_date', dateIso)
    .maybeSingle()
  const row = unwrapNullable<DailyPlanRow>(result)
  return row ? fromRow(row) : null
}

export function useDailyPlan(dateIso: string) {
  return useQuery({ queryKey: dailyPlanQueryKey(dateIso), queryFn: () => fetchDailyPlan(dateIso) })
}

export interface DailyPlanWithDate extends DailyPlan {
  planDate: string
}

const dailyPlansRangeQueryKey = (startIso: string, endIso: string) =>
  ['daily_plans', 'range', startIso, endIso] as const

/** All stored plans between startIso and endIso (inclusive), for the History calendar and the planner's recent-completion summary. */
export async function fetchDailyPlansInRange(startIso: string, endIso: string): Promise<DailyPlanWithDate[]> {
  const result = await supabase
    .from('daily_plans')
    .select('plan_date, blocks, deferred, note, generated_at')
    .gte('plan_date', startIso)
    .lte('plan_date', endIso)
    .order('plan_date', { ascending: true })
  const rows = unwrap<(DailyPlanRow & { plan_date: string })[]>(result)
  return rows.map((row) => ({ planDate: row.plan_date, ...fromRow(row) }))
}

export function useDailyPlansInRange(startIso: string, endIso: string) {
  return useQuery({
    queryKey: dailyPlansRangeQueryKey(startIso, endIso),
    queryFn: () => fetchDailyPlansInRange(startIso, endIso),
  })
}

/** Used by the plan generator (a plain async function, not a hook) to persist a fresh plan. */
export async function saveDailyPlan(dateIso: string, plan: DailyPlan, userId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_plans')
    .upsert(
      {
        user_id: userId,
        plan_date: dateIso,
        blocks: plan.blocks,
        deferred: plan.deferred,
        note: plan.note,
        generated_at: plan.generatedAt,
      },
      { onConflict: 'user_id,plan_date' },
    )
  if (error) throw new Error(error.message)
}

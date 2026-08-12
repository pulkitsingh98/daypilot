import { supabase } from '../lib/supabase'
import { resolveSubjectId } from './subjects'
import type { ProficiencyLevel } from './subjects'
import { saveDailyPlan, type DailyPlan } from './dailyPlans'
import { addTaskHistoryEntry } from './taskHistory'
import { normalizePriority, normalizeStatus, normalizeType } from '../lib/tsv'
import { dayOfWeekToIndex, getWeekKey, getWeekStartDate } from '../lib/time'
import { setLastPlanNudgeDate } from '../lib/planNudge'
import type { DayOfWeek, PrepRule } from './types'

const STORAGE_KEY = 'daypilot:data'

// Shapes of the retired localStorage store, mirrored here rather than
// imported from src/store (which this migration exists to make deletable).
interface LegacyClassEntry {
  id: string
  subject: string
  day: DayOfWeek
  startTime: string
  endTime: string
  prepRule?: PrepRule
}

interface LegacyGoal {
  id: string
  title: string
  horizon: '30' | '60' | '90' | 'major'
  weeklyTargetMinutes: number
  minutesThisWeek: number
  weekKey: string
}

interface LegacyTask {
  id: string
  title: string
  subject: string
  type: string
  priority: string
  status: string
  dueDate?: string
  estimatedMinutes?: number
}

interface LegacyTaskHistoryEntry {
  id: string
  type: string
  subject: string
  plannedMinutes: number
  actualMinutes: number
  completedDate: string
}

interface LegacySettings {
  aiProvider: 'gemini' | 'claude'
  apiKey: string
  dailyCapacityMinutes: number
  wakeTime: string
  sleepTime: string
  subjectProficiency: Record<string, 'low' | 'medium' | 'high'>
  lastPlanNudgeDate?: string
}

interface LegacyAppData {
  classes: LegacyClassEntry[]
  goals: LegacyGoal[]
  tasks: LegacyTask[]
  settings: LegacySettings
  taskHistory: LegacyTaskHistoryEntry[]
  dailyPlans: Record<string, DailyPlan>
}

function readLegacyData(): LegacyAppData | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LegacyAppData
  } catch {
    return null
  }
}

export function hasLegacyLocalData(): boolean {
  const data = readLegacyData()
  if (!data) return false
  return (
    (data.classes?.length ?? 0) > 0 ||
    (data.goals?.length ?? 0) > 0 ||
    (data.tasks?.length ?? 0) > 0 ||
    (data.taskHistory?.length ?? 0) > 0 ||
    Object.keys(data.dailyPlans ?? {}).length > 0
  )
}

// The old scale was a coarse low/medium/high self-rating; the new one is a
// 1-5 scale, so each band lands on a representative midpoint rather than an
// exact conversion.
const LEGACY_PROFICIENCY_TO_NUMERIC: Record<'low' | 'medium' | 'high', ProficiencyLevel> = {
  low: 2,
  medium: 3,
  high: 4,
}

export interface LegacyImportSummary {
  classes: number
  goals: number
  tasks: number
  taskHistory: number
  dailyPlans: number
}

/**
 * One-time push of the retired localStorage store into Supabase. Runs
 * sequentially (not Promise.all) everywhere it touches subjects, since
 * subjects has no unique constraint on (user_id, name) and parallel
 * get-or-create calls for the same name would race and create duplicates.
 */
export async function importLegacyLocalData(userId: string): Promise<LegacyImportSummary> {
  const data = readLegacyData()
  if (!data) {
    return { classes: 0, goals: 0, tasks: 0, taskHistory: 0, dailyPlans: 0 }
  }

  const summary: LegacyImportSummary = { classes: 0, goals: 0, tasks: 0, taskHistory: 0, dailyPlans: 0 }

  for (const entry of data.classes ?? []) {
    const subjectId = await resolveSubjectId(entry.subject, userId)
    const { error } = await supabase.from('timetable_blocks').insert({
      user_id: userId,
      subject_id: subjectId,
      day_of_week: dayOfWeekToIndex(entry.day),
      start_time: entry.startTime,
      end_time: entry.endTime,
      prep_rule: entry.prepRule ?? null,
    })
    if (error) throw new Error(error.message)
    summary.classes += 1
  }

  const currentWeek = getWeekKey()
  for (const goal of data.goals ?? []) {
    const { data: row, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: goal.title,
        horizon: goal.horizon,
        weekly_target_minutes: goal.weeklyTargetMinutes,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)

    if (goal.weekKey === currentWeek && goal.minutesThisWeek > 0) {
      const { error: progressError } = await supabase.from('goal_progress').insert({
        user_id: userId,
        goal_id: row.id,
        week_start_date: getWeekStartDate(),
        minutes_logged: goal.minutesThisWeek,
      })
      if (progressError) throw new Error(progressError.message)
    }
    summary.goals += 1
  }

  for (const task of data.tasks ?? []) {
    const subjectId = await resolveSubjectId(task.subject, userId)
    const { error } = await supabase.from('tasks').insert({
      user_id: userId,
      title: task.title,
      subject_id: subjectId,
      type: normalizeType(task.type),
      priority: normalizePriority(task.priority),
      status: normalizeStatus(task.status),
      due_date: task.dueDate || null,
      estimated_minutes: task.estimatedMinutes ?? null,
      source: 'manual',
    })
    if (error) throw new Error(error.message)
    summary.tasks += 1
  }

  for (const entry of data.taskHistory ?? []) {
    await addTaskHistoryEntry(
      {
        type: normalizeType(entry.type),
        subject: entry.subject,
        plannedMinutes: entry.plannedMinutes,
        actualMinutes: entry.actualMinutes,
        completedDate: entry.completedDate,
      },
      userId,
    )
    summary.taskHistory += 1
  }

  for (const [dateIso, plan] of Object.entries(data.dailyPlans ?? {})) {
    await saveDailyPlan(dateIso, plan, userId)
    summary.dailyPlans += 1
  }

  const settings = data.settings
  if (settings) {
    const patch: Record<string, unknown> = {}
    if (settings.aiProvider) patch.ai_provider = settings.aiProvider
    if (settings.apiKey) patch.ai_api_key = settings.apiKey
    if (settings.dailyCapacityMinutes) patch.daily_capacity_minutes = settings.dailyCapacityMinutes
    if (settings.wakeTime) patch.wake_time = settings.wakeTime
    if (settings.sleepTime) patch.sleep_time = settings.sleepTime
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId)
      if (error) throw new Error(error.message)
    }

    for (const [subjectName, level] of Object.entries(settings.subjectProficiency ?? {})) {
      const subjectId = await resolveSubjectId(subjectName, userId)
      if (!subjectId) continue
      const { error } = await supabase
        .from('subjects')
        .update({ proficiency: LEGACY_PROFICIENCY_TO_NUMERIC[level] })
        .eq('id', subjectId)
      if (error) throw new Error(error.message)
    }

    if (settings.lastPlanNudgeDate) setLastPlanNudgeDate(settings.lastPlanNudgeDate)
  }

  return summary
}

export function clearLegacyLocalData(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

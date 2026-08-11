import {
  getClasses,
  getDailyPlan,
  getGoals,
  getSettings,
  getTaskHistory,
  getTasks,
  type GoalHorizon,
  type PrepRule,
  type ProficiencyLevel,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from '../store'
import { addDays, dayKeyForDate, toIsoDate } from './time'

export interface PlanningTimetableBlock {
  /** Whether this class falls on today's or tomorrow's schedule. */
  when: 'today' | 'tomorrow'
  subject: string
  startTime: string
  endTime: string
  prepRule?: PrepRule
}

export interface PlanningTask {
  id: string
  title: string
  subject: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
  estimatedMinutes?: number
  snoozeCount: number
}

export interface PlanningGoal {
  id: string
  title: string
  horizon: GoalHorizon
  weeklyTargetMinutes: number
  minutesThisWeek: number
}

/** A block from yesterday's plan whose linked task was never completed. */
export interface PlanningIncompleteBlock {
  start: string
  end: string
  title: string
  taskId: string | null
  type: string
  reason: string
}

export interface PlanningHistorySummary {
  type: TaskType
  subject: string
  averagePlannedMinutes: number
  averageActualMinutes: number
  sampleSize: number
}

export interface PlanningState {
  today: string
  tomorrow: string
  timetable: PlanningTimetableBlock[]
  openTasks: PlanningTask[]
  goals: PlanningGoal[]
  yesterdayIncompleteBlocks: PlanningIncompleteBlock[]
  capacityMinutes: number
  wakeTime: string
  sleepTime: string
  subjectProficiency: Record<string, ProficiencyLevel>
  historySummary: PlanningHistorySummary[]
}

function summarizeTaskHistory(): PlanningHistorySummary[] {
  const groups = new Map<string, { type: TaskType; subject: string; planned: number[]; actual: number[] }>()

  for (const entry of getTaskHistory()) {
    const key = `${entry.type}::${entry.subject}`
    const group = groups.get(key) ?? { type: entry.type, subject: entry.subject, planned: [], actual: [] }
    group.planned.push(entry.plannedMinutes)
    group.actual.push(entry.actualMinutes)
    groups.set(key, group)
  }

  const average = (values: number[]) => Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)

  return Array.from(groups.values()).map((group) => ({
    type: group.type,
    subject: group.subject,
    averagePlannedMinutes: average(group.planned),
    averageActualMinutes: average(group.actual),
    sampleSize: group.planned.length,
  }))
}

function gatherTimetable(today: Date, tomorrow: Date): PlanningTimetableBlock[] {
  const classes = getClasses()
  const todayKey = dayKeyForDate(today)
  const tomorrowKey = dayKeyForDate(tomorrow)

  const blocks: PlanningTimetableBlock[] = []
  for (const entry of classes) {
    if (entry.day === todayKey) {
      blocks.push({
        when: 'today',
        subject: entry.subject,
        startTime: entry.startTime,
        endTime: entry.endTime,
        prepRule: entry.prepRule,
      })
    } else if (entry.day === tomorrowKey) {
      blocks.push({
        when: 'tomorrow',
        subject: entry.subject,
        startTime: entry.startTime,
        endTime: entry.endTime,
        prepRule: entry.prepRule,
      })
    }
  }
  return blocks
}

function gatherYesterdayIncompleteBlocks(yesterdayIso: string): PlanningIncompleteBlock[] {
  const plan = getDailyPlan(yesterdayIso)
  if (!plan) return []

  const tasks = getTasks()
  return plan.blocks.filter((block) => {
    if (!block.taskId) return false
    const task = tasks.find((t) => t.id === block.taskId)
    return !task || task.status !== 'done'
  })
}

/** Gathers everything the planner needs to reason about today, read fresh from the store. */
export function gatherPlanningState(now: Date = new Date()): PlanningState {
  const tomorrow = addDays(now, 1)
  const yesterday = addDays(now, -1)
  const todayIso = toIsoDate(now)
  const tomorrowIso = toIsoDate(tomorrow)
  const yesterdayIso = toIsoDate(yesterday)

  const settings = getSettings()

  const openTasks: PlanningTask[] = getTasks()
    .filter((task) => task.status !== 'done')
    .map((task) => ({
      id: task.id,
      title: task.title,
      subject: task.subject,
      type: task.type,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes,
      snoozeCount: task.snoozeCount ?? 0,
    }))

  const goals: PlanningGoal[] = getGoals().map((goal) => ({
    id: goal.id,
    title: goal.title,
    horizon: goal.horizon,
    weeklyTargetMinutes: goal.weeklyTargetMinutes,
    minutesThisWeek: goal.minutesThisWeek,
  }))

  return {
    today: todayIso,
    tomorrow: tomorrowIso,
    timetable: gatherTimetable(now, tomorrow),
    openTasks,
    goals,
    yesterdayIncompleteBlocks: gatherYesterdayIncompleteBlocks(yesterdayIso),
    capacityMinutes: settings.dailyCapacityMinutes,
    wakeTime: settings.wakeTime,
    sleepTime: settings.sleepTime,
    subjectProficiency: settings.subjectProficiency,
    historySummary: summarizeTaskHistory(),
  }
}

/** Formats the gathered state into the user message sent alongside PLANNER_SYSTEM_PROMPT. */
export function buildPlanUserMessage(state: PlanningState): string {
  return `Generate today's plan.

Window: ${state.wakeTime}–${state.sleepTime}. Flexible-work capacity today: ${state.capacityMinutes} minutes (this excludes fixed class time).

Planning state (JSON):
${JSON.stringify(state, null, 2)}`
}

import type { DayOfWeek, PrepRule } from '../data/types'
import type { ClassEntry } from '../data/timetableBlocks'
import { fetchTimetableBlocks } from '../data/timetableBlocks'
import type { Task, TaskPriority, TaskStatus, TaskType } from '../data/tasks'
import { fetchTasks } from '../data/tasks'
import type { Goal, GoalHorizon } from '../data/goals'
import { fetchGoals } from '../data/goals'
import type { Profile } from '../data/profiles'
import { fetchProfile } from '../data/profiles'
import type { Subject } from '../data/subjects'
import { fetchSubjects } from '../data/subjects'
import type { TaskHistoryEntry } from '../data/taskHistory'
import { fetchTaskHistory } from '../data/taskHistory'
import type { ActivityCategory, RecurringActivity } from '../data/recurringActivities'
import { fetchRecurringActivities } from '../data/recurringActivities'
import type { Competition, CompetitionStatus } from '../data/competitions'
import { fetchCompetitions } from '../data/competitions'
import type { UpcomingSession } from '../data/sessions'
import { fetchUpcomingSessions } from '../data/sessions'
import { ACTIVE_STATUSES as ACTIVE_COMPETITION_STATUSES, getDeadlineInfo } from './competitions'
import { fetchDailyPlan, fetchDailyPlansInRange } from '../data/dailyPlans'
import { computeDayCompletion } from './dayCompletion'
import { fetchClassOccurrenceStatuses } from '../data/classOccurrences'
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

export interface PlanningRecurringActivity {
  title: string
  category: ActivityCategory
  /** Null means no fixed day — use timesPerWeek as a rough guide for how often to fit it in. */
  day: DayOfWeek | null
  preferredTime: string | null
  durationMinutes: number | null
  timesPerWeek: number | null
  isFlexible: boolean
}

export interface PlanningSession {
  subject: string
  title: string
  topics: string[]
  scheduledDate: string
  readingMaterial: string | null
}

export interface PlanningCompetition {
  title: string
  organiser: string | null
  stage: string | null
  deadlineDate: string | null
  deadlineTime: string | null
  effortEstimateMinutes: number | null
  status: CompetitionStatus
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

/** How the last week actually went, for pacing today's plan realistically. */
export interface PlanningCompletionSummary {
  /** Of the last 7 days, how many had a plan with at least one task-linked block. */
  daysWithData: number
  /** Average done/total ratio across those days, 0-1. */
  averageCompletionRate: number
  /** Consecutive fully-completed days counting back from yesterday. */
  currentStreakDays: number
}

export interface PlanningState {
  today: string
  tomorrow: string
  timetable: PlanningTimetableBlock[]
  recurringActivities: PlanningRecurringActivity[]
  upcomingSessions: PlanningSession[]
  openTasks: PlanningTask[]
  goals: PlanningGoal[]
  competitions: PlanningCompetition[]
  yesterdayIncompleteBlocks: PlanningIncompleteBlock[]
  capacityMinutes: number
  wakeTime: string
  sleepTime: string
  subjectProficiency: Record<string, number>
  historySummary: PlanningHistorySummary[]
  recentCompletion: PlanningCompletionSummary
}

function summarizeTaskHistory(taskHistory: TaskHistoryEntry[]): PlanningHistorySummary[] {
  const groups = new Map<string, { type: TaskType; subject: string; planned: number[]; actual: number[] }>()

  for (const entry of taskHistory) {
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

function gatherTimetable(classes: ClassEntry[], today: Date, tomorrow: Date): PlanningTimetableBlock[] {
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

async function gatherYesterdayIncompleteBlocks(
  yesterdayIso: string,
  tasks: Task[],
): Promise<PlanningIncompleteBlock[]> {
  const plan = await fetchDailyPlan(yesterdayIso)
  if (!plan) return []

  return plan.blocks.filter((block) => {
    if (!block.taskId) return false
    const task = tasks.find((t) => t.id === block.taskId)
    return !task || task.status !== 'done'
  })
}

function toPlanningRecurringActivity(activity: RecurringActivity): PlanningRecurringActivity {
  return {
    title: activity.title,
    category: activity.category,
    day: activity.day,
    preferredTime: activity.preferredTime,
    durationMinutes: activity.durationMinutes,
    timesPerWeek: activity.timesPerWeek,
    isFlexible: activity.isFlexible,
  }
}

function toPlanningSession(session: UpcomingSession): PlanningSession {
  return {
    subject: session.subject,
    title: session.title,
    topics: session.topics,
    scheduledDate: session.scheduledDate,
    readingMaterial: session.readingMaterial,
  }
}

/** Only surface competitions actually relevant to near-term planning: still active, with a deadline inside 14 days (overdue ones included, so they stay visible until resolved). */
function isWithinPlanningWindow(competition: Competition, date: Date): boolean {
  if (!ACTIVE_COMPETITION_STATUSES.includes(competition.status)) return false
  const info = getDeadlineInfo(competition.deadlineDate, date)
  return info !== null && info.daysUntil <= 14
}

function toPlanningCompetition(competition: Competition): PlanningCompetition {
  return {
    title: competition.title,
    organiser: competition.organiser,
    stage: competition.stage,
    deadlineDate: competition.deadlineDate,
    deadlineTime: competition.deadlineTime,
    effortEstimateMinutes: competition.effortEstimateMinutes,
    status: competition.status,
  }
}

/**
 * Walks the last 7 days (yesterday back to 7 days ago) to see how much
 * actually got done. classes reflects the CURRENT timetable, applied
 * retroactively by day-of-week — the same approximation the History
 * calendar uses, since past timetable_blocks rows aren't versioned.
 */
export async function computeRecentCompletion(
  tasks: Task[],
  now: Date,
  classes: ClassEntry[] = [],
): Promise<PlanningCompletionSummary> {
  const tasksById = new Map(tasks.map((t) => [t.id, t]))
  const startIso = toIsoDate(addDays(now, -7))
  const endIso = toIsoDate(addDays(now, -1))
  const [plans, classOccurrences] = await Promise.all([
    fetchDailyPlansInRange(startIso, endIso),
    fetchClassOccurrenceStatuses(startIso, endIso),
  ])
  const plansByDate = new Map(plans.map((p) => [p.planDate, p]))

  const ratios: number[] = []
  let currentStreakDays = 0
  let stillStreaking = true

  for (let i = 1; i <= 7; i++) {
    const dateIso = toIsoDate(addDays(now, -i))
    const dayDate = addDays(now, -i)
    const plan = plansByDate.get(dateIso)
    const classesForDay = classes.filter((c) => c.day === dayKeyForDate(dayDate))
    const completion = computeDayCompletion(plan, dateIso, tasksById, classesForDay, classOccurrences)
    const fullyDone = completion.total > 0 && completion.done === completion.total

    if (completion.total > 0) ratios.push(completion.done / completion.total)

    if (stillStreaking) {
      if (fullyDone) currentStreakDays += 1
      else stillStreaking = false
    }
  }

  return {
    daysWithData: ratios.length,
    averageCompletionRate:
      ratios.length > 0 ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) / 100 : 0,
    currentStreakDays,
  }
}

function buildSubjectProficiency(subjects: Subject[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const subject of subjects) {
    if (subject.proficiency !== null) map[subject.name] = subject.proficiency
  }
  return map
}

/** Gathers everything the planner needs to reason about `date`, fetched fresh from Supabase. */
export async function getPlanningContext(userId: string, date: Date): Promise<PlanningState> {
  const tomorrow = addDays(date, 1)
  const yesterday = addDays(date, -1)
  const todayIso = toIsoDate(date)
  const tomorrowIso = toIsoDate(tomorrow)
  const yesterdayIso = toIsoDate(yesterday)

  const [classes, tasks, goals, profile, subjects, taskHistory, recurringActivities, upcomingSessions, competitions] =
    await Promise.all([
      fetchTimetableBlocks(),
      fetchTasks(),
      fetchGoals(),
      fetchProfile(userId),
      fetchSubjects(),
      fetchTaskHistory(),
      fetchRecurringActivities(),
      fetchUpcomingSessions(7, date),
      fetchCompetitions(),
    ])

  const openTasks: PlanningTask[] = tasks
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
      snoozeCount: task.snoozeCount,
    }))

  const planningGoals: PlanningGoal[] = goals.map((goal: Goal) => ({
    id: goal.id,
    title: goal.title,
    horizon: goal.horizon,
    weeklyTargetMinutes: goal.weeklyTargetMinutes,
    minutesThisWeek: goal.minutesThisWeek,
  }))

  const profileTyped: Profile = profile

  return {
    today: todayIso,
    tomorrow: tomorrowIso,
    timetable: gatherTimetable(classes, date, tomorrow),
    recurringActivities: recurringActivities.map(toPlanningRecurringActivity),
    upcomingSessions: upcomingSessions.map(toPlanningSession),
    openTasks,
    goals: planningGoals,
    competitions: competitions.filter((c) => isWithinPlanningWindow(c, date)).map(toPlanningCompetition),
    yesterdayIncompleteBlocks: await gatherYesterdayIncompleteBlocks(yesterdayIso, tasks),
    capacityMinutes: profileTyped.dailyCapacityMinutes,
    wakeTime: profileTyped.wakeTime,
    sleepTime: profileTyped.sleepTime,
    subjectProficiency: buildSubjectProficiency(subjects),
    historySummary: summarizeTaskHistory(taskHistory),
    recentCompletion: await computeRecentCompletion(tasks, date, classes),
  }
}

/** Formats the gathered state into the user message sent alongside PLANNER_SYSTEM_PROMPT. */
export function buildPlanUserMessage(
  state: PlanningState,
  options?: { remainingOnly?: boolean; userNote?: string },
): string {
  const remainingOnlyNote = options?.remainingOnly
    ? `\n\nThis is a re-plan partway through the day — only schedule blocks from ${state.wakeTime} onward. Do not schedule anything earlier than that, and do not re-plan work that already happened. Only the tasks still open (not yet completed) are listed below.`
    : ''
  const userNoteText = options?.userNote?.trim()
  const userNoteBlock = userNoteText
    ? `\n\nThe user left this note about today's plan — treat it as a direct instruction and reshape the plan to address it: "${userNoteText}"`
    : ''

  return `Generate today's plan.${remainingOnlyNote}${userNoteBlock}

Window: ${state.wakeTime}–${state.sleepTime}. Flexible-work capacity today: ${state.capacityMinutes} minutes (this excludes fixed class time).

Planning state (JSON):
${JSON.stringify(state, null, 2)}`
}

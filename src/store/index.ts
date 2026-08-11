import { useSyncExternalStore } from 'react'
import { getWeekKey } from '../lib/time'

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface PrepRule {
  minutes: number
  description: string
  windowStart: string
  windowEnd: string
}

export interface ClassEntry {
  id: string
  subject: string
  day: DayOfWeek
  startTime: string
  endTime: string
  prepRule?: PrepRule
}

export type GoalHorizon = '30' | '60' | '90' | 'major'

export interface Goal {
  id: string
  title: string
  horizon: GoalHorizon
  weeklyTargetMinutes: number
  minutesThisWeek: number
  /** ISO week key minutesThisWeek was last logged against; used to reset the counter on a new week. */
  weekKey: string
}

interface AppData {
  classes: ClassEntry[]
  goals: Goal[]
}

const STORAGE_KEY = 'daypilot:data'
const EMPTY_DATA: AppData = { classes: [], goals: [] }

function normalizeGoalWeek(goal: Goal): Goal {
  const currentWeek = getWeekKey()
  if (goal.weekKey === currentWeek) return goal
  return { ...goal, minutesThisWeek: 0, weekKey: currentWeek }
}

function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DATA
    const parsed = JSON.parse(raw)
    const goals: Goal[] = Array.isArray(parsed?.goals) ? parsed.goals : []
    return {
      classes: Array.isArray(parsed?.classes) ? parsed.classes : [],
      goals: goals.map(normalizeGoalWeek),
    }
  } catch {
    return EMPTY_DATA
  }
}

let data: AppData = loadData()
// loadData() may have reset stale weekKeys; write that back so storage matches memory.
window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

const listeners = new Set<() => void>()

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getClassesSnapshot() {
  return data.classes
}

export function useClasses(): ClassEntry[] {
  return useSyncExternalStore(subscribe, getClassesSnapshot)
}

export function addClass(input: Omit<ClassEntry, 'id'>): ClassEntry {
  const entry: ClassEntry = { ...input, id: crypto.randomUUID() }
  data = { ...data, classes: [...data.classes, entry] }
  persist()
  return entry
}

export function updateClass(id: string, input: Omit<ClassEntry, 'id'>) {
  data = {
    ...data,
    classes: data.classes.map((entry) => (entry.id === id ? { ...input, id } : entry)),
  }
  persist()
}

export function deleteClass(id: string) {
  data = { ...data, classes: data.classes.filter((entry) => entry.id !== id) }
  persist()
}

function getGoalsSnapshot() {
  return data.goals
}

export function useGoals(): Goal[] {
  return useSyncExternalStore(subscribe, getGoalsSnapshot)
}

export function addGoal(input: Pick<Goal, 'title' | 'horizon' | 'weeklyTargetMinutes'>): Goal {
  const entry: Goal = { ...input, id: crypto.randomUUID(), minutesThisWeek: 0, weekKey: getWeekKey() }
  data = { ...data, goals: [...data.goals, entry] }
  persist()
  return entry
}

export function updateGoal(
  id: string,
  input: Pick<Goal, 'title' | 'horizon' | 'weeklyTargetMinutes'>,
) {
  data = {
    ...data,
    goals: data.goals.map((goal) => (goal.id === id ? { ...goal, ...input } : goal)),
  }
  persist()
}

export function deleteGoal(id: string) {
  data = { ...data, goals: data.goals.filter((goal) => goal.id !== id) }
  persist()
}

export function logGoalMinutes(id: string, deltaMinutes: number) {
  data = {
    ...data,
    goals: data.goals.map((goal) => {
      if (goal.id !== id) return goal
      const normalized = normalizeGoalWeek(goal)
      return { ...normalized, minutesThisWeek: Math.max(0, normalized.minutesThisWeek + deltaMinutes) }
    }),
  }
  persist()
}

import { useSyncExternalStore } from 'react'

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

interface AppData {
  classes: ClassEntry[]
}

const STORAGE_KEY = 'daypilot:data'
const EMPTY_DATA: AppData = { classes: [] }

function loadData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_DATA
    const parsed = JSON.parse(raw)
    return {
      classes: Array.isArray(parsed?.classes) ? parsed.classes : [],
    }
  } catch {
    return EMPTY_DATA
  }
}

let data: AppData = loadData()
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

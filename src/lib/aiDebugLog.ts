/**
 * A rolling local log of every AI call the app makes — what was sent and
 * what came back — so a bad plan (or extraction, or quick-add) can be
 * diagnosed from Settings instead of guessed at. Local-only (localStorage):
 * this is a debugging aid, not app data, so it doesn't belong in Supabase.
 */

export type AICallKind = 'plan' | 'replan' | 'quick-add' | 'document-extraction' | 'other'

export interface AIDebugEntry {
  id: string
  /** ISO timestamp. */
  timestamp: string
  kind: AICallKind
  system: string
  user: string
  response: string | null
  error: string | null
}

const STORAGE_KEY = 'daypilot:ai-debug-log'
const MAX_ENTRIES = 15

export function logAICall(entry: Omit<AIDebugEntry, 'id' | 'timestamp'>): void {
  try {
    const next: AIDebugEntry[] = [
      { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry },
      ...getAIDebugLog(),
    ].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Debug logging must never break a real AI call — localStorage can be full or disabled.
  }
}

export function getAIDebugLog(): AIDebugEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AIDebugEntry[]) : []
  } catch {
    return []
  }
}

export function clearAIDebugLog(): void {
  localStorage.removeItem(STORAGE_KEY)
}

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { parseIcsEvents } from '../lib/icsImport'
import { unwrapNullable } from './shared'
import { resolveSubjectId, SUBJECTS_QUERY_KEY } from './subjects'
import { TASKS_QUERY_KEY } from './tasks'
import { PROFILE_QUERY_KEY, useProfile } from './profiles'

/** Re-check and refresh at most this often — matches the "refresh on app open" model: client-triggered, no scheduled backend job. */
const SYNC_STALE_MS = 4 * 60 * 60 * 1000

export interface MoodleSyncResult {
  imported: number
}

/**
 * Finds a subject whose course code matches (case-insensitive), for mapping
 * a Moodle CATEGORIES value like "DAMDMT4P25-B" onto the same subject the
 * Excel/document import already created. Falls back to lookup-or-create by
 * name using the raw code, so a course Moodle knows about before any
 * timetable import still gets a sensible (if unpolished) subject — the user
 * can rename it in Settings > Subjects once codes are backfilled elsewhere.
 */
async function resolveSubjectIdByCode(code: string, userId: string): Promise<string | null> {
  const existing = await supabase.from('subjects').select('id').ilike('code', code).maybeSingle()
  const found = unwrapNullable<{ id: string }>(existing)
  if (found) return found.id
  return resolveSubjectId(code, userId)
}

/**
 * Fetches the user's Moodle ICS export (via the /api/fetch-ics CORS-bypass
 * proxy — see api/fetch-ics.ts), parses it, and upserts each event as a task
 * (source: 'moodle', source_uid: the ICS UID). Upserting only the fields
 * Moodle can tell us about — never status/completed_at — means re-syncing
 * can't resurrect or un-complete a task the user already dealt with, only
 * update its title/due date/notes if Moodle's own copy changed.
 */
export async function syncMoodleCalendar(userId: string, icsUrl: string): Promise<MoodleSyncResult> {
  const response = await fetch(`/api/fetch-ics?url=${encodeURIComponent(icsUrl)}`)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Could not fetch your Moodle calendar.')
  }
  const events = parseIcsEvents(await response.text())

  const subjectIdByCode = new Map<string, string | null>()
  const rows: Record<string, unknown>[] = []
  for (const event of events) {
    let subjectId: string | null = null
    if (event.courseCode) {
      if (subjectIdByCode.has(event.courseCode)) {
        subjectId = subjectIdByCode.get(event.courseCode)!
      } else {
        subjectId = await resolveSubjectIdByCode(event.courseCode, userId)
        subjectIdByCode.set(event.courseCode, subjectId)
      }
    }
    rows.push({
      user_id: userId,
      subject_id: subjectId,
      title: event.title,
      type: 'assignment',
      due_date: event.dueDate,
      notes: event.description,
      source: 'moodle',
      source_uid: event.uid,
    })
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'user_id,source_uid' })
    if (error) throw new Error(error.message)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ moodle_last_synced_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (profileError) throw new Error(profileError.message)

  return { imported: rows.length }
}

/** Manual "Sync now" — used by Settings. */
export function useSyncMoodleCalendar() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (icsUrl: string): Promise<MoodleSyncResult> => {
      if (!session) throw new Error('Not signed in.')
      return syncMoodleCalendar(session.user.id, icsUrl)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
    },
  })
}

/**
 * Mounted once at the authenticated app shell (see Shell.tsx) so it fires
 * whenever the user opens the app or logs in again, per the confirmed
 * "keep the frontend, only refresh on app open" design — no cron job, no
 * scheduled backend sync. Silent on failure (a stale/unreachable Moodle URl
 * shouldn't block the rest of the app); Settings' "Sync now" surfaces errors
 * directly for the user who wants to see them.
 */
export function useMoodleAutoSync(): void {
  const { session } = useAuth()
  const { data: profile } = useProfile()
  const queryClient = useQueryClient()
  const triggeredRef = useRef(false)

  useEffect(() => {
    if (!session || !profile?.moodleIcsUrl || triggeredRef.current) return

    const lastSynced = profile.moodleLastSyncedAt ? new Date(profile.moodleLastSyncedAt).getTime() : 0
    const isStale = Date.now() - lastSynced >= SYNC_STALE_MS
    if (!isStale) return

    triggeredRef.current = true
    void syncMoodleCalendar(session.user.id, profile.moodleIcsUrl)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
      })
      .catch(() => {
        // Swallow — this is a background convenience sync, not a user action.
      })
  }, [session, profile, queryClient])
}

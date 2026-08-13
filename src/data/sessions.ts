import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { resolveSubjectId } from './subjects'
import { embeddedSubjectName, unwrap } from './shared'
import { toIsoDate } from '../lib/time'

export type SessionStatus = 'upcoming' | 'prepped' | 'attended' | 'missed'

export interface UpcomingSession {
  id: string
  subject: string
  sessionNumber: number | null
  title: string
  topics: string[]
  scheduledDate: string
  /** "HH:MM", when known — null for sessions imported without a time (e.g. a plain photo/PDF reading list). */
  startTime: string | null
  endTime: string | null
  readingMaterial: string | null
  status: SessionStatus
}

interface SessionRow {
  id: string
  session_number: number | null
  title: string
  topics: string[] | null
  scheduled_date: string
  start_time: string | null
  end_time: string | null
  reading_material: string | null
  status: string
  subjects: { name: string }[] | { name: string } | null
}

function fromRow(row: SessionRow): UpcomingSession {
  return {
    id: row.id,
    subject: embeddedSubjectName(row.subjects),
    sessionNumber: row.session_number,
    title: row.title,
    topics: row.topics ?? [],
    scheduledDate: row.scheduled_date,
    startTime: row.start_time?.slice(0, 5) ?? null,
    endTime: row.end_time?.slice(0, 5) ?? null,
    readingMaterial: row.reading_material,
    status: row.status as SessionStatus,
  }
}

const SELECT_COLUMNS =
  'id, session_number, title, topics, scheduled_date, start_time, end_time, reading_material, status, subjects(name)'

/**
 * Returns sessions that haven't already happened — planner input, and the
 * Timetable page's session-matching for upcoming classes. `daysAhead` bounds
 * the window when given (e.g. the planner only needs a week); omit it to
 * fetch every future session with no upper cutoff, which is what the
 * Timetable page's "whole term" Upcoming list needs — a course's real
 * session list has its own natural end, so it doesn't need one imposed here.
 */
export async function fetchUpcomingSessions(daysAhead?: number, now: Date = new Date()): Promise<UpcomingSession[]> {
  const todayIso = toIsoDate(now)

  let query = supabase
    .from('sessions')
    .select(SELECT_COLUMNS)
    .in('status', ['upcoming', 'prepped'])
    .gte('scheduled_date', todayIso)
    .order('scheduled_date', { ascending: true })

  if (daysAhead !== undefined) {
    const until = new Date(now)
    until.setDate(until.getDate() + daysAhead)
    query = query.lte('scheduled_date', toIsoDate(until))
  }

  const result = await query
  return unwrap<SessionRow[]>(result).map(fromRow)
}

export function useUpcomingSessions(daysAhead?: number, now: Date = new Date()) {
  return useQuery({
    queryKey: ['sessions', 'upcoming', daysAhead, toIsoDate(now)],
    queryFn: () => fetchUpcomingSessions(daysAhead, now),
  })
}

export const HAS_SESSIONS_QUERY_KEY = ['sessions', 'has-any'] as const

/** Existence check, not a real fetch — for the "have you set anything up yet" onboarding checklist. */
export async function fetchHasAnySession(): Promise<boolean> {
  const result = await supabase.from('sessions').select('id').limit(1)
  return unwrap<{ id: string }[]>(result).length > 0
}

export function useHasSessions() {
  return useQuery({ queryKey: HAS_SESSIONS_QUERY_KEY, queryFn: fetchHasAnySession })
}

export const sessionsForSubjectQueryKey = (subjectId: string) => ['sessions', 'by-subject', subjectId] as const

/** All sessions for a subject (past and future), for its detail page — a genuine reference view, not just planner input. */
export async function fetchSessionsForSubject(subjectId: string): Promise<UpcomingSession[]> {
  const result = await supabase
    .from('sessions')
    .select(SELECT_COLUMNS)
    .eq('subject_id', subjectId)
    .order('scheduled_date', { ascending: true })

  return unwrap<SessionRow[]>(result).map(fromRow)
}

export function useSessionsForSubject(subjectId: string) {
  return useQuery({
    queryKey: sessionsForSubjectQueryKey(subjectId),
    queryFn: () => fetchSessionsForSubject(subjectId),
    enabled: !!subjectId,
  })
}

export interface SessionInput {
  subject: string
  sessionNumber: number | null
  title: string
  topics: string[]
  /** "YYYY-MM-DD" — required, unlike ExtractedSession's, since scheduled_date is NOT NULL in the DB. The review sheet enforces this before a row is importable. */
  scheduledDate: string
  readingMaterial: string | null
}

/**
 * Bulk-create from the document-extraction review flow. Rows are inserted
 * sequentially (not in parallel) for the same reason as useImportTasks —
 * subjects has no unique constraint on (user_id, name), so parallel
 * get-or-create calls for a repeated subject name would race and create
 * duplicates. Upserts on (user, subject, date, session_number) — see
 * migration 0009 — so reviewing and importing the same document twice
 * updates those sessions in place instead of duplicating them; a session
 * with no number (common for a photo/PDF extraction) can't be deduped this
 * way and always inserts fresh, same as before.
 */
export function useImportSessions() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      inputs,
      sourceDocumentId,
    }: {
      inputs: SessionInput[]
      sourceDocumentId?: string
    }): Promise<void> => {
      if (!session) throw new Error('Not signed in.')
      for (const input of inputs) {
        const subjectId = await resolveSubjectId(input.subject, session.user.id)
        const { error } = await supabase.from('sessions').upsert(
          {
            user_id: session.user.id,
            subject_id: subjectId,
            session_number: input.sessionNumber,
            title: input.title.trim(),
            topics: input.topics,
            scheduled_date: input.scheduledDate,
            reading_material: input.readingMaterial,
            source_document_id: sourceDocumentId ?? null,
          },
          { onConflict: 'user_id,subject_id,scheduled_date,session_number' },
        )
        if (error) throw new Error(error.message)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

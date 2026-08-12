import { supabase } from '../lib/supabase'
import { unwrap } from './shared'
import { toIsoDate } from '../lib/time'

export type SessionStatus = 'upcoming' | 'prepped' | 'attended' | 'missed'

export interface UpcomingSession {
  id: string
  subject: string
  sessionNumber: number | null
  title: string
  topics: string[]
  scheduledDate: string
  readingMaterial: string | null
  status: SessionStatus
}

interface SessionRow {
  id: string
  session_number: number | null
  title: string
  topics: string[] | null
  scheduled_date: string
  reading_material: string | null
  status: string
  // Supabase infers embedded relations as arrays without generated DB types
  // (it can't know the FK is many-to-one), even though there's exactly one.
  subjects: { name: string }[] | null
}

function fromRow(row: SessionRow): UpcomingSession {
  return {
    id: row.id,
    subject: row.subjects?.[0]?.name ?? '',
    sessionNumber: row.session_number,
    title: row.title,
    topics: row.topics ?? [],
    scheduledDate: row.scheduled_date,
    readingMaterial: row.reading_material,
    status: row.status as SessionStatus,
  }
}

const SELECT_COLUMNS =
  'id, session_number, title, topics, scheduled_date, reading_material, status, subjects(name)'

/**
 * Plain fetcher (no hook yet — nothing renders sessions today; there's no UI
 * to create them either, this is planner-input plumbing ahead of a future
 * syllabus/document-import feature). Returns sessions in the next `daysAhead`
 * days that haven't already happened.
 */
export async function fetchUpcomingSessions(daysAhead = 14, now: Date = new Date()): Promise<UpcomingSession[]> {
  const todayIso = toIsoDate(now)
  const until = new Date(now)
  until.setDate(until.getDate() + daysAhead)
  const untilIso = toIsoDate(until)

  const result = await supabase
    .from('sessions')
    .select(SELECT_COLUMNS)
    .in('status', ['upcoming', 'prepped'])
    .gte('scheduled_date', todayIso)
    .lte('scheduled_date', untilIso)
    .order('scheduled_date', { ascending: true })

  return unwrap<SessionRow[]>(result).map(fromRow)
}

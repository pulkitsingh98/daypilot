import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { resolveSubjectId, SUBJECTS_QUERY_KEY } from './subjects'
import { TIMETABLE_QUERY_KEY } from './timetableBlocks'
import { dayKeyForDate, dayOfWeekToIndex } from '../lib/time'
import type { ParsedSessionRow } from '../lib/excelImport'

export interface ExcelImportSummary {
  classesCreated: number
  sessionsCreated: number
}

/**
 * Turns validated rows from the session-sheet template into real data:
 * one timetable_blocks row per distinct (subject, weekday, start, end)
 * combination found — the recurring pattern, derived from real dates rather
 * than asked for separately — plus one sessions row per occurrence, dated
 * and carrying its own reading requirement. Sequential inserts, same
 * subject-race reason as useImportTasks/useImportSessions/useImportClasses.
 */
export async function importExcelSessions(rows: ParsedSessionRow[], userId: string): Promise<ExcelImportSummary> {
  const validRows = rows.filter((r) => !r.error && r.date && r.startTime && r.endTime)

  const subjectIdByName = new Map<string, string>()
  async function getSubjectId(name: string): Promise<string> {
    const cached = subjectIdByName.get(name)
    if (cached) return cached
    const id = await resolveSubjectId(name, userId)
    if (!id) throw new Error(`Could not resolve subject "${name}".`)
    subjectIdByName.set(name, id)
    return id
  }

  const seenPatterns = new Set<string>()
  let classesCreated = 0

  for (const r of validRows) {
    const dayKey = dayKeyForDate(new Date(`${r.date}T00:00:00`))
    const patternKey = `${r.subject}::${dayKey}::${r.startTime}::${r.endTime}`
    if (seenPatterns.has(patternKey)) continue
    seenPatterns.add(patternKey)

    const subjectId = await getSubjectId(r.subject)
    const existing = await supabase
      .from('timetable_blocks')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('day_of_week', dayOfWeekToIndex(dayKey))
      .eq('start_time', r.startTime as string)
      .eq('end_time', r.endTime as string)
      .maybeSingle()
    if (!existing.data) {
      const { error } = await supabase.from('timetable_blocks').insert({
        user_id: userId,
        subject_id: subjectId,
        day_of_week: dayOfWeekToIndex(dayKey),
        start_time: r.startTime,
        end_time: r.endTime,
      })
      if (error) throw new Error(error.message)
      classesCreated++
    }
  }

  let sessionsCreated = 0
  for (const r of validRows) {
    const subjectId = await getSubjectId(r.subject)
    const { error } = await supabase.from('sessions').insert({
      user_id: userId,
      subject_id: subjectId,
      session_number: r.sessionNumber,
      title: r.topic || '(untitled session)',
      topics: r.topic ? [r.topic] : [],
      scheduled_date: r.date,
      reading_material: r.readingRequired || null,
    })
    if (error) throw new Error(error.message)
    sessionsCreated++
  }

  return { classesCreated, sessionsCreated }
}

export function useImportExcelSessions() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: ParsedSessionRow[]): Promise<ExcelImportSummary> => {
      if (!session) throw new Error('Not signed in.')
      return importExcelSessions(rows, session.user.id)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TIMETABLE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

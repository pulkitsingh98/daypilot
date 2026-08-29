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
 * Every row's subject was already resolved (column, registry, or sheet
 * name) and validated non-blank by parseExcelWorkbook — a row with no
 * resolvable subject carries an error and is filtered out here, never
 * silently imported as untitled. Both tables upsert on their natural key
 * (timetable_blocks: user/subject/weekday/time — migration 0011; sessions:
 * user/subject/date/session_number — migration 0009), so running this
 * import again updates existing rows in place instead of duplicating them.
 *
 * Block and session are created together in one pass over the rows —
 * deliberately NOT two separate passes (all blocks, then all sessions).
 * Two passes meant a mid-import failure on the sessions pass (a bad row, a
 * transient network blip) left every subject processed after that point
 * with a timetable_block already committed from the first pass but no
 * session at all. buildUpcomingOccurrences can't tell that apart from a
 * subject that's genuinely session-less by design, so it fell back to
 * projecting that "class" as recurring every week indefinitely — the
 * ghost classes still showing up months past the actual term. One pass
 * means a failure partway through leaves a clean prefix (every row before
 * it fully created, block and session together) and a clean gap after it
 * (nothing created yet) — never an orphaned block.
 */
export async function importExcelSessions(rows: ParsedSessionRow[], userId: string): Promise<ExcelImportSummary> {
  const validRows = rows.filter((r) => !r.error && r.subject && r.date && r.startTime && r.endTime)

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
  let sessionsCreated = 0

  for (const r of validRows) {
    const subjectId = await getSubjectId(r.subject)

    const dayKey = dayKeyForDate(new Date(`${r.date}T00:00:00`))
    const patternKey = `${r.subject}::${dayKey}::${r.startTime}::${r.endTime}`
    if (!seenPatterns.has(patternKey)) {
      seenPatterns.add(patternKey)
      const { error: blockError } = await supabase.from('timetable_blocks').upsert(
        {
          user_id: userId,
          subject_id: subjectId,
          day_of_week: dayOfWeekToIndex(dayKey),
          start_time: r.startTime,
          end_time: r.endTime,
        },
        { onConflict: 'user_id,subject_id,day_of_week,start_time,end_time' },
      )
      if (blockError) throw new Error(blockError.message)
      classesCreated++
    }

    const { error: sessionError } = await supabase.from('sessions').upsert(
      {
        user_id: userId,
        subject_id: subjectId,
        session_number: r.sessionNumber,
        title: r.topic || '(untitled session)',
        topics: r.topic ? [r.topic] : [],
        scheduled_date: r.date,
        reading_material: r.readingRequired || null,
        start_time: r.startTime,
        end_time: r.endTime,
      },
      { onConflict: 'user_id,subject_id,scheduled_date,session_number' },
    )
    if (sessionError) throw new Error(sessionError.message)
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

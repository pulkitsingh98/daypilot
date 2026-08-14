import { useMemo, useState } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useUpcomingSessions } from '../data/sessions'
import { useDailyPlansInRange, type DailyPlan } from '../data/dailyPlans'
import { useTasks } from '../data/tasks'
import { useClassOccurrenceStatuses } from '../data/classOccurrences'
import { buildUpcomingOccurrences } from '../lib/sessionRollover'
import type { ClassEntry } from '../data/timetableBlocks'
import { addMonths, dayKeyForDate, toIsoDate } from '../lib/time'
import MonthCalendar from '../components/history/MonthCalendar'
import DayDetail from '../components/history/DayDetail'

export default function History() {
  const now = useMemo(() => new Date(), [])
  const todayIso = toIsoDate(now)

  const [viewedMonth, setViewedMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso)

  const monthStartIso = toIsoDate(viewedMonth)
  const monthEndIso = toIsoDate(new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 0))

  const { data: classes = [] } = useClasses()
  const { data: sessions = [] } = useUpcomingSessions()
  const { data: tasks = [] } = useTasks()
  const {
    data: monthPlans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useDailyPlansInRange(monthStartIso, monthEndIso)
  const { data: classOccurrences = new Map() } = useClassOccurrenceStatuses(monthStartIso, monthEndIso)

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const plansByDate = useMemo(() => {
    const map = new Map<string, DailyPlan>()
    for (const plan of monthPlans) map.set(plan.planDate, plan)
    return map
  }, [monthPlans])

  // Real per-date occurrences for today and any future date this month —
  // sessions (unbounded, fetched from today forward) let this pin a class to
  // the exact date it actually meets instead of projecting every timetable
  // slot that has ever shared its weekday onto every calendar cell, which is
  // what made today's own cell in this same calendar show classes that
  // aren't really happening today (buildUpcomingOccurrences's fallback
  // covers that, but only for genuinely session-less subjects). Sessions
  // before today were never fetched (fetchUpcomingSessions only looks
  // forward), so this can't help with truly past dates — those still fall
  // back to the plain weekday match below, an accepted approximation for
  // history that predates any of this.
  const monthEndDate = new Date(`${monthEndIso}T00:00:00`)
  const forwardDaysAhead = Math.max(0, Math.ceil((monthEndDate.getTime() - now.getTime()) / 86_400_000) + 1)
  const classesByDateForward = useMemo(() => {
    const occurrences = buildUpcomingOccurrences(classes, sessions, classOccurrences, now, forwardDaysAhead)
    const map = new Map<string, ClassEntry[]>()
    for (const occ of occurrences) {
      const list = map.get(occ.dateIso) ?? []
      list.push(occ.entry)
      map.set(occ.dateIso, list)
    }
    return map
  }, [classes, sessions, classOccurrences, now, forwardDaysAhead])

  function classesForDate(dateIso: string): ClassEntry[] {
    if (dateIso >= todayIso) return classesByDateForward.get(dateIso) ?? []
    return classes.filter((c) => c.day === dayKeyForDate(new Date(`${dateIso}T00:00:00`)))
  }

  const classesForSelectedDay = classesForDate(selectedDateIso)

  function goToMonth(months: number) {
    const target = addMonths(viewedMonth, months)
    setViewedMonth(target)
    setSelectedDateIso(toIsoDate(target))
  }

  return (
    <div className="p-4">
      <h1 className="font-display text-2xl font-semibold text-ink">History</h1>
      <p className="mt-1 text-sm text-mist">Review what got done, day by day.</p>

      {plansLoading && <p className="mt-4 text-sm text-mist">Loading…</p>}
      {plansError && (
        <p className="mt-4 text-sm text-danger">Could not load your history. Try refreshing.</p>
      )}

      <div className="mt-4 rounded-xl border border-mist-line bg-paper-raised p-4">
        <MonthCalendar
          viewedMonth={viewedMonth}
          onPrevMonth={() => goToMonth(-1)}
          onNextMonth={() => goToMonth(1)}
          selectedDateIso={selectedDateIso}
          onSelectDate={setSelectedDateIso}
          plansByDate={plansByDate}
          tasksById={tasksById}
          classesForDate={classesForDate}
          classOccurrences={classOccurrences}
          todayIso={todayIso}
        />
      </div>

      <DayDetail
        dateIso={selectedDateIso}
        classesForDay={classesForSelectedDay}
        plan={plansByDate.get(selectedDateIso)}
        tasksById={tasksById}
        classOccurrences={classOccurrences}
      />
    </div>
  )
}

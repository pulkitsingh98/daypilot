import { useMemo, useState } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useDailyPlansInRange, type DailyPlan } from '../data/dailyPlans'
import { useTasks } from '../data/tasks'
import { useClassOccurrenceStatuses } from '../data/classOccurrences'
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

  const selectedDayKey = dayKeyForDate(new Date(`${selectedDateIso}T00:00:00`))
  const classesForSelectedDay = useMemo(
    () => classes.filter((c) => c.day === selectedDayKey),
    [classes, selectedDayKey],
  )

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
        <p className="mt-4 text-sm text-red-600">Could not load your history. Try refreshing.</p>
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
          classes={classes}
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

import type { ClassEntry } from '../../data/timetableBlocks'
import type { DailyPlan } from '../../data/dailyPlans'
import type { Task } from '../../data/tasks'
import type { ClassOccurrenceMap } from '../../data/classOccurrences'
import { computeDayCompletion, type DayCompletion } from '../../lib/dayCompletion'
import { DAYS, dayKeyForDate, toIsoDate } from '../../lib/time'

interface MonthCalendarProps {
  viewedMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  selectedDateIso: string
  onSelectDate: (dateIso: string) => void
  plansByDate: Map<string, DailyPlan>
  tasksById: Map<string, Task>
  classes: ClassEntry[]
  classOccurrences: ClassOccurrenceMap
  todayIso: string
}

function cellColorClass(plan: DailyPlan | undefined, completion: DayCompletion): string {
  if (!plan) return 'bg-haze text-mist-line'
  if (completion.total === 0) return 'bg-haze text-mist'
  if (completion.done === completion.total) return 'bg-emerald-500 text-paper-raised'
  if (completion.done === 0) return 'bg-red-400 text-paper-raised'
  return 'bg-amber-400 text-paper-raised'
}

export default function MonthCalendar({
  viewedMonth,
  onPrevMonth,
  onNextMonth,
  selectedDateIso,
  onSelectDate,
  plansByDate,
  tasksById,
  classes,
  classOccurrences,
  todayIso,
}: MonthCalendarProps) {
  const year = viewedMonth.getFullYear()
  const month = viewedMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = DAYS.findIndex((d) => d.key === dayKeyForDate(firstOfMonth))

  const cells: (Date | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="rounded-lg p-1.5 text-mist hover:bg-haze"
        >
          ‹
        </button>
        <h2 className="text-sm font-semibold text-ink">
          {viewedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="rounded-lg p-1.5 text-mist hover:bg-haze"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-mist">
        {DAYS.map((d) => (
          <div key={d.key}>{d.short}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cellDate, i) => {
          if (!cellDate) return <div key={`blank-${i}`} />
          const dateIso = toIsoDate(cellDate)
          const plan = plansByDate.get(dateIso)
          const classesForDay = classes.filter((c) => c.day === dayKeyForDate(cellDate))
          const completion = computeDayCompletion(plan, dateIso, tasksById, classesForDay, classOccurrences)
          const isSelected = dateIso === selectedDateIso
          const isToday = dateIso === todayIso

          return (
            <button
              key={dateIso}
              type="button"
              onClick={() => onSelectDate(dateIso)}
              aria-label={`View ${dateIso}`}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-shadow ${cellColorClass(
                plan,
                completion,
              )} ${isSelected ? 'ring-2 ring-dusk ring-offset-1' : ''} ${isToday ? 'font-bold underline' : ''}`}
            >
              {cellDate.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-mist">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> All done
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> None done
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-haze" /> No plan
        </span>
      </div>
    </div>
  )
}

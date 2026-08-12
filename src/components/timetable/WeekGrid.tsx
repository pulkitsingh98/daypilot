import { useMemo } from 'react'
import type { ClassEntry } from '../../data/timetableBlocks'
import { DAYS, formatHourLabel, formatTimeLabel, toMinutes } from '../../lib/time'

interface WeekGridProps {
  classes: ClassEntry[]
  onEdit: (entry: ClassEntry) => void
}

const DEFAULT_START = 8 * 60
const DEFAULT_END = 18 * 60
const PADDING_MINUTES = 30
const MIN_BLOCK_HEIGHT = 32

function getTimeBounds(classes: ClassEntry[]) {
  if (classes.length === 0) return { start: DEFAULT_START, end: DEFAULT_END }

  let min = DEFAULT_START
  let max = DEFAULT_END
  for (const entry of classes) {
    min = Math.min(min, toMinutes(entry.startTime))
    max = Math.max(max, toMinutes(entry.endTime))
  }
  min = Math.max(0, Math.floor((min - PADDING_MINUTES) / 60) * 60)
  max = Math.min(24 * 60, Math.ceil((max + PADDING_MINUTES) / 60) * 60)
  return { start: min, end: max }
}

export default function WeekGrid({ classes, onEdit }: WeekGridProps) {
  const bounds = useMemo(() => getTimeBounds(classes), [classes])
  const totalMinutes = bounds.end - bounds.start
  const hourMarks = useMemo(() => {
    const marks: number[] = []
    for (let m = bounds.start; m <= bounds.end; m += 60) marks.push(m)
    return marks
  }, [bounds])

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-mist-line bg-paper-raised md:block">
      <div className="grid min-w-[760px] grid-cols-[56px_repeat(7,1fr)]">
        <div className="border-b border-mist-line" />
        {DAYS.map((day) => (
          <div
            key={day.key}
            className="border-b border-l border-mist-line py-2 text-center text-sm font-semibold text-ink-soft"
          >
            {day.short}
          </div>
        ))}

        <div className="relative" style={{ height: totalMinutes }}>
          {hourMarks.map((mark) => (
            <div
              key={mark}
              className="absolute right-2 -translate-y-1/2 text-xs text-mist"
              style={{ top: mark - bounds.start }}
            >
              {formatHourLabel(mark)}
            </div>
          ))}
        </div>

        {DAYS.map((day) => {
          const dayClasses = classes.filter((entry) => entry.day === day.key)
          return (
            <div
              key={day.key}
              className="relative border-l border-mist-line"
              style={{ height: totalMinutes }}
            >
              {hourMarks.map((mark) => (
                <div
                  key={mark}
                  className="absolute inset-x-0 border-t border-mist-line"
                  style={{ top: mark - bounds.start }}
                />
              ))}
              {dayClasses.map((entry) => {
                const top = toMinutes(entry.startTime) - bounds.start
                const height = Math.max(
                  MIN_BLOCK_HEIGHT,
                  toMinutes(entry.endTime) - toMinutes(entry.startTime),
                )
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="absolute left-1 right-1 overflow-hidden rounded-md bg-dusk px-2 py-1 text-left text-xs text-paper-raised shadow-sm hover:bg-dusk-deep"
                    style={{ top, height }}
                  >
                    <div className="truncate font-semibold">{entry.subject.trim() || '(untitled class)'}</div>
                    <div className="truncate text-haze">
                      {formatTimeLabel(entry.startTime)}–{formatTimeLabel(entry.endTime)}
                    </div>
                    {entry.prepRule && <div className="truncate text-haze">📖 prep</div>}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

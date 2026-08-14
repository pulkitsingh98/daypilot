import { useEffect, useState } from 'react'

/** Ticks once a minute — plenty for a clock display, no reason to re-render every second. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/**
 * A small live date/time readout — placed in-flow next to a page's own
 * heading rather than fixed to the viewport, so it can't collide with the
 * header buttons some pages (Timetable, Subjects) already put in that
 * corner.
 */
export default function LiveClock() {
  const now = useNow()
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const timeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return (
    <span className="shrink-0 font-mono text-xs font-medium text-mist sm:text-sm">
      {dateLabel} · {timeLabel}
    </span>
  )
}

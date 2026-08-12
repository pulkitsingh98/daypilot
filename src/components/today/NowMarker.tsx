interface NowMarkerProps {
  /** e.g. "11:42 AM" */
  label: string
}

/**
 * The one dawn-gold mark on the whole screen — sits in the timeline's spine
 * sequence at the point matching the current time, so at a glance you see
 * where "now" falls among what's done, what's next, and what's later.
 */
export default function NowMarker({ label }: NowMarkerProps) {
  return (
    <div className="relative flex items-center gap-2 py-0.5">
      <span className="absolute -left-[26px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-paper-raised bg-dawn ring-1 ring-dawn" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-dawn-deep">
        Now · {label}
      </span>
      <span className="h-px flex-1 bg-dawn/30" />
    </div>
  )
}

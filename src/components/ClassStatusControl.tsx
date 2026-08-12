import { useState } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import type { ItemStatus } from '../lib/todayView'

export const CLASS_STATUS_META: Record<'done' | 'postponed' | 'cancelled', { label: string; dot: string }> = {
  done: { label: 'Done', dot: 'bg-dusk' },
  postponed: { label: 'Postponed', dot: 'bg-amber-500' },
  cancelled: { label: 'Cancelled', dot: 'bg-mist' },
}

interface ClassStatusControlProps {
  status: ItemStatus
  onSetStatus: (status: Exclude<ItemStatus, 'pending'> | null) => void
}

/** A class occurrence's status control — tap to open Done/Postponed/Cancelled, tap the active one again to reset to pending. Used on Today's timeline and Timetable's Upcoming list, so a class marked postponed reads the same everywhere. */
export default function ClassStatusControl({ status, onSetStatus }: ClassStatusControlProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative mt-0.5 shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label="Set class status"
        className={`flex h-4 w-4 items-center justify-center rounded-[4px] border-2 ${
          status === 'pending' ? 'border-mist-line bg-paper-raised' : `border-transparent ${CLASS_STATUS_META[status].dot}`
        }`}
      >
        {status === 'done' && <Check className="h-2.5 w-2.5 text-paper-raised" strokeWidth={3} aria-hidden="true" />}
        {status === 'postponed' && (
          <Clock3 className="h-2.5 w-2.5 text-paper-raised" strokeWidth={3} aria-hidden="true" />
        )}
        {status === 'cancelled' && <X className="h-2.5 w-2.5 text-paper-raised" strokeWidth={3} aria-hidden="true" />}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-6 z-10 flex w-32 flex-col gap-0.5 rounded-lg border border-mist-line bg-paper-raised p-1 text-xs shadow-lg"
        >
          {(['done', 'postponed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onSetStatus(status === s ? null : s)
                setOpen(false)
              }}
              className={`rounded px-2 py-1 text-left hover:bg-haze ${
                status === s ? 'font-semibold text-dusk' : 'text-ink-soft'
              }`}
            >
              {CLASS_STATUS_META[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

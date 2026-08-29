import { useState } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import type { ItemStatus } from '../lib/todayView'

export const CLASS_STATUS_META: Record<'done' | 'postponed' | 'cancelled', { label: string; dot: string; text: string }> = {
  done: { label: 'Done', dot: 'bg-success', text: 'text-success' },
  postponed: { label: 'Postponed', dot: 'bg-warning', text: 'text-dawn-deep' },
  cancelled: { label: 'Cancelled', dot: 'bg-mist', text: 'text-mist' },
}

interface ClassStatusControlProps {
  status: ItemStatus
  /** Only meaningful when status is 'postponed'. Undefined/null = postponed with no known date yet. */
  rescheduledDate?: string | null
  /** rescheduledDate is only read when status is 'postponed'; omit it to leave whatever's already stored untouched. */
  onSetStatus: (status: Exclude<ItemStatus, 'pending'> | null, rescheduledDate?: string | null) => void
}

function formatRescheduledDate(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * A class occurrence's status control — tap to open Done/Postponed/Cancelled,
 * tap the active one again to reset to pending. Used on Today's timeline and
 * Timetable's Upcoming list, so a class marked postponed reads the same
 * everywhere. Choosing Postponed (when not already) opens a small prompt for
 * when it'll actually happen — a real date, or "not sure yet" — and a
 * postponed occurrence always shows that date (or its absence) as its own
 * small control, editable at any time independent of the status itself.
 */
export default function ClassStatusControl({ status, rescheduledDate, onSetStatus }: ClassStatusControlProps) {
  const [open, setOpen] = useState(false)
  const [datePromptOpen, setDatePromptOpen] = useState(false)
  const [dateInput, setDateInput] = useState('')

  function openDatePrompt() {
    setDateInput(rescheduledDate ?? '')
    setDatePromptOpen(true)
    setOpen(false)
  }

  function handleStatusPick(s: 'done' | 'postponed' | 'cancelled') {
    if (status === s) {
      onSetStatus(null)
      setOpen(false)
      return
    }
    if (s === 'postponed') {
      openDatePrompt()
      return
    }
    onSetStatus(s)
    setOpen(false)
  }

  function saveDate() {
    onSetStatus('postponed', dateInput || null)
    setDatePromptOpen(false)
  }

  function saveNoDate() {
    onSetStatus('postponed', null)
    setDatePromptOpen(false)
  }

  return (
    <div className="relative mt-0.5 shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setDatePromptOpen(false)
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

      {status === 'postponed' && !datePromptOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            openDatePrompt()
          }}
          className="mt-0.5 block whitespace-nowrap text-[10px] font-medium text-dawn-deep hover:underline"
        >
          {rescheduledDate ? `→ ${formatRescheduledDate(rescheduledDate)}` : '→ set date'}
        </button>
      )}

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-6 z-10 flex w-32 flex-col gap-0.5 rounded-lg border border-mist-line bg-paper-raised p-1 text-xs shadow-lg"
        >
          {(['done', 'postponed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusPick(s)}
              className={`rounded px-2 py-1 text-left hover:bg-haze ${
                status === s ? `font-semibold ${CLASS_STATUS_META[s].text}` : 'text-ink-soft'
              }`}
            >
              {CLASS_STATUS_META[s].label}
            </button>
          ))}
        </div>
      )}

      {datePromptOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-6 z-10 flex w-48 flex-col gap-1.5 rounded-lg border border-mist-line bg-paper-raised p-2 text-xs shadow-lg"
        >
          <p className="font-medium text-ink-soft">When will it actually happen?</p>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="rounded border border-mist-line px-1.5 py-1 text-xs focus:border-dusk focus:outline-none"
          />
          <button
            type="button"
            disabled={!dateInput}
            onClick={saveDate}
            className="rounded bg-dusk px-2 py-1 font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:bg-mist-line"
          >
            Save date
          </button>
          <button type="button" onClick={saveNoDate} className="rounded px-2 py-1 text-ink-soft hover:bg-haze">
            Not sure yet
          </button>
          <button
            type="button"
            onClick={() => setDatePromptOpen(false)}
            className="rounded px-2 py-1 text-mist hover:bg-haze"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

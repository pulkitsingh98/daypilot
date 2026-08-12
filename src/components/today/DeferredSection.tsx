import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { PlanDeferredItem } from '../../data/dailyPlans'

interface DeferredSectionProps {
  items: PlanDeferredItem[]
}

export default function DeferredSection({ items }: DeferredSectionProps) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-mist-line bg-paper-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-3 text-sm font-semibold text-ink"
      >
        <span>Deferred today ({items.length})</span>
        <ChevronDown
          className={`h-4 w-4 text-mist transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-mist-line p-3">
          {items.map((item, index) => (
            <li key={index}>
              <div className="text-sm font-medium text-ink">{item.title}</div>
              <div className="text-xs text-mist">{item.reason}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

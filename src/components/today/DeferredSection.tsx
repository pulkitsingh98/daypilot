import { useState } from 'react'
import type { PlanDeferredItem } from '../../store'

interface DeferredSectionProps {
  items: PlanDeferredItem[]
}

export default function DeferredSection({ items }: DeferredSectionProps) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-3 text-sm font-semibold text-slate-900"
      >
        <span>Deferred today ({items.length})</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-slate-200 p-3">
          {items.map((item, index) => (
            <li key={index}>
              <div className="text-sm font-medium text-slate-800">{item.title}</div>
              <div className="text-xs text-slate-500">{item.reason}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

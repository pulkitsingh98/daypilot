import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MoreHorizontal, X } from 'lucide-react'
import { navItems } from '../nav'

// Bottom tab bars stop working past ~5 items on a narrow phone — labels
// wrap, icons crowd, things start looking broken. These are the ones worth
// one tap; everything else lives behind "More" (still one tap away, just
// not fighting for space in the bar itself). The Sidebar (desktop) has
// room to show all of them flat, so this split is mobile-only.
const PRIMARY_PATHS = new Set(['/', '/timetable', '/backlog', '/goals'])

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryItems = navItems.filter((item) => PRIMARY_PATHS.has(item.to))
  const moreItems = navItems.filter((item) => !PRIMARY_PATHS.has(item.to))

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-mist-line bg-paper-raised pb-[env(safe-area-inset-bottom)] md:hidden">
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMoreOpen(false)}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                isActive ? 'text-dusk' : 'text-mist'
              }`
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-mist"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-2xl bg-paper-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-lg py-3 text-center text-xs font-medium ${
                      isActive ? 'bg-haze text-dusk' : 'text-ink-soft hover:bg-haze'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

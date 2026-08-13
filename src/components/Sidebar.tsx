import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { navItems } from '../nav'
import { useTodayStreak } from '../lib/useTodayStreak'
import StreakSummary from './StreakSummary'
import AppLogo from './AppLogo'

const COLLAPSED_STORAGE_KEY = 'daypilot:sidebarCollapsed'

export default function Sidebar() {
  const streak = useTodayStreak()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true')

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <aside
      className={`hidden shrink-0 md:flex md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-r md:border-mist-line md:bg-paper-raised md:py-6 md:transition-[width] md:duration-150 ${
        collapsed ? 'md:w-16 md:px-2' : 'md:w-64 md:px-3'
      }`}
    >
      <div className={`mb-6 flex items-center gap-2 px-1 ${collapsed ? 'justify-center' : ''}`}>
        <AppLogo size="sm" />
        {!collapsed && <span className="font-display text-lg font-semibold text-dusk-deep">DayPilot</span>}
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center px-0' : ''
              } ${isActive ? 'bg-dusk text-paper-raised' : 'text-ink-soft hover:bg-haze hover:text-ink'}`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" strokeWidth={2} />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-mist hover:bg-haze hover:text-ink-soft ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" aria-hidden="true" strokeWidth={2} />
        ) : (
          <>
            <PanelLeftClose className="h-[18px] w-[18px] shrink-0" aria-hidden="true" strokeWidth={2} />
            Collapse
          </>
        )}
      </button>

      {!collapsed && (
        <div className="mt-4 px-1">
          <StreakSummary {...streak} />
        </div>
      )}
    </aside>
  )
}

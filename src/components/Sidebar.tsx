import { NavLink } from 'react-router-dom'
import { navItems } from '../nav'

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-mist-line md:bg-paper-raised md:px-3 md:py-6">
      <div className="mb-6 px-3 font-display text-lg font-semibold text-dusk-deep">DayPilot</div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-dusk text-paper-raised'
                  : 'text-ink-soft hover:bg-haze hover:text-ink'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

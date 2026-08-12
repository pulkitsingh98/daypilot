import { NavLink } from 'react-router-dom'
import { navItems } from '../nav'

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-mist-line bg-paper-raised pb-[env(safe-area-inset-bottom)] md:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
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
    </nav>
  )
}

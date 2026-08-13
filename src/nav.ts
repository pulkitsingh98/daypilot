import {
  CalendarDays,
  ClipboardList,
  History,
  Leaf,
  ListChecks,
  Settings,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/backlog', label: 'Backlog', icon: ClipboardList },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/my-life', label: 'Life', icon: Leaf },
  { to: '/history', label: 'History', icon: History },
  { to: '/getting-started', label: 'Getting Started', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: Settings },
]

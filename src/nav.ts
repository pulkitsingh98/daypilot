export interface NavItem {
  to: string
  label: string
  icon: string
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Today', icon: '☀️' },
  { to: '/backlog', label: 'Backlog', icon: '📋' },
  { to: '/goals', label: 'Goals', icon: '🎯' },
  { to: '/my-life', label: 'Life', icon: '🌿' },
  { to: '/history', label: 'History', icon: '🕒' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

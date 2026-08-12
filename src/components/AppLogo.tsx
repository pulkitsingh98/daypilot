import { Compass } from 'lucide-react'

const SIZES = {
  sm: { badge: 'h-6 w-6', icon: 'h-3.5 w-3.5', radius: 'rounded-md' },
  md: { badge: 'h-8 w-8', icon: 'h-[18px] w-[18px]', radius: 'rounded-lg' },
  lg: { badge: 'h-11 w-11', icon: 'h-6 w-6', radius: 'rounded-xl' },
} as const

/** DayPilot's mark — a compass, for navigating the day. Same badge everywhere it appears (Sidebar, Login) so it reads as one identity. */
export default function AppLogo({ size = 'md' }: { size?: keyof typeof SIZES }) {
  const { badge, icon, radius } = SIZES[size]
  return (
    <span
      className={`inline-flex ${badge} ${radius} shrink-0 items-center justify-center bg-dusk text-paper-raised`}
    >
      <Compass className={icon} strokeWidth={2.25} aria-hidden="true" />
    </span>
  )
}

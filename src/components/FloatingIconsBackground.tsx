import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  NotebookPen,
  PenLine,
  Target,
  type LucideIcon,
} from 'lucide-react'

interface FloatingIconConfig {
  Icon: LucideIcon
  top: string
  left: string
  size: number
  duration: number
  delay: number
  driftX: number
  driftY: number
  rotate: number
}

const FLOATING_ICONS: FloatingIconConfig[] = [
  { Icon: BookOpen, top: '8%', left: '10%', size: 88, duration: 9, delay: 0, driftX: 16, driftY: -20, rotate: 8 },
  { Icon: CheckCircle2, top: '16%', left: '84%', size: 64, duration: 7, delay: 1.2, driftX: -12, driftY: 18, rotate: -10 },
  { Icon: Clock3, top: '72%', left: '8%', size: 74, duration: 10, delay: 0.5, driftX: 14, driftY: 16, rotate: 6 },
  { Icon: CalendarDays, top: '78%', left: '86%', size: 80, duration: 8, delay: 2, driftX: -18, driftY: -14, rotate: -6 },
  { Icon: PenLine, top: '42%', left: '4%', size: 58, duration: 6.5, delay: 1.6, driftX: 12, driftY: 12, rotate: 12 },
  { Icon: GraduationCap, top: '4%', left: '55%', size: 68, duration: 8.5, delay: 0.8, driftX: -14, driftY: 20, rotate: -8 },
  { Icon: Target, top: '58%', left: '92%', size: 60, duration: 7.5, delay: 2.4, driftX: 16, driftY: -12, rotate: 10 },
  { Icon: NotebookPen, top: '88%', left: '48%', size: 64, duration: 9.5, delay: 1, driftX: -16, driftY: -18, rotate: -12 },
]

/**
 * Slowly drifting study/planning icons, fixed to the viewport so they read as
 * ambient texture rather than content — used behind the Login card and
 * behind the whole app shell. Brownish/warm and low-opacity on purpose: they
 * should be findable in the empty space around real content, never compete
 * with it. Sizing/opacity here is the one place to retune both at once.
 */
export default function FloatingIconsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {FLOATING_ICONS.map(({ Icon, top, left, size, duration, delay, driftX, driftY, rotate }, i) => (
        <Icon
          key={i}
          className="floating-icon absolute text-ink-soft/[0.14]"
          style={
            {
              top,
              left,
              width: size,
              height: size,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              '--drift-x': `${driftX}px`,
              '--drift-y': `${driftY}px`,
              '--drift-r': `${rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

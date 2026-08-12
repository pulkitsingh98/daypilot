import { Flame, PartyPopper } from 'lucide-react'
import type { TodayStreak } from '../lib/useTodayStreak'

const RING_SIZE = 44
const RING_STROKE = 4
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function statusLabel(pct: number, total: number): string {
  if (total === 0) return 'Nothing scheduled yet'
  if (pct === 0) return "Let's get moving"
  if (pct < 50) return 'Just getting started'
  if (pct < 100) return 'Good progress'
  return 'All done today'
}

/** Today's progress as a radial gauge (not another number-and-bar) plus the streak flame — the Sidebar and the mobile Today page both render this from the same useTodayStreak() data. */
export default function StreakSummary({ todayDone, todayTotal, streakDays, loading }: TodayStreak) {
  if (loading || (todayTotal === 0 && streakDays === 0)) return null

  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0
  const offset = RING_CIRCUMFERENCE * (1 - pct / 100)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-mist-line bg-haze p-3">
      <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-mist-line)"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-dusk)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-dusk-deep">
          {pct === 100 ? (
            <PartyPopper className="h-4 w-4" aria-hidden="true" />
          ) : (
            <span className="text-[11px] font-semibold">{pct}%</span>
          )}
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink-soft">{statusLabel(pct, todayTotal)}</p>
        <p className="text-[11px] text-mist">
          {todayDone} of {todayTotal} today
        </p>
        {streakDays > 0 && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-dawn-deep">
            <Flame className="h-3 w-3" aria-hidden="true" />
            {streakDays}-day streak
          </div>
        )}
      </div>
    </div>
  )
}

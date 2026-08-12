import { Flame } from 'lucide-react'
import type { TodayStreak } from '../lib/useTodayStreak'

/** Compact "today's progress + streak" card — the Sidebar's bottom (desktop) and the Today page's bottom (mobile) both render this from the same useTodayStreak() data. */
export default function StreakSummary({ todayDone, todayTotal, streakDays, loading }: TodayStreak) {
  if (loading || (todayTotal === 0 && streakDays === 0)) return null

  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0

  return (
    <div className="rounded-xl border border-mist-line bg-haze p-3">
      <div className="flex items-baseline justify-between text-xs font-medium text-ink-soft">
        <span>Today</span>
        <span>
          {todayDone}/{todayTotal} done
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-mist-line">
        <div className="h-full rounded-full bg-dusk transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      {streakDays > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-dawn-deep">
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          {streakDays}-day streak
        </div>
      )}
    </div>
  )
}

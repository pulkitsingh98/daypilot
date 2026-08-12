import { useMemo, useState } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useDailyPlan } from '../data/dailyPlans'
import { addDays, dayKeyForDate, toIsoDate } from '../lib/time'
import { getLastPlanNudgeDate, setLastPlanNudgeDate } from '../lib/planNudge'
import { buildTimelineItems } from '../lib/todayView'
import { usePlanGeneration } from '../services/usePlanGeneration'
import QuickAdd from '../components/today/QuickAdd'
import MorningNudge from '../components/today/MorningNudge'
import TomorrowPreview from '../components/today/TomorrowPreview'
import TimelineBlock from '../components/today/TimelineBlock'
import DeferredSection from '../components/today/DeferredSection'

export default function Today() {
  const now = useMemo(() => new Date(), [])
  const todayKey = toIsoDate(now)

  const { data: classes = [], isLoading: classesLoading, error: classesError } = useClasses()
  const { data: plan, isLoading: planLoading, error: planError } = useDailyPlan(todayKey)
  const { loading, error, generate, retry } = usePlanGeneration()
  const [nudgeDismissed, setNudgeDismissed] = useState(false)

  const todayClasses = useMemo(
    () => classes.filter((c) => c.day === dayKeyForDate(now)),
    [classes, now],
  )
  const tomorrowClasses = useMemo(
    () => classes.filter((c) => c.day === dayKeyForDate(addDays(now, 1))),
    [classes, now],
  )
  const timelineItems = useMemo(() => buildTimelineItems(todayClasses, plan), [todayClasses, plan])

  const showNudge =
    !plan && !planLoading && !loading && !nudgeDismissed && getLastPlanNudgeDate() !== todayKey

  function markNudgeHandled() {
    setLastPlanNudgeDate(todayKey)
    setNudgeDismissed(true)
  }

  async function handleGenerate(remainingOnly: boolean) {
    await generate({ now, remainingOnly })
    markNudgeHandled()
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-slate-900">Today</h1>

      <div className="mt-4">
        <QuickAdd />
      </div>

      {showNudge && (
        <MorningNudge
          loading={loading}
          onGenerate={() => void handleGenerate(false)}
          onDismiss={markNudgeHandled}
        />
      )}

      {classesLoading && <p className="mb-4 text-sm text-slate-500">Loading your timetable…</p>}

      <TomorrowPreview classes={tomorrowClasses} plan={plan} />

      {(classesError || planError) && (
        <p className="mb-4 text-sm text-red-600">Could not load today's data. Try refreshing.</p>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={retry}
            className="ml-auto shrink-0 font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {planLoading ? (
        <p className="text-sm text-slate-500">Loading today's plan…</p>
      ) : !plan ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm text-slate-500">No plan yet for today.</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGenerate(false)}
            className="mt-3 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? 'Planning…' : 'Plan my day'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-sm text-indigo-900">{plan.note}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGenerate(true)}
              className="shrink-0 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Replanning…' : 'Replan rest of day'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {timelineItems.map((item) => (
              <TimelineBlock key={item.key} item={item} />
            ))}
          </div>

          <DeferredSection items={plan.deferred} />
        </>
      )}
    </div>
  )
}

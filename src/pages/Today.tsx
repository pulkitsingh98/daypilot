import { useMemo, useState } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useDailyPlan } from '../data/dailyPlans'
import { useTasks } from '../data/tasks'
import { useSubjects } from '../data/subjects'
import { addDays, dayKeyForDate, formatTimeLabel, formatTimeOfDay, toIsoDate, toMinutes } from '../lib/time'
import { getLastPlanNudgeDate, setLastPlanNudgeDate } from '../lib/planNudge'
import { dismissOnboardingBanner, isOnboardingBannerDismissed } from '../lib/onboardingBanner'
import { buildTimelineItems } from '../lib/todayView'
import { usePlanGeneration } from '../services/usePlanGeneration'
import QuickAdd from '../components/today/QuickAdd'
import MorningNudge from '../components/today/MorningNudge'
import TomorrowPreview from '../components/today/TomorrowPreview'
import TimelineBlock from '../components/today/TimelineBlock'
import NowMarker from '../components/today/NowMarker'
import DeferredSection from '../components/today/DeferredSection'
import UploadDocumentButton from '../components/documents/UploadDocumentButton'

export default function Today() {
  const now = useMemo(() => new Date(), [])
  const todayKey = toIsoDate(now)

  const { data: classes = [], isLoading: classesLoading, error: classesError } = useClasses()
  const { data: plan = null, isLoading: planLoading, error: planError } = useDailyPlan(todayKey)
  const { data: tasks = [] } = useTasks()
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects()
  const { loading, error, generate, retry } = usePlanGeneration()
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(() => isOnboardingBannerDismissed())

  const todayClasses = useMemo(
    () => classes.filter((c) => c.day === dayKeyForDate(now)),
    [classes, now],
  )
  const tomorrowClasses = useMemo(
    () => classes.filter((c) => c.day === dayKeyForDate(addDays(now, 1))),
    [classes, now],
  )
  const timelineItems = useMemo(() => buildTimelineItems(todayClasses, plan), [todayClasses, plan])
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const showNudge =
    !plan && !planLoading && !loading && !nudgeDismissed && getLastPlanNudgeDate() !== todayKey
  const showOnboardingBanner =
    !classesLoading && !subjectsLoading && classes.length === 0 && subjects.length === 0 && !bannerDismissed

  function markNudgeHandled() {
    setLastPlanNudgeDate(todayKey)
    setNudgeDismissed(true)
  }

  function dismissBanner() {
    dismissOnboardingBanner()
    setBannerDismissed(true)
  }

  async function handleGenerate(remainingOnly: boolean) {
    await generate({ now, remainingOnly })
    markNudgeHandled()
  }

  // Slots a NowMarker into the sorted timeline at the point matching the
  // current time — a real row in the sequence, not a proportionally
  // positioned overlay, so it stays correct regardless of block heights.
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowLabel = formatTimeLabel(formatTimeOfDay(now))
  const timelineRows: Array<{ key: string; node: React.ReactNode }> = []
  let nowInserted = false
  timelineItems.forEach((item) => {
    if (!nowInserted && toMinutes(item.start) > nowMinutes) {
      timelineRows.push({ key: 'now-marker', node: <NowMarker label={nowLabel} /> })
      nowInserted = true
    }
    timelineRows.push({
      key: item.key,
      node: <TimelineBlock item={item} task={item.taskId ? tasksById.get(item.taskId) : undefined} />,
    })
  })
  if (!nowInserted) timelineRows.push({ key: 'now-marker', node: <NowMarker label={nowLabel} /> })

  return (
    <div className="p-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Today</h1>

      {showOnboardingBanner && (
        <div className="mt-4 rounded-xl border border-mist-line bg-haze p-3">
          <p className="text-sm font-medium text-dusk-deep">New here? Set up your term in one step</p>
          <p className="mt-0.5 text-sm text-dusk">
            Upload a photo or PDF of your timetable and DayPilot builds your class schedule for
            you — a one-time thing per term, not something you'll need to redo daily.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <UploadDocumentButton
              label="Upload timetable"
              helperText="A photo or PDF of your class schedule."
              className="rounded-lg bg-dusk px-3 py-1.5 text-sm font-medium text-paper-raised hover:bg-dusk-deep"
            />
            <button
              type="button"
              onClick={dismissBanner}
              className="text-sm font-medium text-dusk hover:underline"
            >
              I'll do this later
            </button>
          </div>
        </div>
      )}

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

      {classesLoading && <p className="mb-4 text-sm text-mist">Loading your timetable…</p>}

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
        <p className="text-sm text-mist">Loading today's plan…</p>
      ) : !plan ? (
        <div className="rounded-xl border border-dashed border-mist-line bg-paper-raised p-6 text-center">
          <p className="text-sm text-mist">No plan yet for today.</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGenerate(false)}
            className="mt-3 rounded-lg bg-dawn-deep px-5 py-2.5 text-sm font-medium text-paper-raised hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Planning…' : 'Plan my day'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-mist-line bg-haze p-3">
            <p className="text-sm text-dusk-deep">{plan.note}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGenerate(true)}
              className="shrink-0 rounded-lg border border-mist-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-dusk hover:bg-haze disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Replanning…' : 'Replan rest of day'}
            </button>
          </div>

          <div className="relative flex flex-col gap-3 pl-[26px]">
            <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-mist-line" />
            {timelineRows.map((row) => (
              <div key={row.key}>{row.node}</div>
            ))}
          </div>

          <DeferredSection items={plan.deferred} />
        </>
      )}
    </div>
  )
}

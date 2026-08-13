import { useMemo, useState } from 'react'
import { useClasses } from '../data/timetableBlocks'
import { useDailyPlan, useToggleTimelineItemDone } from '../data/dailyPlans'
import { useTasks } from '../data/tasks'
import { useClassOccurrenceStatuses, useSetClassOccurrenceStatus } from '../data/classOccurrences'
import { addDays, dayKeyForDate, formatTimeLabel, formatTimeOfDay, toIsoDate, toMinutes } from '../lib/time'
import { getLastPlanNudgeDate, setLastPlanNudgeDate } from '../lib/planNudge'
import { getLastEveningNudgeDate, setLastEveningNudgeDate } from '../lib/eveningNudge'
import { buildTimelineItems, getTimelineItemStatus, type ItemStatus, type TimelineItem } from '../lib/todayView'
import { useTodayStreak } from '../lib/useTodayStreak'
import StreakSummary from '../components/StreakSummary'
import { usePlanGeneration } from '../services/usePlanGeneration'
import QuickAdd from '../components/today/QuickAdd'
import MorningNudge from '../components/today/MorningNudge'
import EveningNudge from '../components/today/EveningNudge'
import TomorrowPreview from '../components/today/TomorrowPreview'
import TimelineBlock from '../components/today/TimelineBlock'
import NowMarker from '../components/today/NowMarker'
import DeferredSection from '../components/today/DeferredSection'
import ClearTodoListCard from '../components/today/ClearTodoListCard'
import LiveClock from '../components/LiveClock'

export default function Today() {
  const now = useMemo(() => new Date(), [])
  const todayKey = toIsoDate(now)
  const tomorrowKey = toIsoDate(addDays(now, 1))

  const { data: classes = [], isLoading: classesLoading, error: classesError } = useClasses()
  const { data: plan = null, isLoading: planLoading, error: planError } = useDailyPlan(todayKey)
  const { data: tomorrowPlan = null, isLoading: tomorrowPlanLoading } = useDailyPlan(tomorrowKey)
  const { data: tasks = [] } = useTasks()
  const { loading, error, generate, retry } = usePlanGeneration()
  const toggleTimelineItemDone = useToggleTimelineItemDone(todayKey)
  const { data: classOccurrences = new Map() } = useClassOccurrenceStatuses(todayKey, todayKey)
  const setClassOccurrenceStatus = useSetClassOccurrenceStatus()
  const streak = useTodayStreak()
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [eveningNudgeDismissed, setEveningNudgeDismissed] = useState(false)

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
  // From 6 PM on, once — classes start in the morning, so the useful moment
  // to plan tomorrow (and get its reading done) is tonight, not tomorrow.
  const showEveningNudge =
    now.getHours() >= 18 &&
    !tomorrowPlan &&
    !tomorrowPlanLoading &&
    !loading &&
    !eveningNudgeDismissed &&
    getLastEveningNudgeDate() !== todayKey

  function markNudgeHandled() {
    setLastPlanNudgeDate(todayKey)
    setNudgeDismissed(true)
  }

  function markEveningNudgeHandled() {
    setLastEveningNudgeDate(todayKey)
    setEveningNudgeDismissed(true)
  }

  async function handleGenerate(remainingOnly: boolean) {
    await generate({ now, remainingOnly })
    markNudgeHandled()
  }

  async function handleGenerateTomorrow() {
    await generate({ now: addDays(now, 1), remainingOnly: false })
    markEveningNudgeHandled()
  }

  const completedKeys = plan?.completedItemKeys ?? []

  function itemStatus(item: TimelineItem): ItemStatus {
    return getTimelineItemStatus(item, tasksById, completedKeys, classOccurrences, todayKey)
  }

  function renderTimelineBlock(item: TimelineItem) {
    const task = item.taskId ? tasksById.get(item.taskId) : undefined
    return (
      <TimelineBlock
        item={item}
        task={task}
        status={itemStatus(item)}
        onSetStatus={(status) => {
          if (item.classId) {
            setClassOccurrenceStatus.mutate({ timetableBlockId: item.classId, dateIso: todayKey, status })
          } else {
            toggleTimelineItemDone.mutate({ key: item.key, done: status === 'done' })
          }
        }}
      />
    )
  }

  // Resolved items (done, postponed, or cancelled) sink out of the active
  // timeline into their own section below — visible as a record of what
  // happened rather than cluttering the still-to-do list above.
  const activeItems = timelineItems.filter((item) => itemStatus(item) === 'pending')
  const completedItems = timelineItems.filter((item) => itemStatus(item) !== 'pending')

  // Slots a NowMarker into the sorted active timeline at the point matching
  // the current time — a real row in the sequence, not a proportionally
  // positioned overlay, so it stays correct regardless of block heights.
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowLabel = formatTimeLabel(formatTimeOfDay(now))
  const timelineRows: Array<{ key: string; node: React.ReactNode }> = []
  let nowInserted = false
  activeItems.forEach((item) => {
    if (!nowInserted && toMinutes(item.start) > nowMinutes) {
      timelineRows.push({ key: 'now-marker', node: <NowMarker label={nowLabel} /> })
      nowInserted = true
    }
    timelineRows.push({ key: item.key, node: renderTimelineBlock(item) })
  })
  if (!nowInserted) timelineRows.push({ key: 'now-marker', node: <NowMarker label={nowLabel} /> })

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-ink">Today</h1>
        <LiveClock />
      </div>

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

      {showEveningNudge && (
        <EveningNudge
          loading={loading}
          onGenerate={() => void handleGenerateTomorrow()}
          onDismiss={markEveningNudgeHandled}
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

          {activeItems.length === 0 && completedItems.length > 0 ? (
            <p className="rounded-xl border border-dashed border-mist-line bg-paper-raised p-6 text-center text-sm text-mist">
              Everything on today's timeline is done. Nice work.
            </p>
          ) : (
            <div className="relative flex flex-col gap-3 pl-[26px]">
              <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-mist-line" />
              {timelineRows.map((row) => (
                <div key={row.key}>{row.node}</div>
              ))}
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="relative mt-4 flex flex-col gap-3 pl-[26px]">
              <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-mist">
                Completed today ({completedItems.length})
              </p>
              <div className="absolute bottom-2 left-[7px] top-6 w-0.5 bg-mist-line" />
              {completedItems.map((item) => (
                <div key={item.key}>{renderTimelineBlock(item)}</div>
              ))}
            </div>
          )}

          <DeferredSection items={plan.deferred} />
        </>
      )}

      <div className="mt-4">
        <StreakSummary {...streak} />
      </div>

      <div className="mt-4">
        <ClearTodoListCard />
      </div>
    </div>
  )
}

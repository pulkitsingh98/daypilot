import { useState } from 'react'
import { useRecurringActivities, type RecurringActivity } from '../data/recurringActivities'
import { useCompetitions, type Competition } from '../data/competitions'
import { dueSoon, findNearestDeadline, getDeadlineInfo } from '../lib/competitions'
import { formatTimeLabel } from '../lib/time'
import RecurringActivityCard from '../components/mylife/RecurringActivityCard'
import RecurringActivityFormSheet from '../components/mylife/RecurringActivityFormSheet'
import CompetitionCard from '../components/mylife/CompetitionCard'
import CompetitionFormSheet from '../components/mylife/CompetitionFormSheet'

export default function MyLife() {
  const { data: activities = [], isLoading: activitiesLoading, error: activitiesError } =
    useRecurringActivities()
  const { data: competitions = [], isLoading: competitionsLoading, error: competitionsError } =
    useCompetitions()

  const [editingActivity, setEditingActivity] = useState<RecurringActivity | null>(null)
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null)
  const [competitionFormOpen, setCompetitionFormOpen] = useState(false)

  const nearestDeadline = findNearestDeadline(competitions)
  const nearestDeadlineInfo = nearestDeadline ? getDeadlineInfo(nearestDeadline.deadlineDate) : null
  const urgent = dueSoon(competitions)

  function openAddActivity() {
    setEditingActivity(null)
    setActivityFormOpen(true)
  }

  function openEditActivity(activity: RecurringActivity) {
    setEditingActivity(activity)
    setActivityFormOpen(true)
  }

  function openAddCompetition() {
    setEditingCompetition(null)
    setCompetitionFormOpen(true)
  }

  function openEditCompetition(competition: Competition) {
    setEditingCompetition(competition)
    setCompetitionFormOpen(true)
  }

  return (
    <div className="p-4">
      <h1 className="font-display text-2xl font-semibold text-ink">My Life</h1>
      <p className="mt-1 text-sm text-mist">
        Your personal time and your competitions, both protected on the calendar.
      </p>

      {nearestDeadline && nearestDeadlineInfo && (
        <div
          className={`mt-4 rounded-xl border p-3 ${
            nearestDeadlineInfo.isOverdue || nearestDeadlineInfo.isDueSoon
              ? 'border-amber-200 bg-amber-50'
              : 'border-mist-line bg-paper-raised'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-mist">Nearest deadline</p>
          <p className="mt-0.5 text-sm text-ink">
            <span className="font-semibold">{nearestDeadline.title}</span> — {nearestDeadlineInfo.label}
            {nearestDeadline.deadlineTime && ` at ${formatTimeLabel(nearestDeadline.deadlineTime)}`}
          </p>
        </div>
      )}

      {urgent.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">
            Due within 7 days
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {urgent.map((c) => {
              const info = getDeadlineInfo(c.deadlineDate)
              return (
                <li key={c.id} className="text-sm text-red-900">
                  <span className="font-medium">{c.title}</span> — {info?.label}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Recurring activities</h2>
          <button
            type="button"
            onClick={openAddActivity}
            className="text-xs font-medium text-dusk hover:text-dusk-deep"
          >
            + Add
          </button>
        </div>

        {activitiesLoading && <p className="text-sm text-mist">Loading…</p>}
        {activitiesError && (
          <p className="text-sm text-red-600">Could not load your activities. Try refreshing.</p>
        )}
        {!activitiesLoading && activities.length === 0 && (
          <p className="text-sm text-mist">
            Nothing yet — add the things you do regularly that aren't academic, like sport or family
            time, so the planner protects them.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <RecurringActivityCard key={activity.id} activity={activity} onEdit={openEditActivity} />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Competitions & opportunities</h2>
          <button
            type="button"
            onClick={openAddCompetition}
            className="text-xs font-medium text-dusk hover:text-dusk-deep"
          >
            + Add
          </button>
        </div>

        {competitionsLoading && <p className="text-sm text-mist">Loading…</p>}
        {competitionsError && (
          <p className="text-sm text-red-600">Could not load your competitions. Try refreshing.</p>
        )}
        {!competitionsLoading && competitions.length === 0 && (
          <p className="text-sm text-mist">
            No competitions or opportunities tracked yet — add a case competition, hackathon, or
            application.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} onEdit={openEditCompetition} />
          ))}
        </div>
      </section>

      {activityFormOpen && (
        <RecurringActivityFormSheet
          key={editingActivity?.id ?? 'new-activity'}
          initial={editingActivity}
          onClose={() => setActivityFormOpen(false)}
        />
      )}

      {competitionFormOpen && (
        <CompetitionFormSheet
          key={editingCompetition?.id ?? 'new-competition'}
          initial={editingCompetition}
          onClose={() => setCompetitionFormOpen(false)}
        />
      )}
    </div>
  )
}

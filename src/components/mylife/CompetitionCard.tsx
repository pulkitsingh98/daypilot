import type { Competition } from '../../data/competitions'
import { getDeadlineInfo, statusMeta } from '../../lib/competitions'
import { formatTimeLabel } from '../../lib/time'

interface CompetitionCardProps {
  competition: Competition
  onEdit: (competition: Competition) => void
}

export default function CompetitionCard({ competition, onEdit }: CompetitionCardProps) {
  const status = statusMeta(competition.status)
  const deadline = getDeadlineInfo(competition.deadlineDate)

  return (
    <div className="rounded-xl border border-mist-line bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{competition.title}</h3>
          {competition.organiser && (
            <p className="mt-0.5 truncate text-xs text-mist">{competition.organiser}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onEdit(competition)}
          aria-label={`Edit ${competition.title}`}
          className="shrink-0 rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
        >
          ✏️
        </button>
      </div>

      {competition.stage && <p className="mt-1 text-xs text-mist">Stage: {competition.stage}</p>}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.chipClass}`}>
          {status.label}
        </span>
        {deadline && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              deadline.isOverdue
                ? 'bg-red-100 text-red-700'
                : deadline.isDueSoon
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-haze text-ink-soft'
            }`}
          >
            {(deadline.isOverdue || deadline.isDueSoon) && <span aria-hidden="true">⚠️</span>}
            {deadline.label}
            {competition.deadlineTime && ` · ${formatTimeLabel(competition.deadlineTime)}`}
          </span>
        )}
        {competition.effortEstimateMinutes && (
          <span className="rounded-full bg-haze px-2 py-0.5 text-xs font-medium text-ink-soft">
            ~{competition.effortEstimateMinutes} min
          </span>
        )}
      </div>
    </div>
  )
}

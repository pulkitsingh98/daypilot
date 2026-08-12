interface EveningNudgeProps {
  onGenerate: () => void
  onDismiss: () => void
  loading: boolean
}

/** Shows from 6 PM on, once, if tomorrow still has no plan — classes start in the morning, so the useful moment to prep is tonight, not tomorrow at 7 AM. */
export default function EveningNudge({ onGenerate, onDismiss, loading }: EveningNudgeProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-mist-line bg-haze p-3">
      <p className="text-sm text-dusk-deep">Evening check-in — want tomorrow planned tonight?</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onDismiss}
          disabled={loading}
          className="text-sm font-medium text-dusk-deep hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="rounded-lg bg-dusk px-3 py-1.5 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Planning…' : 'Plan tomorrow'}
        </button>
      </div>
    </div>
  )
}

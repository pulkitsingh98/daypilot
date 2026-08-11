interface MorningNudgeProps {
  onGenerate: () => void
  onDismiss: () => void
  loading: boolean
}

export default function MorningNudge({ onGenerate, onDismiss, loading }: MorningNudgeProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <p className="text-sm text-indigo-900">New day — want me to plan it?</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onDismiss}
          disabled={loading}
          className="text-sm font-medium text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {loading ? 'Planning…' : 'Plan my day'}
        </button>
      </div>
    </div>
  )
}

import { useOnboardingSteps } from '../lib/useOnboardingSteps'
import OnboardingChecklist from '../components/today/OnboardingChecklist'

export default function GettingStarted() {
  const { completedCount, totalCount, allDone } = useOnboardingSteps()

  return (
    <div className="p-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Getting Started</h1>
      <p className="mt-1 text-sm text-mist">
        {allDone
          ? "You're all set up — revisit any step below whenever you want to add more."
          : 'One-time setup that makes the planner actually useful — each step feeds something it reasons about.'}
      </p>

      {totalCount > 0 && (
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-mist">
          {completedCount} of {totalCount} done
        </p>
      )}

      <div className="mt-2">
        <OnboardingChecklist />
      </div>
    </div>
  )
}

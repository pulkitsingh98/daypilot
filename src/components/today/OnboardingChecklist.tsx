import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useOnboardingSteps } from '../../lib/useOnboardingSteps'

interface OnboardingChecklistProps {
  onDismiss: () => void
}

/** "Getting started" checklist — each step checks off from real data (an actual class, subject, goal...), not a one-time flag, and links straight to the screen where you'd do it. */
export default function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const { steps, completedCount, totalCount, loading } = useOnboardingSteps()

  if (loading) return null

  return (
    <div className="rounded-xl border border-mist-line bg-haze p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-dusk-deep">
          Getting started ({completedCount}/{totalCount})
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium text-dusk hover:underline"
        >
          I'll do this later
        </button>
      </div>

      <ul className="mt-2 flex flex-col gap-2.5">
        {steps.map((step) =>
          step.done ? (
            <li key={step.key} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-dusk text-paper-raised">
                <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
              </span>
              <span data-done="true" className="strike-target text-sm text-mist">
                {step.label}
              </span>
            </li>
          ) : (
            <li key={step.key}>
              <Link to={step.to} className="flex items-start gap-2 text-ink-soft hover:text-ink">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-mist-line" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{step.label}</span>
                  <span className="mt-0.5 block text-xs text-mist">{step.description}</span>
                </span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

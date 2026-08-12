import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { dailyPlanQueryKey } from '../data/dailyPlans'
import { toIsoDate } from '../lib/time'
import { AIError } from './ai'
import { generateDailyPlan, type GeneratePlanOptions } from './planGenerator'

export interface UsePlanGenerationResult {
  loading: boolean
  error: AIError | null
  generate: (options?: GeneratePlanOptions) => Promise<void>
  /** Re-runs the most recent generate() call with the same options. */
  retry: () => void
}

/**
 * Drives generateDailyPlan() with loading/error/retry for the UI. The
 * generated plan itself isn't tracked here — it lands in daily_plans via
 * saveDailyPlan(), so callers should read it with useDailyPlan().
 */
export function usePlanGeneration(): UsePlanGenerationResult {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AIError | null>(null)
  const lastOptionsRef = useRef<GeneratePlanOptions>({})

  const generate = useCallback(
    async (options: GeneratePlanOptions = {}) => {
      if (!session) {
        setError(new AIError('Sign in to use AI features.', 'missing-api-key'))
        return
      }
      lastOptionsRef.current = options
      setLoading(true)
      setError(null)
      try {
        await generateDailyPlan(session.user.id, options)
        const dateIso = toIsoDate(options.now ?? new Date())
        await queryClient.invalidateQueries({ queryKey: dailyPlanQueryKey(dateIso) })
      } catch (err) {
        setError(err instanceof AIError ? err : new AIError('Something went wrong. Please try again.', 'unknown'))
      } finally {
        setLoading(false)
      }
    },
    [session, queryClient],
  )

  const retry = useCallback(() => {
    void generate(lastOptionsRef.current)
  }, [generate])

  return { loading, error, generate, retry }
}

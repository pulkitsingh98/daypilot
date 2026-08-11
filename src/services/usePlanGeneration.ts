import { useCallback, useRef, useState } from 'react'
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
 * generated plan itself isn't tracked here — it lands in the store via
 * setDailyPlan(), so callers should read it with useDailyPlan().
 */
export function usePlanGeneration(): UsePlanGenerationResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AIError | null>(null)
  const lastOptionsRef = useRef<GeneratePlanOptions>({})

  const generate = useCallback(async (options: GeneratePlanOptions = {}) => {
    lastOptionsRef.current = options
    setLoading(true)
    setError(null)
    try {
      await generateDailyPlan(options)
    } catch (err) {
      setError(err instanceof AIError ? err : new AIError('Something went wrong. Please try again.', 'unknown'))
    } finally {
      setLoading(false)
    }
  }, [])

  const retry = useCallback(() => {
    void generate(lastOptionsRef.current)
  }, [generate])

  return { loading, error, generate, retry }
}

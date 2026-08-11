import { useCallback, useRef, useState } from 'react'
import { callAI, parseJsonResponse, AIError, type CallAIParams } from './ai'

export interface UseAICallResult<T> {
  data: T | null
  loading: boolean
  error: AIError | null
  /** Calls the AI with the given params, parses the JSON response, and stores it in `data`. */
  call: (params: CallAIParams) => Promise<T | null>
  /** Re-runs the most recent call() with the same params. No-op if call() hasn't run yet. */
  retry: () => void
}

/** Drives a single AI call + defensive JSON parse, with loading/error/retry for the UI. */
export function useAICall<T = unknown>(): UseAICallResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AIError | null>(null)
  const lastParamsRef = useRef<CallAIParams | null>(null)

  const call = useCallback(async (params: CallAIParams): Promise<T | null> => {
    lastParamsRef.current = params
    setLoading(true)
    setError(null)

    try {
      const raw = await callAI(params)
      const parsed = parseJsonResponse<T>(raw)
      setData(parsed)
      return parsed
    } catch (err) {
      const aiError =
        err instanceof AIError ? err : new AIError('Something went wrong. Please try again.', 'unknown')
      setError(aiError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const retry = useCallback(() => {
    if (lastParamsRef.current) {
      void call(lastParamsRef.current)
    }
  }, [call])

  return { data, loading, error, call, retry }
}

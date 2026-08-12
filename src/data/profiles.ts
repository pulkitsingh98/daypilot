import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { unwrap, unwrapNullable } from './shared'

export type AIProvider = 'gemini' | 'claude' | 'openai' | 'perplexity'

const VALID_PROVIDERS: AIProvider[] = ['gemini', 'claude', 'openai', 'perplexity']

export interface Profile {
  displayName: string | null
  dailyCapacityMinutes: number
  wakeTime: string
  sleepTime: string
  aiProvider: AIProvider
  apiKey: string
  darkMode: boolean
}

const DEFAULTS = {
  dailyCapacityMinutes: 300,
  wakeTime: '07:00',
  sleepTime: '23:00',
} as const

interface ProfileRow {
  display_name: string | null
  daily_capacity_minutes: number
  wake_time: string | null
  sleep_time: string | null
  ai_provider: string
  ai_api_key: string | null
  dark_mode: boolean
}

function fromRow(row: ProfileRow): Profile {
  return {
    displayName: row.display_name,
    dailyCapacityMinutes: row.daily_capacity_minutes,
    wakeTime: row.wake_time?.slice(0, 5) ?? DEFAULTS.wakeTime,
    sleepTime: row.sleep_time?.slice(0, 5) ?? DEFAULTS.sleepTime,
    aiProvider: VALID_PROVIDERS.includes(row.ai_provider as AIProvider) ? (row.ai_provider as AIProvider) : 'gemini',
    apiKey: row.ai_api_key ?? '',
    darkMode: row.dark_mode,
  }
}

export const PROFILE_QUERY_KEY = ['profile'] as const

/**
 * Reads the current user's profile row, auto-creating one with defaults if
 * it doesn't exist yet (there's no DB trigger creating it on signup).
 * Plain async — used by both useProfile() and non-component callers
 * (src/services/ai.ts, the plan generator).
 */
export async function fetchProfile(userId: string): Promise<Profile> {
  const existing = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  const row = unwrapNullable<ProfileRow>(existing)
  if (row) return fromRow(row)

  const created = await supabase.from('profiles').insert({ user_id: userId }).select('*').single()
  return fromRow(unwrap<ProfileRow>(created))
}

export function useProfile() {
  const { session } = useAuth()
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => fetchProfile(session!.user.id),
    enabled: !!session,
  })
}

export type ProfileInput = Partial<Profile>

export function useUpdateProfile() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ProfileInput): Promise<Profile> => {
      if (!session) throw new Error('Not signed in.')
      const patch: Record<string, unknown> = {}
      if (input.displayName !== undefined) patch.display_name = input.displayName
      if (input.dailyCapacityMinutes !== undefined) patch.daily_capacity_minutes = input.dailyCapacityMinutes
      if (input.wakeTime !== undefined) patch.wake_time = input.wakeTime
      if (input.sleepTime !== undefined) patch.sleep_time = input.sleepTime
      if (input.aiProvider !== undefined) patch.ai_provider = input.aiProvider
      if (input.apiKey !== undefined) patch.ai_api_key = input.apiKey
      if (input.darkMode !== undefined) patch.dark_mode = input.darkMode

      const result = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', session.user.id)
        .select('*')
        .single()
      return fromRow(unwrap<ProfileRow>(result))
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY })
      const previous = queryClient.getQueryData<Profile>(PROFILE_QUERY_KEY)
      queryClient.setQueryData<Profile>(PROFILE_QUERY_KEY, (old) => (old ? { ...old, ...input } : old))
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(PROFILE_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
  })
}

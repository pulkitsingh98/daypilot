import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/** Write-only from the app — captured for the project owner to review directly in Supabase, not read back in-app. */
export function useSubmitFeedback() {
  const { session } = useAuth()

  return useMutation({
    mutationFn: async ({ context, message }: { context: string; message: string }): Promise<void> => {
      if (!session) throw new Error('Not signed in.')
      const trimmed = message.trim()
      if (!trimmed) return
      const { error } = await supabase
        .from('user_feedback')
        .insert({ user_id: session.user.id, context, message: trimmed })
      if (error) throw new Error(error.message)
    },
  })
}

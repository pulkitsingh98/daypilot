import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const navigate = useNavigate()

  function switchMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
      } else {
        navigate('/', { replace: true })
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: fullName.trim() ? { data: { full_name: fullName.trim() } } : undefined,
      })
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.session) {
        navigate('/', { replace: true })
      } else {
        setInfo('Account created. Try signing in below.')
        setMode('signin')
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-haze p-4">
      <div className="w-full max-w-sm rounded-2xl border border-mist-line bg-paper-raised p-6">
        <h1 className="font-display text-2xl font-semibold text-ink">DayPilot</h1>
        <p className="mt-1 text-sm text-mist">
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          {mode === 'signup' && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Full name</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="e.g. Alex Rivera"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-600">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-dusk px-4 py-2.5 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:bg-mist-line"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={switchMode}
          className="mt-4 w-full text-center text-sm font-medium text-dusk hover:text-dusk-deep"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppLogo from '../components/AppLogo'
import FloatingIconsBackground from '../components/FloatingIconsBackground'

type Mode = 'signin' | 'signup'

const ADMIN_EMAIL = 'pulkitsingh98@gmail.com'

export default function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
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
        options: {
          // Without this, Supabase falls back to the dashboard's static
          // Site URL for the confirmation email's redirect — which drifts
          // out of sync with wherever the app is actually deployed. This
          // always matches the origin the signup actually happened from.
          emailRedirectTo: window.location.origin,
          ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
        },
      })
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.session) {
        // Straight to Getting Started, not Today — nothing else in the app
        // works without an AI provider key, so that's the one thing worth
        // putting in front of a brand-new signup first. Sign-in doesn't get
        // this redirect; a returning user has already seen the app.
        navigate('/getting-started', { replace: true })
      } else {
        setInfo('Account created. Try signing in below.')
        setMode('signin')
      }
    }

    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-haze p-4">
      <FloatingIconsBackground />

      <p className="relative z-10 mb-5 max-w-xs text-center font-display text-[28px] leading-tight text-ink sm:text-3xl">
        The term you're <span className="italic text-dusk">actually</span> on top of.
      </p>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-mist-line bg-paper-raised p-6 shadow-[0_1px_0_0_var(--color-mist-line)]">
        <div className="flex items-center gap-2.5">
          <AppLogo size="md" />
          <h1 className="font-display text-2xl font-semibold text-ink">DayPilot</h1>
        </div>
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Password</span>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs font-medium text-dusk hover:text-dusk-deep"
                >
                  Forgot password?
                </button>
              )}
            </div>
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

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}

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

      {forgotPasswordOpen && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setForgotPasswordOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-mist-line bg-paper-raised p-5 shadow-lg"
          >
            <h2 className="font-display text-lg font-semibold text-ink">Forgot your password?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              DayPilot doesn't have a self-serve reset yet — contact the admin and they'll get you back in.
            </p>
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="mt-3 block rounded-lg border border-mist-line bg-haze px-3 py-2 text-center text-sm font-medium text-ink hover:bg-mist-line/50"
            >
              {ADMIN_EMAIL}
            </a>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

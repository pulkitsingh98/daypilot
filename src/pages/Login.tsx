import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  NotebookPen,
  PenLine,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import AppLogo from '../components/AppLogo'

type Mode = 'signin' | 'signup'

interface FloatingIconConfig {
  Icon: LucideIcon
  top: string
  left: string
  size: number
  duration: number
  delay: number
  driftX: number
  driftY: number
  rotate: number
}

const FLOATING_ICONS: FloatingIconConfig[] = [
  { Icon: BookOpen, top: '8%', left: '10%', size: 56, duration: 9, delay: 0, driftX: 14, driftY: -18, rotate: 8 },
  { Icon: CheckCircle2, top: '16%', left: '84%', size: 38, duration: 7, delay: 1.2, driftX: -10, driftY: 16, rotate: -10 },
  { Icon: Clock3, top: '72%', left: '8%', size: 46, duration: 10, delay: 0.5, driftX: 12, driftY: 14, rotate: 6 },
  { Icon: CalendarDays, top: '78%', left: '86%', size: 50, duration: 8, delay: 2, driftX: -16, driftY: -12, rotate: -6 },
  { Icon: PenLine, top: '42%', left: '4%', size: 34, duration: 6.5, delay: 1.6, driftX: 10, driftY: 10, rotate: 12 },
  { Icon: GraduationCap, top: '4%', left: '55%', size: 42, duration: 8.5, delay: 0.8, driftX: -12, driftY: 18, rotate: -8 },
  { Icon: Target, top: '58%', left: '92%', size: 36, duration: 7.5, delay: 2.4, driftX: 14, driftY: -10, rotate: 10 },
  { Icon: NotebookPen, top: '88%', left: '48%', size: 40, duration: 9.5, delay: 1, driftX: -14, driftY: -16, rotate: -12 },
]

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-haze p-4">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {FLOATING_ICONS.map(({ Icon, top, left, size, duration, delay, driftX, driftY, rotate }, i) => (
          <Icon
            key={i}
            className="floating-icon absolute text-dusk/10"
            style={
              {
                top,
                left,
                width: size,
                height: size,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                '--drift-x': `${driftX}px`,
                '--drift-y': `${driftY}px`,
                '--drift-r': `${rotate}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-mist-line bg-paper-raised p-6">
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

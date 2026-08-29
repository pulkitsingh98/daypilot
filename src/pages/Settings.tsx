import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile, useUpdateProfile, type AIProvider } from '../data/profiles'
import { useClasses, useClearTimetable } from '../data/timetableBlocks'
import { useClearTasks, useTasks } from '../data/tasks'
import { useSyncMoodleCalendar } from '../data/moodleSync'
import {
  clearLegacyLocalData,
  hasLegacyLocalData,
  importLegacyLocalData,
  type LegacyImportSummary,
} from '../data/legacyImport'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  return (
    <div className="p-4">
      <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-2 text-mist">App preferences will show up here.</p>

      <AccountCard />

      <div className="mt-6 divide-y divide-mist-line rounded-xl border border-mist-line bg-paper-raised">
        <Link
          to="/settings/subjects"
          className="flex items-center justify-between px-4 py-3 hover:bg-haze"
        >
          <div>
            <div className="text-sm font-medium text-ink">Subjects</div>
            <div className="text-xs text-mist">Manage subjects and proficiency ratings</div>
          </div>
          <span className="text-mist">›</span>
        </Link>
        <Link
          to="/settings/documents"
          className="flex items-center justify-between px-4 py-3 hover:bg-haze"
        >
          <div>
            <div className="text-sm font-medium text-ink">Documents</div>
            <div className="text-xs text-mist">Upload syllabi, timetables, and posters</div>
          </div>
          <span className="text-mist">›</span>
        </Link>
        <Link
          to="/settings/debug"
          className="flex items-center justify-between px-4 py-3 hover:bg-haze"
        >
          <div>
            <div className="text-sm font-medium text-ink">AI debug log</div>
            <div className="text-xs text-mist">See exactly what the planner sent and got back</div>
          </div>
          <span className="text-mist">›</span>
        </Link>
      </div>

      <AISettingsCard />

      <MoodleSyncCard />

      <ImportLocalDataCard />

      <DangerZoneCard />
    </div>
  )
}

function AccountCard() {
  const { session } = useAuth()
  const fullName = (session?.user.user_metadata?.full_name as string | undefined) ?? ''

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(fullName)
  const [saving, setSaving] = useState(false)

  function startEditing() {
    setNameInput(fullName)
    setEditing(true)
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } })
    setSaving(false)
    setEditing(false)
  }

  async function handleLogOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="mt-6 rounded-xl border border-mist-line bg-paper-raised p-4">
      <h2 className="text-sm font-semibold text-ink">Account</h2>

      {editing ? (
        <form onSubmit={handleSaveName} className="mt-2 flex items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="e.g. Alex Rivera"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:bg-mist-line"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {fullName ? (
              <p className="truncate text-sm font-medium text-ink">{fullName}</p>
            ) : (
              <p className="text-sm text-mist">No name set</p>
            )}
            <p className="truncate text-sm text-ink-soft">{session?.user.email}</p>
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 text-sm font-medium text-dusk hover:text-dusk-deep"
          >
            {fullName ? 'Edit' : 'Add name'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleLogOut()}
        className="mt-3 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
      >
        Log out
      </button>
    </div>
  )
}

const PROVIDER_META: Record<AIProvider, { label: string; keyLabel: string; pdfSupport: boolean }> = {
  gemini: { label: 'Gemini (free tier)', keyLabel: 'Gemini API key', pdfSupport: true },
  claude: { label: 'Claude', keyLabel: 'Claude API key', pdfSupport: true },
  openai: { label: 'ChatGPT (OpenAI)', keyLabel: 'OpenAI API key', pdfSupport: false },
  perplexity: { label: 'Perplexity', keyLabel: 'Perplexity API key', pdfSupport: false },
}

function AISettingsCard() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const [apiKeyInput, setApiKeyInput] = useState('')

  useEffect(() => {
    if (profile) setApiKeyInput(profile.apiKey)
  }, [profile])

  function handleProviderChange(provider: AIProvider) {
    updateProfile.mutate({ aiProvider: provider })
  }

  function handleApiKeyBlur() {
    if (profile && apiKeyInput !== profile.apiKey) {
      updateProfile.mutate({ apiKey: apiKeyInput })
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-mist-line bg-paper-raised p-4">
      <h2 className="text-sm font-semibold text-ink">AI Provider</h2>
      <p className="mt-1 text-xs text-mist">
        Your key is sent directly to the provider from your browser — never to any DayPilot
        server.
      </p>

      {isLoading || !profile ? (
        <p className="mt-3 text-sm text-mist">Loading…</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Provider</span>
            <select
              value={profile.aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            >
              {(Object.keys(PROVIDER_META) as AIProvider[]).map((provider) => (
                <option key={provider} value={provider}>
                  {PROVIDER_META[provider].label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">{PROVIDER_META[profile.aiProvider].keyLabel}</span>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={handleApiKeyBlur}
              placeholder="Paste your API key"
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          {!PROVIDER_META[profile.aiProvider].pdfSupport && (
            <p className="text-xs text-mist">
              This provider reads images for document uploads (photos work great) but not PDFs —
              use Gemini or Claude for PDF timetables/syllabi.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Never synced'
  return `Last synced ${new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function MoodleSyncCard() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const syncMoodle = useSyncMoodleCalendar()
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [justImported, setJustImported] = useState<number | null>(null)

  useEffect(() => {
    if (profile) setUrlInput(profile.moodleIcsUrl ?? '')
  }, [profile])

  function handleUrlBlur() {
    const trimmed = urlInput.trim()
    if (profile && trimmed !== (profile.moodleIcsUrl ?? '')) {
      updateProfile.mutate({ moodleIcsUrl: trimmed || null })
    }
  }

  async function handleSyncNow() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setError(null)
    setJustImported(null)
    try {
      if (trimmed !== (profile?.moodleIcsUrl ?? '')) {
        await updateProfile.mutateAsync({ moodleIcsUrl: trimmed })
      }
      const result = await syncMoodle.mutateAsync(trimmed)
      setJustImported(result.imported)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync your Moodle calendar. Try again.')
    }
  }

  const syncing = syncMoodle.isPending

  return (
    <div className="mt-6 rounded-xl border border-mist-line bg-paper-raised p-4">
      <h2 className="text-sm font-semibold text-ink">Moodle calendar</h2>
      <p className="mt-1 text-xs text-mist">
        Paste your Moodle "Export calendar" link (Calendar → Export calendar on Moodle) to pull
        assignment deadlines into your Timetable and daily plan automatically. This link contains
        a personal access token — treat it like a password.
      </p>

      {isLoading || !profile ? (
        <p className="mt-3 text-sm text-mist">Loading…</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Calendar URL</span>
            <input
              type="password"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://moodle.example.edu/calendar/export_execute.php?..."
              className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
          {justImported !== null && !error && (
            <p className="text-sm text-success">
              Synced — {justImported} item{justImported === 1 ? '' : 's'} from Moodle.
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-mist">{formatSyncedAt(profile.moodleLastSyncedAt)}</p>
            <button
              type="button"
              disabled={syncing || !urlInput.trim()}
              onClick={() => void handleSyncNow()}
              className="shrink-0 rounded-lg border border-mist-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-haze disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImportLocalDataCard() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [visible] = useState(() => hasLegacyLocalData())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<LegacyImportSummary | null>(null)

  if (!visible) return null

  async function handleImport() {
    if (!session) return
    if (
      !window.confirm(
        "Import the classes, goals, tasks, and plans saved in this browser's local storage into your account? They'll be cleared from local storage afterward.",
      )
    ) {
      return
    }

    setImporting(true)
    setError(null)
    try {
      const result = await importLegacyLocalData(session.user.id)
      clearLegacyLocalData()
      await queryClient.invalidateQueries()
      setSummary(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import your local data. Try again.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-warning/40 bg-warning-soft p-4">
      <h2 className="text-sm font-semibold text-ink">Import my old local data</h2>
      <p className="mt-1 text-xs text-ink-soft">
        We found data saved in this browser from before sign-in was added. Import it into your
        account — this can only be done once, since it clears local storage afterward.
      </p>

      {summary ? (
        <p className="mt-3 text-sm text-success">
          Imported {summary.classes} classes, {summary.goals} goals, {summary.tasks} tasks,{' '}
          {summary.taskHistory} history entries, and {summary.dailyPlans} daily plans.
        </p>
      ) : (
        <>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={importing}
            onClick={() => void handleImport()}
            className="mt-3 rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:bg-mist-line"
          >
            {importing ? 'Importing…' : 'Import local data'}
          </button>
        </>
      )}
    </div>
  )
}

function DangerZoneCard() {
  const { data: classes = [] } = useClasses()
  const { data: tasks = [] } = useTasks()
  const clearTimetable = useClearTimetable()
  const clearTasks = useClearTasks()
  const [error, setError] = useState<string | null>(null)

  async function handleClearTimetable() {
    if (
      !window.confirm(
        `Delete your entire timetable? This removes all ${classes.length} class${classes.length === 1 ? '' : 'es'}, their sessions and reading list, and any postponed/cancelled marks from your account, and can't be undone.`,
      )
    ) {
      return
    }
    setError(null)
    try {
      await clearTimetable.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear your timetable. Try again.')
    }
  }

  async function handleClearTasks() {
    if (
      !window.confirm(
        `Delete your entire to-do list? This removes all ${tasks.length} task${tasks.length === 1 ? '' : 's'} — open, done, and deferred — from your account and can't be undone.`,
      )
    ) {
      return
    }
    setError(null)
    try {
      await clearTasks.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear your to-do list. Try again.')
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-danger/30 bg-danger-soft p-4">
      <h2 className="text-sm font-semibold text-ink">Danger zone</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Permanently removes data from your account (not just this browser) — useful if stale
        classes or tasks are throwing off what the planner sees.
      </p>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={clearTimetable.isPending || classes.length === 0}
          onClick={() => void handleClearTimetable()}
          className="rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearTimetable.isPending ? 'Clearing…' : 'Clear timetable'}
        </button>
        <button
          type="button"
          disabled={clearTasks.isPending || tasks.length === 0}
          onClick={() => void handleClearTasks()}
          className="rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {clearTasks.isPending ? 'Clearing…' : 'Clear to-do list'}
        </button>
      </div>
    </div>
  )
}

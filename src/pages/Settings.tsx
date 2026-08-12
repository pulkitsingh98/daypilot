import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile, useUpdateProfile, type AIProvider } from '../data/profiles'
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
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-2 text-slate-500">App preferences will show up here.</p>

      <AccountCard />

      <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <Link
          to="/settings/timetable"
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">Timetable</div>
            <div className="text-xs text-slate-500">Manage your weekly class schedule</div>
          </div>
          <span className="text-slate-400">›</span>
        </Link>
        <Link
          to="/settings/subjects"
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">Subjects</div>
            <div className="text-xs text-slate-500">Manage subjects and proficiency ratings</div>
          </div>
          <span className="text-slate-400">›</span>
        </Link>
        <Link
          to="/settings/documents"
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">Documents</div>
            <div className="text-xs text-slate-500">Upload syllabi, timetables, and posters</div>
          </div>
          <span className="text-slate-400">›</span>
        </Link>
      </div>

      <AISettingsCard />

      <ImportLocalDataCard />
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
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Account</h2>

      {editing ? (
        <form onSubmit={handleSaveName} className="mt-2 flex items-center gap-2">
          <input
            type="text"
            autoFocus
            placeholder="e.g. Alex Rivera"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {fullName ? (
              <p className="truncate text-sm font-medium text-slate-900">{fullName}</p>
            ) : (
              <p className="text-sm text-slate-400">No name set</p>
            )}
            <p className="truncate text-sm text-slate-600">{session?.user.email}</p>
          </div>
          <button
            type="button"
            onClick={startEditing}
            className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {fullName ? 'Edit' : 'Add name'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleLogOut()}
        className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Log out
      </button>
    </div>
  )
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
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">AI Provider</h2>
      <p className="mt-1 text-xs text-slate-500">
        Your key is sent directly to the provider from your browser — never to any DayPilot
        server.
      </p>

      {isLoading || !profile ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Provider</span>
            <select
              value={profile.aiProvider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="gemini">Gemini (free tier)</option>
              <option value="claude">Claude</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">
              {profile.aiProvider === 'gemini' ? 'Gemini API key' : 'Claude API key'}
            </span>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onBlur={handleApiKeyBlur}
              placeholder="Paste your API key"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </label>
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
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Import my old local data</h2>
      <p className="mt-1 text-xs text-slate-600">
        We found data saved in this browser from before sign-in was added. Import it into your
        account — this can only be done once, since it clears local storage afterward.
      </p>

      {summary ? (
        <p className="mt-3 text-sm text-emerald-700">
          Imported {summary.classes} classes, {summary.goals} goals, {summary.tasks} tasks,{' '}
          {summary.taskHistory} history entries, and {summary.dailyPlans} daily plans.
        </p>
      ) : (
        <>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={importing}
            onClick={() => void handleImport()}
            className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {importing ? 'Importing…' : 'Import local data'}
          </button>
        </>
      )}
    </div>
  )
}

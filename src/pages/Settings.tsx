import { Link } from 'react-router-dom'
import { updateSettings, useSettings, type AIProvider } from '../store'

export default function Settings() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-2 text-slate-500">App preferences will show up here.</p>

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
      </div>

      <AISettingsCard />
    </div>
  )
}

function AISettingsCard() {
  const settings = useSettings()

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">AI Provider</h2>
      <p className="mt-1 text-xs text-slate-500">
        Your key is stored only in this browser and sent directly to the provider — never to any
        DayPilot server.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Provider</span>
          <select
            value={settings.aiProvider}
            onChange={(e) => updateSettings({ aiProvider: e.target.value as AIProvider })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="gemini">Gemini (free tier)</option>
            <option value="claude">Claude</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {settings.aiProvider === 'gemini' ? 'Gemini API key' : 'Claude API key'}
          </span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder="Paste your API key"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </label>
      </div>
    </div>
  )
}

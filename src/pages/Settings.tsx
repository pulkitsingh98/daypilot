import { Link } from 'react-router-dom'

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
    </div>
  )
}

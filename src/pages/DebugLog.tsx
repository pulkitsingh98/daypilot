import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { clearAIDebugLog, getAIDebugLog, type AIDebugEntry, type AICallKind } from '../lib/aiDebugLog'

const KIND_LABELS: Record<AICallKind, string> = {
  plan: 'Plan my day',
  replan: 'Replan rest of day',
  'quick-add': 'Quick add',
  'document-extraction': 'Document extraction',
  other: 'Other',
}

export default function DebugLog() {
  const [entries, setEntries] = useState<AIDebugEntry[]>(() => getAIDebugLog())

  function handleClear() {
    if (!window.confirm('Clear the AI debug log? This only affects this browser.')) return
    clearAIDebugLog()
    setEntries([])
  }

  return (
    <div className="p-4">
      <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-mist hover:text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Settings
      </Link>

      <div className="mt-1 flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">AI debug log</h1>
          <p className="mt-1 text-sm text-mist">
            Exactly what was sent to the AI and what came back, for the last {entries.length === 15 ? '15' : entries.length}{' '}
            call{entries.length === 1 ? '' : 's'} made in this browser.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-lg border border-mist-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
          >
            Clear log
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-mist">
          Nothing logged yet — generate a plan, replan, quick-add a task, or upload a document, then come
          back here.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <DebugEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

function DebugEntryCard({ entry }: { entry: AIDebugEntry }) {
  const [open, setOpen] = useState(false)
  const failed = entry.error !== null

  return (
    <div className="rounded-xl border border-mist-line bg-paper-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-haze px-2 py-0.5 text-xs font-medium text-dusk-deep">
              {KIND_LABELS[entry.kind]}
            </span>
            {failed && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Error</span>
            )}
          </div>
          <p className="mt-1 text-xs text-mist">{new Date(entry.timestamp).toLocaleString()}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-mist transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-mist-line p-3">
          <DebugSection label="System prompt" content={entry.system} />
          <DebugSection label="Context sent" content={entry.user} />
          {failed ? (
            <DebugSection label="Error" content={entry.error as string} tone="error" />
          ) : (
            <DebugSection label="Raw response" content={entry.response ?? ''} />
          )}
        </div>
      )}
    </div>
  )
}

function DebugSection({ label, content, tone }: { label: string; content: string; tone?: 'error' }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <pre
        className={`mt-1 max-h-72 overflow-auto rounded-lg border p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
          tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-mist-line bg-haze text-ink-soft'
        }`}
      >
        {content}
      </pre>
    </div>
  )
}

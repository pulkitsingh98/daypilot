import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { clearAIDebugLog, getAIDebugLog, type AIDebugEntry, type AICallKind } from '../lib/aiDebugLog'
import { asObjectArray, asText, extractPlanResponse, extractPlanningState } from '../lib/formatPlanningDebug'

const KIND_LABELS: Record<AICallKind, string> = {
  plan: 'Plan my day',
  replan: 'Replan rest of day',
  'quick-add': 'Quick add',
  'document-extraction': 'Document extraction',
  other: 'Other',
}

const IS_PLAN_KIND: Record<AICallKind, boolean> = {
  plan: true,
  replan: true,
  'quick-add': false,
  'document-extraction': false,
  other: false,
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
            What the AI actually saw and said back, for the last {entries.length === 15 ? '15' : entries.length}{' '}
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
  const isPlanKind = IS_PLAN_KIND[entry.kind]

  const planningState = isPlanKind ? extractPlanningState(entry.user) : null
  const planResponse = isPlanKind && entry.response ? extractPlanResponse(entry.response) : null

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
          <RawSection label="System prompt" content={entry.system} />

          {planningState ? (
            <PlanningStateSections state={planningState} />
          ) : (
            <RawSection label="Context sent" content={entry.user} />
          )}

          {failed ? (
            <RawSection label="Error" content={entry.error as string} tone="error" />
          ) : planResponse ? (
            <PlanResponseSections response={planResponse} />
          ) : (
            <RawSection label="Raw response" content={entry.response ?? ''} />
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-mist">{title}</p>
      <div className="mt-1 text-xs leading-relaxed text-ink-soft">{children}</div>
    </div>
  )
}

function ListSection({
  title,
  items,
  format,
}: {
  title: string
  items: Record<string, unknown>[]
  format: (item: Record<string, unknown>) => string
}) {
  return (
    <Section title={`${title} (${items.length})`}>
      {items.length === 0 ? (
        <span className="text-mist">None</span>
      ) : (
        <ul className="list-disc pl-4">
          {items.map((item, i) => (
            <li key={i}>{format(item)}</li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function PlanningStateSections({ state }: { state: Record<string, unknown> }) {
  const timetable = asObjectArray(state.timetable)
  const todayClasses = timetable.filter((b) => asText(b, 'when') === 'today')
  const tomorrowClasses = timetable.filter((b) => asText(b, 'when') === 'tomorrow')

  const proficiency =
    typeof state.subjectProficiency === 'object' && state.subjectProficiency !== null
      ? (state.subjectProficiency as Record<string, unknown>)
      : {}
  const proficiencyEntries = Object.entries(proficiency)

  const recentCompletion =
    typeof state.recentCompletion === 'object' && state.recentCompletion !== null
      ? (state.recentCompletion as Record<string, unknown>)
      : null

  return (
    <div className="flex flex-col gap-3">
      <Section title="Window & capacity">
        {asText(state, 'wakeTime')}–{asText(state, 'sleepTime')} · {asText(state, 'capacityMinutes')} min flexible
        capacity today
      </Section>

      <ListSection
        title="Classes today"
        items={todayClasses}
        format={(c) => `${asText(c, 'subject')} · ${asText(c, 'startTime')}–${asText(c, 'endTime')}${c.prepRule ? ' · has a prep rule' : ''}`}
      />
      <ListSection
        title="Classes tomorrow"
        items={tomorrowClasses}
        format={(c) => `${asText(c, 'subject')} · ${asText(c, 'startTime')}–${asText(c, 'endTime')}${c.prepRule ? ' · has a prep rule' : ''}`}
      />
      <ListSection
        title="Recurring activities"
        items={asObjectArray(state.recurringActivities)}
        format={(a) =>
          `${asText(a, 'title')} · ${asText(a, 'category')}${a.day ? ` · ${asText(a, 'day')}` : ' · no fixed day'}${a.isFlexible ? ' · flexible' : ' · fixed'}`
        }
      />
      <ListSection
        title="Upcoming sessions (next 7 days)"
        items={asObjectArray(state.upcomingSessions)}
        format={(s) =>
          `${asText(s, 'subject')} — ${asText(s, 'title')} (${asText(s, 'scheduledDate')})${s.readingMaterial ? `, read: ${asText(s, 'readingMaterial')}` : ''}`
        }
      />
      <ListSection
        title="Open tasks / backlog"
        items={asObjectArray(state.openTasks)}
        format={(t) =>
          `${asText(t, 'title')} · ${asText(t, 'subject') || 'no subject'} · due ${asText(t, 'dueDate') || '—'} · priority ${asText(t, 'priority')}${Number(t.snoozeCount) > 0 ? ` · snoozed ${asText(t, 'snoozeCount')}x` : ''}`
        }
      />
      <ListSection
        title="Goals"
        items={asObjectArray(state.goals)}
        format={(g) => `${asText(g, 'title')} · ${asText(g, 'minutesThisWeek')}/${asText(g, 'weeklyTargetMinutes')} min this week`}
      />
      <ListSection
        title="Competitions & applications (next 14 days)"
        items={asObjectArray(state.competitions)}
        format={(c) => `${asText(c, 'title')} · due ${asText(c, 'deadlineDate') || '—'} · ${asText(c, 'status')}`}
      />
      <ListSection
        title="Yesterday's unfinished blocks"
        items={asObjectArray(state.yesterdayIncompleteBlocks)}
        format={(b) => `${asText(b, 'title')} · ${asText(b, 'start')}–${asText(b, 'end')}`}
      />

      <Section title="Subject proficiency">
        {proficiencyEntries.length === 0 ? (
          <span className="text-mist">None rated</span>
        ) : (
          proficiencyEntries.map(([name, level]) => `${name}: ${level}`).join(', ')
        )}
      </Section>

      <ListSection
        title="History — planned vs actual"
        items={asObjectArray(state.historySummary)}
        format={(h) =>
          `${asText(h, 'subject')} (${asText(h, 'type')}) · planned ${asText(h, 'averagePlannedMinutes')}m vs actual ${asText(h, 'averageActualMinutes')}m · n=${asText(h, 'sampleSize')}`
        }
      />

      {recentCompletion && (
        <Section title="Recent completion (last 7 days)">
          {asText(recentCompletion, 'daysWithData')} days with data · avg completion{' '}
          {Math.round(Number(recentCompletion.averageCompletionRate ?? 0) * 100)}% · {asText(recentCompletion, 'currentStreakDays')}-day streak
        </Section>
      )}
    </div>
  )
}

function PlanResponseSections({ response }: { response: Record<string, unknown> }) {
  const note = asText(response, 'note')
  return (
    <div className="flex flex-col gap-3">
      {note && <Section title="Note to the user">{note}</Section>}
      <ListSection
        title="Blocks scheduled"
        items={asObjectArray(response.blocks)}
        format={(b) => `${asText(b, 'start')}–${asText(b, 'end')} ${asText(b, 'title')} (${asText(b, 'type')}) — ${asText(b, 'reason')}`}
      />
      <ListSection
        title="Deferred"
        items={asObjectArray(response.deferred)}
        format={(d) => `${asText(d, 'title')} — ${asText(d, 'reason')}`}
      />
    </div>
  )
}

function RawSection({ label, content, tone }: { label: string; content: string; tone?: 'error' }) {
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

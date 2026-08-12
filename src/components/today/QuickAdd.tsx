import { useEffect, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useAddTask, type TaskType } from '../../data/tasks'
import { useAICall } from '../../services/useAICall'
import { buildQuickAddPrompt } from '../../prompts/plannerPrompt'
import { normalizeQuickAddResult, type QuickAddPrepSession } from '../../lib/quickAdd'
import { TASK_TYPES, todayIso } from '../../lib/tasks'
import SubjectPicker from '../subjects/SubjectPicker'
import UploadDocumentButton from '../documents/UploadDocumentButton'

interface DraftPrepSession extends QuickAddPrepSession {
  key: string
}

interface Draft {
  title: string
  type: TaskType
  subject: string
  dueDate: string
  estimatedMinutes: string
  prepSessions: DraftPrepSession[]
}

export default function QuickAdd() {
  const [text, setText] = useState('')
  const { data, loading, error, call, retry } = useAICall<Record<string, unknown>>()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const addTask = useAddTask()

  useEffect(() => {
    if (!data) return
    const normalized = normalizeQuickAddResult(data, todayIso())
    setDraft({
      title: normalized.title,
      type: normalized.type,
      subject: normalized.subject,
      dueDate: normalized.dueDate,
      estimatedMinutes: String(normalized.estimatedMinutes),
      prepSessions: normalized.suggestedPrepSessions.map((s) => ({
        ...s,
        key: crypto.randomUUID(),
      })),
    })
    // Only re-derive the draft when a fresh AI response arrives, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || loading) return
    setDraft(null)
    void call({ system: buildQuickAddPrompt(todayIso()), user: text.trim() })
  }

  function handleRetry() {
    setDraft(null)
    retry()
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }

  function updatePrepSession(key: string, patch: Partial<DraftPrepSession>) {
    setDraft((d) =>
      d
        ? { ...d, prepSessions: d.prepSessions.map((s) => (s.key === key ? { ...s, ...patch } : s)) }
        : d,
    )
  }

  function removePrepSession(key: string) {
    setDraft((d) => (d ? { ...d, prepSessions: d.prepSessions.filter((s) => s.key !== key) } : d))
  }

  async function handleConfirm() {
    if (!draft || !draft.title.trim()) return
    const minutes = Number(draft.estimatedMinutes)
    setSaveError(null)

    try {
      await addTask.mutateAsync({
        title: draft.title.trim(),
        subject: draft.subject.trim(),
        type: draft.type,
        priority: 2,
        status: 'open',
        dueDate: draft.dueDate || undefined,
        estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined,
        source: 'quick-add',
      })

      for (const session of draft.prepSessions) {
        if (!session.title.trim()) continue
        await addTask.mutateAsync({
          title: session.title.trim(),
          subject: draft.subject.trim(),
          type: draft.type,
          priority: 2,
          status: 'open',
          dueDate: session.date || undefined,
          estimatedMinutes: session.minutes > 0 ? session.minutes : undefined,
          source: 'quick-add',
        })
      }

      setDraft(null)
      setText('')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this task. Try again.')
    }
  }

  function handleCancel() {
    setDraft(null)
    setText('')
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "quiz on marketing in 3 days"'
          className="min-w-0 flex-1 rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="shrink-0 rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Thinking…' : 'Add'}
        </button>
        <UploadDocumentButton
          label={
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Upload
            </span>
          }
          helperText="A timetable, syllabus, or session list — DayPilot reads it and turns it into classes, sessions, or tasks."
          className="shrink-0 rounded-lg border border-mist-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
        />
      </form>

      {error && !loading && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error.message}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="ml-auto shrink-0 font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {draft && (
        <div className="mt-3 rounded-xl border border-mist-line bg-paper-raised p-4">
          <h3 className="text-sm font-semibold text-ink">Confirm task</h3>
          <p className="mt-1 text-xs text-mist">Nothing is saved until you confirm.</p>

          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-soft">Title</span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
              />
            </label>

            <div className="flex gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-ink-soft">Type</span>
                <select
                  value={draft.type}
                  onChange={(e) => updateDraft({ type: e.target.value as TaskType })}
                  className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-ink-soft">Subject</span>
                <SubjectPicker value={draft.subject} onChange={(subject) => updateDraft({ subject })} />
              </label>
            </div>

            <div className="flex gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-ink-soft">Due date</span>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => updateDraft({ dueDate: e.target.value })}
                  className="min-w-0 rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium text-ink-soft">Est. minutes</span>
                <input
                  type="number"
                  min={1}
                  value={draft.estimatedMinutes}
                  onChange={(e) => updateDraft({ estimatedMinutes: e.target.value })}
                  className="rounded-lg border border-mist-line px-3 py-2 text-sm focus:border-dusk focus:outline-none"
                />
              </label>
            </div>

            {draft.prepSessions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-ink-soft">Suggested prep sessions</p>
                <div className="mt-2 flex flex-col gap-2">
                  {draft.prepSessions.map((session) => (
                    <div
                      key={session.key}
                      className="flex items-start gap-2 rounded-lg border border-mist-line p-2"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <input
                          type="text"
                          value={session.title}
                          onChange={(e) => updatePrepSession(session.key, { title: e.target.value })}
                          className="rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={session.date}
                            onChange={(e) => updatePrepSession(session.key, { date: e.target.value })}
                            className="min-w-0 flex-1 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                          />
                          <input
                            type="number"
                            min={1}
                            value={session.minutes}
                            onChange={(e) =>
                              updatePrepSession(session.key, { minutes: Number(e.target.value) })
                            }
                            className="w-20 rounded-md border border-mist-line px-2 py-1 text-sm focus:border-dusk focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrepSession(session.key)}
                        aria-label={`Remove prep session: ${session.title}`}
                        className="rounded-full p-1 text-mist hover:bg-haze hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!draft.title.trim() && <p className="text-sm text-red-600">Title is required.</p>}
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-soft hover:bg-haze"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!draft.title.trim() || addTask.isPending}
                onClick={() => void handleConfirm()}
                className="rounded-lg bg-dusk px-4 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addTask.isPending
                  ? 'Saving…'
                  : `Confirm${draft.prepSessions.length > 0 ? ` (+${draft.prepSessions.length} prep)` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import type { DocKind } from '../../data/documents'
import type { ExtractionPromptKind } from '../../prompts/plannerPrompt'

interface DocKindPickerProps {
  fileName: string
  onSelect: (choice: { docKind: DocKind | null; promptKind: ExtractionPromptKind }) => void
  onCancel: () => void
}

interface Choice {
  label: string
  description: string
  docKind: DocKind | null
  promptKind: ExtractionPromptKind
}

const CHOICES: Choice[] = [
  {
    label: 'Timetable',
    description: 'A weekly class schedule (days/times only — for specific dated sessions, use Session list or Syllabus instead)',
    docKind: 'timetable',
    promptKind: 'timetable',
  },
  {
    label: 'Session list',
    description: 'Numbered sessions with topics or readings',
    docKind: 'session-list',
    promptKind: 'sessions',
  },
  {
    label: 'Syllabus',
    description: 'A course outline with session-by-session readings',
    docKind: 'syllabus',
    promptKind: 'sessions',
  },
  {
    label: 'Poster or notice',
    description: 'An event, competition, or one-off deadline',
    docKind: 'poster',
    promptKind: 'mixed',
  },
  { label: 'Other', description: 'Something else worth reading for deadlines', docKind: 'other', promptKind: 'mixed' },
  {
    label: 'Not sure — figure it out',
    description: "We'll scan it for any deadlines, events, or tasks",
    docKind: null,
    promptKind: 'mixed',
  },
]

export default function DocKindPicker({ fileName, onSelect, onCancel }: DocKindPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">What is this document?</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 truncate text-sm text-slate-500">{fileName}</p>

        <div className="flex flex-col gap-2">
          {CHOICES.map((choice) => (
            <button
              key={choice.label}
              type="button"
              onClick={() => onSelect({ docKind: choice.docKind, promptKind: choice.promptKind })}
              className="rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-900">{choice.label}</div>
              <div className="text-xs text-slate-500">{choice.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

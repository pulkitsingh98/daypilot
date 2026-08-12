import { useState } from 'react'
import { X } from 'lucide-react'
import type { AppDocument } from '../../data/documents'
import DocumentUploader from './DocumentUploader'
import { useDocumentUploadFlow } from './useDocumentUploadFlow'

interface UploadDocumentButtonProps {
  label?: React.ReactNode
  helperText?: string
  className?: string
}

const DEFAULT_CLASS =
  'shrink-0 rounded-lg bg-dusk px-3 py-2 text-sm font-medium text-paper-raised hover:bg-dusk-deep'

/**
 * A self-contained "Upload" trigger — click it, pick a file, classify it,
 * and the full extract/review/confirm flow runs the same way it does from
 * the Documents screen. Drop this in anywhere an upload should be offered
 * (Today, Timetable, a subject's empty state) without re-wiring anything.
 */
export default function UploadDocumentButton({ label = 'Upload', helperText, className }: UploadDocumentButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const flow = useDocumentUploadFlow()

  function handleUploaded(doc: AppDocument) {
    setPickerOpen(false)
    flow.handleUploaded(doc)
  }

  return (
    <>
      <button type="button" onClick={() => setPickerOpen(true)} className={className ?? DEFAULT_CLASS}>
        {label}
      </button>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
          <div className="w-full rounded-t-2xl bg-paper-raised p-5 sm:max-w-md sm:rounded-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Upload a document</h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-mist hover:bg-haze hover:text-ink-soft"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {helperText && <p className="mb-4 text-sm text-mist">{helperText}</p>}
            <DocumentUploader docKind="other" onUploaded={handleUploaded} />
          </div>
        </div>
      )}

      {flow.extractionError && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {flow.extractionError}
        </p>
      )}

      {flow.overlays}
    </>
  )
}

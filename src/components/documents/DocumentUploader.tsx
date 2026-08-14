import { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { useUploadDocument, type AppDocument, type DocKind } from '../../data/documents'
import { ACCEPT_ATTRIBUTE, isPdf, validateFile } from '../../lib/fileValidation'
import { normalizeImageFile } from '../../lib/fileConversion'

interface DocumentUploaderProps {
  /** Which documents.doc_kind this upload should be tagged with — chosen by the caller, not this component. */
  docKind: DocKind
  onUploaded?: (doc: AppDocument) => void
}

/**
 * Drag-and-drop on desktop; on mobile, a plain file input already surfaces
 * the OS's own "Camera / Photo Library / Browse" chooser, so no separate
 * capture-only button is needed. HEIC is converted to JPEG before preview
 * or upload — see lib/fileConversion.ts for why that's required, not just
 * cosmetic.
 */
export default function DocumentUploader({ docKind, onUploaded }: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewIsPdf, setPreviewIsPdf] = useState(false)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadDocument = useUploadDocument()
  const uploading = uploadDocument.isPending

  function resetPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewIsPdf(false)
    setPendingName(null)
  }

  async function handleFile(file: File) {
    if (uploading) return

    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setPendingName(file.name)

    try {
      const finalFile = isPdf(file) ? file : await normalizeImageFile(file)

      if (isPdf(finalFile)) {
        setPreviewIsPdf(true)
        setPreviewUrl(null)
      } else {
        setPreviewIsPdf(false)
        setPreviewUrl(URL.createObjectURL(finalFile))
      }

      const doc = await uploadDocument.mutateAsync({ file: finalFile, docKind })
      resetPreview()
      onUploaded?.(doc)
    } catch (err) {
      resetPreview()
      setError(err instanceof Error ? err.message : 'Could not upload this file. Try again.')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void handleFile(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!uploading) setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
        } ${dragActive ? 'border-dusk bg-haze' : 'border-mist-line bg-haze hover:bg-haze'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleInputChange}
          disabled={uploading}
          className="hidden"
        />

        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
        ) : previewIsPdf ? (
          <span className="flex h-24 w-24 items-center justify-center rounded-lg bg-mist-line text-dusk">
            <FileText className="h-9 w-9" aria-hidden="true" />
          </span>
        ) : (
          <Upload className="h-8 w-8 text-mist" aria-hidden="true" />
        )}

        {uploading ? (
          <p className="text-sm font-medium text-ink-soft">Uploading {pendingName}…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-ink-soft">Drag a file here, or tap to choose one</p>
            <p className="text-xs text-mist">JPG, PNG, WEBP, HEIC, or PDF — up to 10MB</p>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}

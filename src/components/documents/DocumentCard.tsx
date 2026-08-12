import { useDeleteDocument, useSignedUrl, type AppDocument } from '../../data/documents'
import { docKindLabel, statusMeta } from '../../lib/documents'

interface DocumentCardProps {
  appDocument: AppDocument
  isExtracting?: boolean
  onReview?: (appDocument: AppDocument) => void
  onClassify?: (appDocument: AppDocument) => void
}

export default function DocumentCard({ appDocument, isExtracting, onReview, onClassify }: DocumentCardProps) {
  const isImage = appDocument.fileType?.startsWith('image/') ?? false
  const { data: signedUrl } = useSignedUrl(isImage ? appDocument.storagePath : null)
  const deleteDocument = useDeleteDocument()
  const status = statusMeta(appDocument.status)

  function handleDelete() {
    if (window.confirm(`Delete "${appDocument.fileName}"? This can't be undone.`)) {
      deleteDocument.mutate(appDocument)
    }
  }

  return (
    <div className="rounded-xl border border-mist-line bg-paper-raised p-3">
      <div className="flex items-start gap-3">
        {isImage && signedUrl ? (
          <img
            src={signedUrl}
            alt={appDocument.fileName}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-haze text-2xl">
            {isImage ? '🖼️' : '📄'}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{appDocument.fileName}</p>
          <p className="mt-0.5 text-xs text-mist">{docKindLabel(appDocument.docKind)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.chipClass}`}>
              {status.label}
            </span>
            {isExtracting && (
              <span className="rounded-full bg-haze px-2 py-0.5 text-[10px] font-medium text-dusk-deep">
                Reading document…
              </span>
            )}
          </div>
          {!isExtracting && appDocument.status === 'extracted' && onReview && (
            <button
              type="button"
              onClick={() => onReview(appDocument)}
              className="mt-1.5 text-xs font-medium text-dusk hover:text-dusk-deep"
            >
              Review extraction
            </button>
          )}
          {!isExtracting && appDocument.status === 'uploaded' && onClassify && (
            <button
              type="button"
              onClick={() => onClassify(appDocument)}
              className="mt-1.5 text-xs font-medium text-dusk hover:text-dusk-deep"
            >
              Classify &amp; read
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteDocument.isPending}
          aria-label={`Delete ${appDocument.fileName}`}
          className="shrink-0 rounded-full p-1 text-mist hover:bg-haze hover:text-red-600 disabled:opacity-50"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

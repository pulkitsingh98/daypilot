import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDocuments } from '../data/documents'
import DocumentUploader from '../components/documents/DocumentUploader'
import DocumentCard from '../components/documents/DocumentCard'
import { useDocumentUploadFlow } from '../components/documents/useDocumentUploadFlow'

export default function Documents() {
  const { data: documents = [], isLoading, error } = useDocuments()
  const flow = useDocumentUploadFlow()

  return (
    <div className="p-4">
      <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-mist hover:text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Settings
      </Link>
      <h1 className="font-display text-2xl font-semibold text-ink">Documents</h1>
      <p className="mt-1 text-sm text-mist">
        Upload a photo or PDF of your timetable or a session/reading list and DayPilot will read
        it for you.
      </p>

      <div className="mt-4 rounded-xl border border-mist-line bg-paper-raised p-4">
        <DocumentUploader docKind="other" onUploaded={flow.handleUploaded} />
      </div>

      {flow.extractionError && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {flow.extractionError}
        </p>
      )}

      {isLoading && <p className="mt-4 text-sm text-mist">Loading your documents…</p>}
      {error && (
        <p className="mt-4 text-sm text-danger">Could not load your documents. Try refreshing.</p>
      )}

      {!isLoading && documents.length === 0 && (
        <p className="mt-4 text-sm text-mist">No documents uploaded yet.</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            appDocument={doc}
            isExtracting={flow.extractingDocId === doc.id}
            onReview={flow.handleReview}
            onClassify={flow.handleClassify}
          />
        ))}
      </div>

      {flow.overlays}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useDocuments } from '../data/documents'
import DocumentUploader from '../components/documents/DocumentUploader'
import DocumentCard from '../components/documents/DocumentCard'
import { useDocumentUploadFlow } from '../components/documents/useDocumentUploadFlow'

export default function Documents() {
  const { data: documents = [], isLoading, error } = useDocuments()
  const flow = useDocumentUploadFlow()

  return (
    <div className="p-4">
      <Link to="/settings" className="text-sm text-slate-400 hover:text-slate-600">
        ← Settings
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload a photo or PDF of your timetable or a session/reading list and DayPilot will read
        it for you.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <DocumentUploader docKind="other" onUploaded={flow.handleUploaded} />
      </div>

      {flow.extractionError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {flow.extractionError}
        </p>
      )}

      {isLoading && <p className="mt-4 text-sm text-slate-500">Loading your documents…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600">Could not load your documents. Try refreshing.</p>
      )}

      {!isLoading && documents.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">No documents uploaded yet.</p>
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

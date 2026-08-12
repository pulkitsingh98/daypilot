import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  downloadDocumentBase64,
  useDocuments,
  useSaveExtraction,
  useUpdateDocKind,
  type AppDocument,
  type DocKind,
} from '../data/documents'
import { inferStoredExtractionKind, normalizeExtractionResult, type ExtractionResult } from '../lib/documentExtraction'
import { extractDocumentContent } from '../services/documentExtraction'
import type { ExtractionPromptKind } from '../prompts/plannerPrompt'
import DocumentUploader from '../components/documents/DocumentUploader'
import DocumentCard from '../components/documents/DocumentCard'
import DocKindPicker from '../components/documents/DocKindPicker'
import ExtractionReviewSheet from '../components/documents/ExtractionReviewSheet'

interface ReviewState {
  document: AppDocument
  extraction: ExtractionResult
}

export default function Documents() {
  const { data: documents = [], isLoading, error } = useDocuments()
  const [pendingKindDoc, setPendingKindDoc] = useState<AppDocument | null>(null)
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [reviewState, setReviewState] = useState<ReviewState | null>(null)

  const saveExtraction = useSaveExtraction()
  const updateDocKind = useUpdateDocKind()

  async function runExtraction(doc: AppDocument, promptKind: ExtractionPromptKind) {
    setExtractionError(null)
    setExtractingDocId(doc.id)
    try {
      const fileBase64 = await downloadDocumentBase64(doc.storagePath)
      const mimeType = doc.fileType ?? 'application/octet-stream'
      const result = await extractDocumentContent(promptKind, fileBase64, mimeType)
      await saveExtraction.mutateAsync({ id: doc.id, result })
      setReviewState({ document: { ...doc, extractedJson: result, status: 'extracted' }, extraction: result })
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : 'Could not read this document. Try again.')
    } finally {
      setExtractingDocId(null)
    }
  }

  function handleUploaded(doc: AppDocument) {
    setPendingKindDoc(doc)
  }

  function handleClassify(doc: AppDocument) {
    setPendingKindDoc(doc)
  }

  async function handleKindSelected(choice: { docKind: DocKind | null; promptKind: ExtractionPromptKind }) {
    const doc = pendingKindDoc
    setPendingKindDoc(null)
    if (!doc) return

    let effectiveDoc = doc
    if (choice.docKind && choice.docKind !== doc.docKind) {
      await updateDocKind.mutateAsync({ id: doc.id, docKind: choice.docKind })
      effectiveDoc = { ...doc, docKind: choice.docKind }
    }
    await runExtraction(effectiveDoc, choice.promptKind)
  }

  function handleReview(doc: AppDocument) {
    const kind = inferStoredExtractionKind(doc.extractedJson)
    setReviewState({ document: doc, extraction: normalizeExtractionResult(doc.extractedJson, kind) })
  }

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
        <DocumentUploader docKind="other" onUploaded={handleUploaded} />
      </div>

      {extractionError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {extractionError}
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
            isExtracting={extractingDocId === doc.id}
            onReview={handleReview}
            onClassify={handleClassify}
          />
        ))}
      </div>

      {pendingKindDoc && (
        <DocKindPicker
          fileName={pendingKindDoc.fileName}
          onSelect={(choice) => void handleKindSelected(choice)}
          onCancel={() => setPendingKindDoc(null)}
        />
      )}

      {reviewState && (
        <ExtractionReviewSheet
          key={reviewState.document.id}
          appDocument={reviewState.document}
          extraction={reviewState.extraction}
          onClose={() => setReviewState(null)}
        />
      )}
    </div>
  )
}

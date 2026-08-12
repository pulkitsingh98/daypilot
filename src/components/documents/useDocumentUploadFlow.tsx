import { useState } from 'react'
import {
  downloadDocumentBase64,
  useSaveExtraction,
  useUpdateDocKind,
  type AppDocument,
  type DocKind,
} from '../../data/documents'
import { inferStoredExtractionKind, normalizeExtractionResult, type ExtractionResult } from '../../lib/documentExtraction'
import { extractDocumentContent } from '../../services/documentExtraction'
import type { ExtractionPromptKind } from '../../prompts/plannerPrompt'
import DocKindPicker from './DocKindPicker'
import ExtractionReviewSheet from './ExtractionReviewSheet'

interface ReviewState {
  document: AppDocument
  extraction: ExtractionResult
}

/**
 * The classify -> extract -> review -> confirm orchestration shared by every
 * upload entry point (Documents, Today, Timetable, Subject detail). Each
 * caller just needs to get a freshly-uploaded AppDocument to handleUploaded
 * — this handles the rest and returns the overlay JSX (DocKindPicker /
 * ExtractionReviewSheet) to render wherever the caller likes, usually right
 * before the component's closing tag.
 */
export function useDocumentUploadFlow() {
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

  const overlays = (
    <>
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
    </>
  )

  return {
    handleUploaded,
    handleClassify,
    handleReview,
    extractingDocId,
    extractionError,
    overlays,
  }
}

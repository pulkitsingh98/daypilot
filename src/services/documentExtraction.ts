import { buildDocumentExtractionPrompt, type ExtractionPromptKind } from '../prompts/plannerPrompt'
import { normalizeExtractionResult, type ExtractionResult } from '../lib/documentExtraction'
import { toIsoDate } from '../lib/time'
import { callAI, parseJsonResponse } from './ai'

/**
 * Sends an uploaded document's raw bytes straight to the configured AI
 * provider — both Gemini and Claude read images and PDFs natively, tables
 * and all, so there's no separate OCR/text-extraction step. A multi-page
 * PDF is read in one call since providers handle that internally.
 */
export async function extractDocumentContent(
  promptKind: ExtractionPromptKind,
  fileBase64: string,
  mimeType: string,
): Promise<ExtractionResult> {
  const raw = await callAI({
    system: buildDocumentExtractionPrompt(promptKind, toIsoDate(new Date())),
    user: 'Extract the requested information from this document.',
    fileBase64,
    mimeType,
    kind: 'document-extraction',
  })
  const parsed = parseJsonResponse<unknown>(raw)
  return normalizeExtractionResult(parsed, promptKind)
}

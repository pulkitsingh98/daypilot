import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fileToBase64 } from '../lib/fileConversion'
import type { ExtractionResult } from '../lib/documentExtraction'
import { unwrap } from './shared'

export type DocKind = 'timetable' | 'session-list' | 'syllabus' | 'poster' | 'other'
export type DocumentStatus = 'uploaded' | 'extracted' | 'confirmed'

export interface AppDocument {
  id: string
  fileName: string
  fileType: string | null
  storagePath: string
  docKind: DocKind
  status: DocumentStatus
  createdAt: string
  /** The AI's raw extraction result, once status is 'extracted' or 'confirmed' — shape matches ExtractionResult but isn't validated on read, so run it through normalizeExtractionResult before trusting it. */
  extractedJson: unknown | null
}

interface DocumentRow {
  id: string
  file_name: string
  file_type: string | null
  storage_path: string
  doc_kind: string
  status: string
  created_at: string
  extracted_json: unknown | null
}

function fromRow(row: DocumentRow): AppDocument {
  return {
    id: row.id,
    fileName: row.file_name,
    fileType: row.file_type,
    storagePath: row.storage_path,
    docKind: row.doc_kind as DocKind,
    status: row.status as DocumentStatus,
    createdAt: row.created_at,
    extractedJson: row.extracted_json,
  }
}

const SELECT_COLUMNS =
  'id, file_name, file_type, storage_path, doc_kind, status, created_at, extracted_json'
export const DOCUMENTS_QUERY_KEY = ['documents'] as const

const BUCKET = 'documents'

export async function fetchDocuments(): Promise<AppDocument[]> {
  const result = await supabase
    .from('documents')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
  return unwrap<DocumentRow[]>(result).map(fromRow)
}

export function useDocuments() {
  return useQuery({ queryKey: DOCUMENTS_QUERY_KEY, queryFn: fetchDocuments })
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export interface UploadDocumentInput {
  /** Already validated and, for HEIC/HEIF, already converted to JPEG by the caller — this layer just stores whatever it's given. */
  file: File
  docKind: DocKind
}

export function useUploadDocument() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, docKind }: UploadDocumentInput): Promise<AppDocument> => {
      if (!session) throw new Error('Not signed in.')

      const storagePath = `${session.user.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type })
      if (uploadError) throw new Error(uploadError.message)

      const result = await supabase
        .from('documents')
        .insert({
          user_id: session.user.id,
          file_name: file.name,
          file_type: file.type || null,
          storage_path: storagePath,
          doc_kind: docKind,
          status: 'uploaded',
        })
        .select(SELECT_COLUMNS)
        .single()

      if (result.error) {
        // Best-effort cleanup so a failed row insert doesn't leave an orphaned file.
        await supabase.storage.from(BUCKET).remove([storagePath])
      }
      return fromRow(unwrap<DocumentRow>(result))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (document: AppDocument): Promise<void> => {
      await supabase.storage.from(BUCKET).remove([document.storagePath])
      const { error } = await supabase.from('documents').delete().eq('id', document.id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (document) => {
      await queryClient.cancelQueries({ queryKey: DOCUMENTS_QUERY_KEY })
      const previous = queryClient.getQueryData<AppDocument[]>(DOCUMENTS_QUERY_KEY)
      queryClient.setQueryData<AppDocument[]>(DOCUMENTS_QUERY_KEY, (old = []) =>
        old.filter((d) => d.id !== document.id),
      )
      return { previous }
    },
    onError: (_err, _document, context) => {
      if (context?.previous) queryClient.setQueryData(DOCUMENTS_QUERY_KEY, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  })
}

/** Updates the document's kind once the user classifies it in the post-upload picker. */
export function useUpdateDocKind() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, docKind }: { id: string; docKind: DocKind }): Promise<void> => {
      const { error } = await supabase.from('documents').update({ doc_kind: docKind }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  })
}

/** Downloads an already-uploaded file from storage and returns it as raw base64, ready for callAI's fileBase64 param. */
export async function downloadDocumentBase64(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath)
  if (error) throw new Error(error.message)
  return fileToBase64(data)
}

/** Persists the AI's extraction result and marks the document 'extracted' — does not create any classes/sessions yet, the review sheet does that on Confirm. */
export function useSaveExtraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, result }: { id: string; result: ExtractionResult }): Promise<void> => {
      const { error } = await supabase
        .from('documents')
        .update({ extracted_json: result, status: 'extracted' })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  })
}

export function useConfirmDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('documents').update({ status: 'confirmed' }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY }),
  })
}

/** Signed URL for a private-bucket file — used to render image thumbnails. */
export function useSignedUrl(storagePath: string | null, expiresInSeconds = 3600) {
  return useQuery({
    queryKey: ['documents', 'signed-url', storagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath as string, expiresInSeconds)
      if (error) throw new Error(error.message)
      return data.signedUrl
    },
    enabled: !!storagePath,
    staleTime: (expiresInSeconds - 60) * 1000,
  })
}

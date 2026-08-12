export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const

/** Passed to the file input's `accept` attribute — extensions too, since HEIC's mime type is unreliable across OSes (some report empty type). */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_MIME_TYPES, '.jpg', '.jpeg', '.heic', '.heif'].join(',')

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function isHeic(file: File): boolean {
  const name = file.name.toLowerCase()
  return file.type === 'image/heic' || file.type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function isAcceptedFile(file: File): boolean {
  if (isHeic(file) || isPdf(file)) return true
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
}

/** Returns a user-facing error message, or null if the file is acceptable. */
export function validateFile(file: File): string | null {
  if (!isAcceptedFile(file)) {
    return 'Unsupported file type — use JPG, PNG, WEBP, HEIC, or PDF.'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large — max ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`
  }
  return null
}

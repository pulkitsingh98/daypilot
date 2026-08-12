import { isHeic } from './fileValidation'

/** Raw base64 (no "data:...;base64," prefix), ready for callAI's fileBase64 param. */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Converts HEIC/HEIF to JPEG client-side before it's ever stored or sent
 * anywhere. Necessary, not cosmetic: most non-Safari browsers can't render
 * HEIC in an <img>, and neither Gemini's nor Claude's vision APIs accept
 * image/heic as a mime type. Non-HEIC files pass through unchanged.
 *
 * heic2any bundles a sizeable WASM decoder, so it's dynamically imported —
 * only fetched the moment someone actually uploads a HEIC file, not on
 * every page load.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  if (!isHeic(file)) return file

  const { default: heic2any } = await import('heic2any')
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(converted) ? converted[0] : converted
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
  return new File([blob], newName, { type: 'image/jpeg' })
}

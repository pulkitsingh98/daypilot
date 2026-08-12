import { supabase } from '../lib/supabase'
import { fetchProfile } from '../data/profiles'

export interface CallAIParams {
  system: string
  user: string
  /** Raw base64 file data (no "data:...;base64," prefix) — an image or a PDF. */
  fileBase64?: string
  /** e.g. "image/png", "image/jpeg", "application/pdf" — required alongside fileBase64. */
  mimeType?: string
}

export type AIErrorCode = 'missing-api-key' | 'network' | 'http' | 'parse' | 'unknown'

export class AIError extends Error {
  code: AIErrorCode

  constructor(message: string, code: AIErrorCode) {
    super(message)
    this.name = 'AIError'
    this.code = code
  }
}

const JSON_ONLY_INSTRUCTION =
  '\n\nRespond with JSON only. Do not include any explanation, commentary, or markdown code fences before or after it — return raw JSON that can be parsed directly.'

/**
 * Calls the AI provider configured in Settings with the user's own API key.
 * Never call a provider API directly from anywhere else in the app — this is
 * the single choke point so the JSON-only instruction and error handling stay
 * consistent everywhere.
 */
export async function callAI({ system, user, fileBase64, mimeType }: CallAIParams): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    throw new AIError('Sign in to use AI features.', 'missing-api-key')
  }

  const profile = await fetchProfile(session.user.id)
  const apiKey = profile.apiKey.trim()

  if (!apiKey) {
    throw new AIError(
      'Add your Gemini or Claude API key in Settings to use AI features.',
      'missing-api-key',
    )
  }

  const systemWithJsonInstruction = `${system}${JSON_ONLY_INSTRUCTION}`

  if (profile.aiProvider === 'gemini') {
    return callGemini(apiKey, systemWithJsonInstruction, user, fileBase64, mimeType)
  }
  return callClaude(apiKey, systemWithJsonInstruction, user, fileBase64, mimeType)
}

async function callGemini(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  const parts: Array<Record<string, unknown>> = [{ text: user }]
  if (fileBase64 && mimeType) {
    // Gemini's inline_data is generic — the same shape works for images and
    // PDFs, and it handles a whole multi-page PDF in one call natively.
    parts.push({ inline_data: { mime_type: mimeType, data: fileBase64 } })
  }

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generation_config: { response_mime_type: 'application/json' },
  }

  const response = await fetchOrThrow(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new AIError(`Gemini request failed: ${await extractErrorMessage(response)}`, 'http')
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') {
    throw new AIError('Gemini returned an unexpected response shape.', 'parse')
  }
  return text
}

async function callClaude(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<string> {
  const url = 'https://api.anthropic.com/v1/messages'
  const isPdf = mimeType === 'application/pdf'

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: user }]
  if (fileBase64 && mimeType) {
    // Claude uses a distinct "document" block (not "image") for PDFs — it
    // reads the whole multi-page document natively in one call, same as a
    // single image.
    content.unshift({
      type: isPdf ? 'document' : 'image',
      source: { type: 'base64', media_type: mimeType, data: fileBase64 },
    })
  }

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content }],
  }

  const response = await fetchOrThrow(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Acceptable here: this is a personal, bring-your-own-key app with no
      // backend — the key never leaves the user's browser except to Anthropic.
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(isPdf ? { 'anthropic-beta': 'pdfs-2024-09-25' } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new AIError(`Claude request failed: ${await extractErrorMessage(response)}`, 'http')
  }

  const data = await response.json()
  const textBlock = Array.isArray(data?.content)
    ? data.content.find((block: { type?: string }) => block?.type === 'text')
    : undefined
  if (typeof textBlock?.text !== 'string') {
    throw new AIError('Claude returned an unexpected response shape.', 'parse')
  }
  return textBlock.text
}

async function fetchOrThrow(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new AIError('Could not reach the AI provider. Check your internet connection and try again.', 'network')
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    return data?.error?.message || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

/**
 * Strips markdown code fences a model may wrap JSON in, then parses.
 * Throws AIError('parse') on invalid JSON so callers can offer a retry.
 */
export function parseJsonResponse<T = unknown>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  try {
    return JSON.parse(stripped) as T
  } catch {
    throw new AIError("The AI's response wasn't valid JSON. Try again.", 'parse')
  }
}

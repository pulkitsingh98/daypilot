import { supabase } from '../lib/supabase'
import { fetchProfile } from '../data/profiles'
import { logAICall, type AICallKind } from '../lib/aiDebugLog'

export interface CallAIParams {
  system: string
  user: string
  /** Raw base64 file data (no "data:...;base64," prefix) — an image or a PDF. */
  fileBase64?: string
  /** e.g. "image/png", "image/jpeg", "application/pdf" — required alongside fileBase64. */
  mimeType?: string
  /** Tags this call in the AI debug log (Settings > AI debug log). Defaults to 'other'. */
  kind?: AICallKind
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
export async function callAI({ system, user, fileBase64, mimeType, kind = 'other' }: CallAIParams): Promise<string> {
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
      'Add an API key for your chosen AI provider in Settings to use AI features.',
      'missing-api-key',
    )
  }

  const systemWithJsonInstruction = `${system}${JSON_ONLY_INSTRUCTION}`

  try {
    const raw = await CALLERS[profile.aiProvider](
      apiKey,
      systemWithJsonInstruction,
      user,
      fileBase64,
      mimeType,
      profile.aiModel,
    )
    logAICall({ kind, system: systemWithJsonInstruction, user, response: raw, error: null })
    return raw
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logAICall({ kind, system: systemWithJsonInstruction, user, response: null, error: message })
    throw err
  }
}

type ProviderCaller = (
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
  /** Provider-specific model override from profiles.ai_model — ignored by every caller except the ones that expose a picker (currently just Groq). */
  modelOverride?: string | null,
) => Promise<string>

const CALLERS: Record<import('../data/profiles').AIProvider, ProviderCaller> = {
  gemini: callGemini,
  claude: callClaude,
  openai: callOpenAI,
  perplexity: callPerplexity,
  openrouter: callOpenRouter,
  groq: callGroq,
}

async function callGemini(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<string> {
  // gemini-2.5-flash was retired for new API keys (shuts down entirely
  // Oct 2026) — gemini-3.6-flash is the current GA, production-ready
  // equivalent on the same generateContent endpoint shape.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`

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
    throw new AIError(friendlyErrorMessage('Gemini', response.status, await extractErrorMessage(response)), 'http')
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
    throw new AIError(friendlyErrorMessage('Claude', response.status, await extractErrorMessage(response)), 'http')
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

/**
 * Shared caller for OpenAI-compatible chat-completions endpoints (OpenAI
 * itself, and Perplexity's Sonar API, which deliberately mirrors OpenAI's
 * request/response shape). PDFs aren't supported this way — neither provider
 * reads them through this simple endpoint — so a PDF upload fails with a
 * clear message instead of a confusing provider error.
 */
async function callOpenAICompatible(
  providerLabel: string,
  url: string,
  model: string,
  useJsonMode: boolean,
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
  extraHeaders?: Record<string, string>,
  extraBody?: Record<string, unknown>,
): Promise<string> {
  if (mimeType === 'application/pdf') {
    throw new AIError(
      'This provider only reads images for document uploads, not PDFs. Switch to Gemini or Claude in Settings, or upload a photo instead of a PDF.',
      'http',
    )
  }

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: user }]
  if (fileBase64 && mimeType) {
    content.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } })
  }

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content },
    ],
    ...extraBody,
  }
  if (useJsonMode) body.response_format = { type: 'json_object' }

  const response = await fetchOrThrow(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new AIError(friendlyErrorMessage(providerLabel, response.status, await extractErrorMessage(response)), 'http')
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string') {
    throw new AIError('Received an unexpected response shape.', 'parse')
  }
  return text
}

async function callOpenAI(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<string> {
  return callOpenAICompatible(
    'OpenAI',
    'https://api.openai.com/v1/chat/completions',
    'gpt-4o-mini',
    true,
    apiKey,
    system,
    user,
    fileBase64,
    mimeType,
  )
}

async function callPerplexity(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<string> {
  // response_format support varies by Perplexity plan/model, so this relies
  // on the JSON-only prompt instruction instead of forcing a response_format
  // — if this endpoint ever changes shape, docs.perplexity.ai is the place
  // to check first.
  return callOpenAICompatible(
    'Perplexity',
    'https://api.perplexity.ai/chat/completions',
    'sonar',
    false,
    apiKey,
    system,
    user,
    fileBase64,
    mimeType,
  )
}

// A genuinely free, no-billing-required model on OpenRouter's `:free` tier —
// unlike OpenAI (which has required a paid, billed account for new keys
// since it dropped free trial credits) or Gemini's tightly-capped free
// quota, this needs nothing but a free OpenRouter account and has its own
// separate rate-limit pool. Pinned to one specific model rather than left
// open, so behavior stays predictable — confirmed live against
// openrouter.ai/api/v1/models before picking it. OpenRouter's free-model
// catalog rotates fairly often (models get added and retired), so re-check
// that list if this one starts 404ing.
const OPENROUTER_FREE_MODEL = 'qwen/qwen3.8-27b:free'

async function callOpenRouter(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<string> {
  return callOpenAICompatible(
    'OpenRouter',
    'https://openrouter.ai/api/v1/chat/completions',
    OPENROUTER_FREE_MODEL,
    // Not every free model on OpenRouter honors response_format reliably —
    // relying on the JSON-only prompt instruction (plus defensive parsing
    // in parseJsonResponse) works across all of them, same reasoning as
    // Perplexity below.
    false,
    apiKey,
    system,
    user,
    fileBase64,
    mimeType,
    {
      // Recommended by OpenRouter (not required) so requests are attributed
      // to this app rather than showing up as anonymous in their dashboard.
      'HTTP-Referer': 'https://daypilot-omega.vercel.app',
      'X-Title': 'DayPilot',
    },
  )
}

/**
 * Groq's free tier (no card required — confirmed against the console's own
 * "No charge today" language on the base plan) hosts several meaningfully
 * different models, unlike every other provider here which is pinned to one
 * hardcoded default because there was nothing worth choosing between. Kept
 * as a small curated list rather than fetched live from Groq's /models
 * endpoint, since that requires a key to call and would mean Settings
 * showing a stale or empty list before one's entered. Confirmed live on
 * console.groq.com's own model catalog before picking these three.
 */
export const GROQ_MODELS: { id: string; label: string }[] = [
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B — strongest, recommended' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B — smaller and faster' },
  { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B — supports image uploads' },
]
export const GROQ_DEFAULT_MODEL = GROQ_MODELS[0].id

async function callGroq(
  apiKey: string,
  system: string,
  user: string,
  fileBase64?: string,
  mimeType?: string,
  modelOverride?: string | null,
): Promise<string> {
  return callOpenAICompatible(
    'Groq',
    'https://api.groq.com/openai/v1/chat/completions',
    modelOverride || GROQ_DEFAULT_MODEL,
    // Unlike OpenRouter/Perplexity (where response_format support varies by
    // whichever third-party model is behind the endpoint), Groq's own docs
    // explicitly confirm response_format: json_object across its models —
    // safe to force here rather than only leaning on the prompt instruction.
    true,
    apiKey,
    system,
    user,
    fileBase64,
    mimeType,
    undefined,
    {
      // Every model on Groq's free tier here is a "reasoning" model — its
      // hidden chain-of-thought counts against the same output-token budget
      // as the actual answer, and Groq's default max_completion_tokens is
      // only 1024. A full day's plan (many time blocks plus a reasoning
      // paragraph) plus that reasoning overhead blew straight past it,
      // truncating the JSON mid-object and tripping Groq's own
      // server-side "Failed to validate JSON" check. reasoning_effort:
      // 'low' keeps the hidden reasoning pass short for what's fundamentally
      // a structured-extraction task, not a hard reasoning problem, and
      // reasoning_format: 'parsed' keeps any reasoning that does happen out
      // of the content field entirely (required for JSON mode — 'raw' 400s
      // outright) rather than mixed in with the JSON.
      max_completion_tokens: 8000,
      reasoning_effort: 'low',
      reasoning_format: 'parsed',
    },
  )
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
 * A 429 from any provider gets the same free-tier-friendly rewrite instead
 * of the raw provider error — which for Gemini in particular is a dense
 * wall of quota-limit boilerplate that buries the one thing the user
 * actually needs to know (wait, then retry). Pulls the provider's own
 * suggested wait time out of the message text when it's there.
 */
function friendlyErrorMessage(providerLabel: string, status: number, rawMessage: string): string {
  if (status === 429) {
    const retryMatch = rawMessage.match(/retry in (\d+(?:\.\d+)?)\s*s/i)
    const waitLabel = retryMatch ? `about ${Math.ceil(Number(retryMatch[1]))} seconds` : 'a minute or so'
    return `${providerLabel}'s rate limit is temporarily maxed out (common on a free-tier key if you've been generating a lot). Wait ${waitLabel} and hit Retry — nothing needs fixing.`
  }
  return `${providerLabel} request failed: ${rawMessage}`
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

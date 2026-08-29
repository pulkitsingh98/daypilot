// Vercel Edge Function — the one server-side hop this feature needs.
//
// DayPilot is otherwise a pure client-side SPA (Supabase for data, direct
// browser-to-provider calls for AI). Institutional Moodle instances don't
// send permissive Access-Control-Allow-Origin headers on their calendar
// export endpoint, so fetching a user's ICS URL directly from the browser
// is blocked by CORS. This function's only job is to perform that fetch
// server-side (same-origin from the browser's point of view, so no CORS
// headers are needed on the response) and hand back the raw text — all
// parsing and all Supabase writes stay on the client, same as every other
// import path in this app (see src/lib/icsImport.ts).
//
// Because it fetches whatever URL it's given, it's a limited open relay by
// design. Mitigations kept deliberately simple rather than pulling in an
// auth/JWT-verification dependency for one endpoint: https-only, a
// hostname blocklist against the common private/loopback ranges, a request
// timeout, and a capped response size.

export const config = { runtime: 'edge' }

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024 // 2MB — a term's worth of ICS text is a few KB; this is generous headroom.
const FETCH_TIMEOUT_MS = 10_000

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host === '::1') return true
  if (/^127\./.test(host)) return true
  if (/^10\./.test(host)) return true
  if (/^192\.168\./.test(host)) return true
  if (/^169\.254\./.test(host)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
  return false
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const targetUrl = new URL(request.url).searchParams.get('url')
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing "url" query parameter.' }), { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    return new Response(JSON.stringify({ error: 'That is not a valid URL.' }), { status: 400 })
  }

  if (parsed.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'Only https:// calendar URLs are supported.' }), { status: 400 })
  }
  if (isBlockedHost(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'That host is not allowed.' }), { status: 400 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'text/calendar, text/plain, */*',
        // Many institutional Moodle deployments sit behind bot/WAF protection
        // that 403s any request without a normal-looking browser User-Agent —
        // the default fetch UA (or lack of one) in a serverless runtime reads
        // as a bot to those filters even though this is the calendar owner's
        // own authorized, token-authenticated request.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    })

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Calendar server responded with ${upstream.status}.` }),
        { status: 502 },
      )
    }

    const body = await upstream.text()
    if (body.length > MAX_RESPONSE_BYTES) {
      return new Response(JSON.stringify({ error: 'Calendar file is too large.' }), { status: 502 })
    }

    return new Response(body, { status: 200, headers: { 'Content-Type': 'text/calendar; charset=utf-8' } })
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return new Response(
      JSON.stringify({ error: timedOut ? 'Timed out fetching the calendar.' : 'Could not fetch the calendar.' }),
      { status: 502 },
    )
  } finally {
    clearTimeout(timeout)
  }
}

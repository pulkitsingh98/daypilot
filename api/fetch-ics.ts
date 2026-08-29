// Vercel serverless function (Node.js/Lambda runtime — see note below) — the
// one server-side hop this feature needs.
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
// Deliberately NOT the Edge runtime: some institutional Moodle deployments
// (confirmed against IIM V's) block Vercel's edge network IPs outright —
// requests 403 there while an ordinary curl from a normal IP succeeds. The
// default Node.js runtime runs on AWS Lambda instead, a different egress
// path that isn't on the same blocklist.
//
// Because it fetches whatever URL it's given, it's a limited open relay by
// design. Mitigations kept deliberately simple rather than pulling in an
// auth/JWT-verification dependency for one endpoint: https-only, a
// hostname blocklist against the common private/loopback ranges, a request
// timeout, and a capped response size.

import type { VercelRequest, VercelResponse } from '@vercel/node'

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawUrl = req.query.url
  const targetUrl = typeof rawUrl === 'string' ? rawUrl : Array.isArray(rawUrl) ? rawUrl[0] : undefined
  if (!targetUrl) {
    res.status(400).json({ error: 'Missing "url" query parameter.' })
    return
  }

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    res.status(400).json({ error: 'That is not a valid URL.' })
    return
  }

  if (parsed.protocol !== 'https:') {
    res.status(400).json({ error: 'Only https:// calendar URLs are supported.' })
    return
  }
  if (isBlockedHost(parsed.hostname)) {
    res.status(400).json({ error: 'That host is not allowed.' })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'text/calendar, text/plain, */*',
        // Some institutional Moodle deployments sit behind bot/WAF protection
        // that 403s any request without a normal-looking browser User-Agent.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    })

    if (!upstream.ok) {
      res.status(502).json({ error: `Calendar server responded with ${upstream.status}.` })
      return
    }

    const body = await upstream.text()
    if (body.length > MAX_RESPONSE_BYTES) {
      res.status(502).json({ error: 'Calendar file is too large.' })
      return
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.status(200).send(body)
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    res.status(502).json({ error: timedOut ? 'Timed out fetching the calendar.' : 'Could not fetch the calendar.' })
  } finally {
    clearTimeout(timeout)
  }
}

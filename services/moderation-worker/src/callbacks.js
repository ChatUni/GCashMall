// The worker's half of the serverless <-> server link.
//
// The worker has no user session, so it authenticates to the API with an HMAC over the body
// using WORKER_SHARED_SECRET — the same secret the API uses to sign its nudges in the other
// direction. Both callbacks are safe to retry: the API applies each verdict idempotently.

import crypto from 'crypto'

const apiBase = () => (process.env.API_URL || '').replace(/\/+$/, '')
const secret = () => process.env.WORKER_SHARED_SECRET || ''

const post = async (type, body) => {
  if (!apiBase()) throw new Error('API_URL is not set')
  if (!secret()) throw new Error('WORKER_SHARED_SECRET is not set')
  const timestamp = String(Date.now())
  const signature = crypto
    .createHmac('sha256', secret())
    .update(`${timestamp}.${JSON.stringify(body)}`)
    .digest('hex')

  // The function's own path, not the /api/* alias: that redirect needs a path segment, so
  // `/api?type=x` matches the SPA fallback instead and returns index.html with a 200 —
  // which looks like success and silently does nothing.
  const res = await fetch(`${apiBase()}/.netlify/functions/api?type=${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Job-Timestamp': timestamp,
      'X-Job-Signature': signature,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`${type} callback failed (${res.status})`)

  // A 200 is not proof the API handled it. Anything that is not the JSON envelope means the
  // request never reached the handler (a misrouted path, a proxy, an HTML error page), and
  // treating that as success is how a scan reports "done" having applied no verdicts.
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${type} callback did not reach the API — got ${text.slice(0, 60).replace(/\s+/g, ' ')}…`)
  }
  if (json.success === false) throw new Error(`${type} rejected: ${json.error || 'unknown'}`)
  return json
}

// One episode (or the series' own text) has a verdict. Sent as each finishes, so a long
// multi-episode scan shows movement rather than going silent.
export const reportProgress = (payload) => post('jobProgress', payload)

// The scan is over, successfully or not.
export const reportComplete = (payload) => post('jobComplete', payload)

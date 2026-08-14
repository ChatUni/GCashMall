import crypto from 'crypto'
import { finalizeGUSDOrder } from './utils/gusdTopup.js'

// Verify the GUSD webhook signature from request headers: HMAC-SHA256 of
// "appid={GUSD_APPID}&nonce={nonce}&timestamp={timestamp}" using GUSD_SECRET.
const verifyGUSDSignature = (req) => {
  const secret = process.env.GUSD_SECRET
  const expectedAppId = process.env.GUSD_APPID
  if (!secret || !expectedAppId) {
    throw new Error('GUSD_SECRET or GUSD_APPID is not configured')
  }

  const signature = req.headers.get('signature') || ''
  const appid = req.headers.get('appid') || req.headers.get('app_id') || ''
  const nonce = req.headers.get('nonce') || ''
  const timestamp = req.headers.get('timestamp') || ''

  if (!signature || !appid || !nonce || !timestamp) {
    console.error('[gusd-webhook] Missing signature headers')
    return false
  }
  if (String(appid) !== String(expectedAppId)) {
    console.error('[gusd-webhook] appid mismatch:', appid)
    return false
  }

  const message = `appid=${appid}&nonce=${nonce}&timestamp=${timestamp}`
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    console.error('[gusd-webhook] Signature comparison failed (length mismatch)')
    return false
  }
}

const logRequestHeaders = (req) => {
  const headers = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })
  console.log('[gusd-webhook] Request headers:', JSON.stringify(headers))
}

const jsonResponse = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

// Netlify Functions v2 handler. GUSD calls this (notify_url) with the order's current
// state. We finalize the matching pending top-up: credit + complete on 'payment_processed',
// mark fail on a failure state, no-op while still processing. finalizeGUSDOrder is idempotent
// and shared with the pay_order_info reconciliation path, so the two can't double-credit.
export default async (req) => {
  try {
    logRequestHeaders(req)
    const body = await req.json()
    console.log('[gusd-webhook] Received callback body:', JSON.stringify(body))

    if (!verifyGUSDSignature(req)) {
      console.error('[gusd-webhook] Signature verification failed')
      return jsonResponse({ error: 'Signature verification failed' }, 403)
    }
    if (!body || !body.order_id) {
      throw new Error('order_id is required')
    }

    const result = await finalizeGUSDOrder(body.order_id, body)
    console.log('[gusd-webhook] finalize result:', JSON.stringify(result))
    return jsonResponse({ received: true }, 200)
  } catch (error) {
    console.error('[gusd-webhook] Error:', error.message)
    return jsonResponse({ error: error.message }, 400)
  }
}

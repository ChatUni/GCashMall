import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import { get, save } from './utils/db.js'

// Build user response without sensitive fields (same as handlers.js)
const buildUserResponseForWebhook = (user) => ({
  _id: user._id,
  email: user.email,
  nickname: user.nickname || 'Guest',
  avatar: user.avatar || null,
  phone: user.phone || null,
  sex: user.sex || null,
  dob: user.dob || null,
  hasPassword: !!user.password,
  allowUpload: !!user.allowUpload,
  watchList: user.watchList || [],
  favorites: user.favorites || [],
  purchases: user.purchases || [],
  balance: user.balance || 0,
  transactions: user.transactions || [],
})

// Generate a unique reference ID
const generateReferenceId = () =>
  `GC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

// Parse userId and referenceId from the GUSD order_id
// Order ID format: {referenceId}_{userId}_{timestamp}
const parseGUSDOrderId = (orderId) => {
  if (!orderId) return { userId: null, referenceId: null }

  const parts = orderId.split('_')
  if (parts.length < 3) return { userId: null, referenceId: null }

  // referenceId is the first part, userId is the second part
  const referenceId = parts[0]
  const userId = parts[1]

  return { userId, referenceId }
}

// Verify the GUSD webhook signature from request headers
// Decrypts/verifies the signature using GUSD_SECRET and checks
// that appid, nonce and timestamp in the message "appid={GUSD_APPID}&nonce={nonce}&timestamp={timestamp}" are valid
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
    console.error(
      '[gusd-webhook] Missing signature headers: signature=%s, appid=%s, nonce=%s, timestamp=%s',
      !!signature,
      !!appid,
      !!nonce,
      !!timestamp,
    )
    return false
  }

  // Verify appid matches
  if (String(appid) !== String(expectedAppId)) {
    console.error('[gusd-webhook] appid mismatch:', appid, 'expected:', expectedAppId)
    return false
  }

  // Compute expected signature: HMAC-SHA256 of "appid={GUSD_APPID}&nonce={nonce}&timestamp={timestamp}"
  const message = `appid=${appid}&nonce=${nonce}&timestamp=${timestamp}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')

  // Compare signatures (timing-safe comparison)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    )
  } catch {
    // If buffers are different lengths, timingSafeEqual throws
    console.error('[gusd-webhook] Signature comparison failed (length mismatch)')
    return false
  }
}

// Validate the GUSD callback body
const validateGUSDCallbackBody = (body) => {
  if (!body) {
    throw new Error('Request body is required')
  }

  if (!body.order_id) {
    throw new Error('order_id is required')
  }
}

// Process the GUSD top up (add balance and create transaction with GUSD-specific fields)
const processGUSDTopUp = async (userId, amount, body) => {
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) {
    console.error('[gusd-webhook] User not found:', userId)
    return
  }

  const currentUser = users[0]
  const currentBalance = currentUser.balance || 0
  const transactions = currentUser.transactions || []

  // Parse referenceId from order_id
  const { referenceId: parsedReferenceId } = parseGUSDOrderId(body.order_id)
  const referenceId = parsedReferenceId || generateReferenceId()

  // Check if this referenceId has already been processed (prevent double processing)
  const existingTxn = transactions.find((t) => t.referenceId === referenceId)
  if (existingTxn) {
    console.log('[gusd-webhook] Transaction already processed:', referenceId)
    return
  }

  // Create transaction record with GUSD-specific fields
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    referenceId,
    bridge_order_id: body.bridge_order_id || null,
    order_id: body.order_id || null,
    gusd_user_id: body.user_id || null,
    type: 'topup',
    method: 'GUSD',
    amount,
    transactionId: '',
    status: 'success',
    pay_time: body.pay_time || null,
    createdAt: new Date(),
  }

  // Add transaction to history (prepend)
  transactions.unshift(transaction)

  // Update user with new balance and transaction
  const updateData = {
    ...currentUser,
    balance: currentBalance + amount,
    transactions,
    updatedAt: new Date(),
  }

  await save('users', updateData)
  console.log(
    '[gusd-webhook] Top up processed successfully:',
    referenceId,
    'amount:',
    amount,
    'new balance:',
    currentBalance + amount,
  )
}

// Log request headers for debugging
const logRequestHeaders = (req) => {
  const headers = {}
  req.headers.forEach((value, key) => {
    headers[key] = value
  })
  console.log('[gusd-webhook] Request headers:', JSON.stringify(headers))
}

// Netlify Functions v2 handler
// GUSD server callback: http status code = 200 indicates payment success
export default async (req) => {
  try {
    logRequestHeaders(req)

    const body = await req.json()
    console.log('[gusd-webhook] Received callback body:', JSON.stringify(body))

    // Verify signature from headers - return 403 if verification fails
    const signatureValid = verifyGUSDSignature(req)
    if (!signatureValid) {
      console.error('[gusd-webhook] Signature verification failed')
      return new Response(JSON.stringify({ error: 'Signature verification failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    validateGUSDCallbackBody(body)

    // Parse userId from order_id
    const { userId } = parseGUSDOrderId(body.order_id)
    if (!userId) {
      throw new Error('Could not extract userId from order_id')
    }

    // Parse amount from the callback body
    const amount = parseFloat(body.price || body.amount || 0)
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount in callback')
    }

    // Process the top up with GUSD-specific fields
    await processGUSDTopUp(userId, amount, body)

    // Return 200 to indicate success to GUSD
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[gusd-webhook] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

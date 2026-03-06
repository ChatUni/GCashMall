import Stripe from 'stripe'
import { ObjectId } from 'mongodb'
import { get, save } from './utils/db.js'

const stripe = process.env.STRIPE_PRIVATE_KEY
  ? new Stripe(process.env.STRIPE_PRIVATE_KEY)
  : null

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

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

// Process the top up (add balance and create transaction)
const processTopUpFromWebhook = async (userId, amount, method, referenceId) => {
  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) {
    console.error('[stripe-webhook] User not found:', userId)
    return
  }

  const currentUser = users[0]
  const currentBalance = currentUser.balance || 0
  const transactions = currentUser.transactions || []

  // Check if this referenceId has already been processed (prevent double processing)
  const existingTxn = transactions.find((t) => t.referenceId === referenceId)
  if (existingTxn) {
    console.log('[stripe-webhook] Transaction already processed:', referenceId)
    return
  }

  // Create transaction record
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    referenceId: referenceId || generateReferenceId(),
    type: 'topup',
    method,
    amount,
    transactionId: '',
    status: 'success',
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
    '[stripe-webhook] Top up processed successfully:',
    referenceId,
    'amount:',
    amount,
    'new balance:',
    currentBalance + amount,
  )
}

// Verify webhook signature
const verifyWebhookSignature = (payload, signature) => {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  if (!WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET)
}

// Extract the raw body from the Netlify event
// Netlify may base64-encode the body without reliably setting isBase64Encoded
const extractRawBody = (event) => {
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, 'base64').toString('utf8')
  }
  return event.body
}

// Attempt webhook verification, falling back to base64-decoded body
const verifyWebhookWithFallback = (event, signature) => {
  const rawBody = extractRawBody(event)

  try {
    return verifyWebhookSignature(rawBody, signature)
  } catch (firstError) {
    // If isBase64Encoded was false, try base64 decoding anyway as a fallback
    if (!event.isBase64Encoded) {
      try {
        const decoded = Buffer.from(event.body, 'base64').toString('utf8')
        return verifyWebhookSignature(decoded, signature)
      } catch {
        // Throw the original error if fallback also fails
      }
    }
    throw firstError
  }
}

// Handle checkout.session.completed event
const handleCheckoutSessionCompleted = async (session) => {
  if (session.payment_status !== 'paid') {
    console.log('[stripe-webhook] Session not paid, skipping:', session.id)
    return
  }

  const { userId, amount, referenceId } = session.metadata || {}
  validateWebhookMetadata(userId, amount, referenceId)

  await processTopUpFromWebhook(
    userId,
    parseFloat(amount),
    'Stripe',
    referenceId,
  )
}

// Validate metadata from webhook
const validateWebhookMetadata = (userId, amount, referenceId) => {
  if (!userId) throw new Error('Missing userId in session metadata')
  if (!amount) throw new Error('Missing amount in session metadata')
  if (!referenceId) throw new Error('Missing referenceId in session metadata')
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {})
  }

  if (event.httpMethod !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' })
  }

  try {
    const signature = event.headers['stripe-signature']
    if (!signature) {
      return createResponse(400, { error: 'Missing stripe-signature header' })
    }

    const webhookEvent = verifyWebhookWithFallback(event, signature)

    switch (webhookEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(webhookEvent.data.object)
        break
      default:
        console.log('[stripe-webhook] Unhandled event type:', webhookEvent.type)
    }

    return createResponse(200, { received: true })
  } catch (error) {
    console.error('[stripe-webhook] Error:', error.message)
    return createResponse(400, { error: error.message })
  }
}

const createResponse = (statusCode, data) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
})

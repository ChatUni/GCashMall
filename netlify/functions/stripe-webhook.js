import Stripe from 'stripe'
import { ObjectId } from 'mongodb'
import { get, save } from './utils/db.js'

const stripe = process.env.STRIPE_PRIVATE_KEY
  ? new Stripe(process.env.STRIPE_PRIVATE_KEY)
  : null

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
const processTopUpFromWebhook = async (
  userId,
  amount,
  method,
  referenceId,
) => {
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

// Retrieve the event directly from Stripe API to verify authenticity
// This avoids signature verification issues caused by Netlify reformatting the body
const retrieveVerifiedEvent = async (eventId) => {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  return stripe.events.retrieve(eventId)
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

// Validate the incoming request has required Stripe headers
const validateWebhookRequest = (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    throw new Error('Missing stripe-signature header')
  }
  return signature
}

// Parse the event ID from the webhook body
const parseEventId = (body) => {
  if (!body || !body.id || !body.id.startsWith('evt_')) {
    throw new Error('Invalid webhook payload: missing or invalid event id')
  }
  return body.id
}

// Netlify Functions v2 handler
// Netlify's middleware reformats the JSON body, breaking Stripe signature verification.
// Instead, we extract the event ID from the payload and retrieve it directly from
// Stripe's API, which guarantees authenticity (only real Stripe events can be retrieved).
export default async (req) => {
  try {
    // Verify stripe-signature header is present (basic check that request came through Stripe)
    validateWebhookRequest(req)

    // Parse the body to get the event ID
    const body = await req.json()
    const eventId = parseEventId(body)
    console.log('[stripe-webhook] Received event ID:', eventId)

    // Retrieve the event directly from Stripe API — this guarantees authenticity
    const webhookEvent = await retrieveVerifiedEvent(eventId)
    console.log('[stripe-webhook] Verified event type:', webhookEvent.type)

    switch (webhookEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(webhookEvent.data.object)
        break
      default:
        console.log('[stripe-webhook] Unhandled event type:', webhookEvent.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[stripe-webhook] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

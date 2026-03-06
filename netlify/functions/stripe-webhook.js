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

// Verify webhook signature using the raw body
const verifyWebhookSignature = (rawBody, signature) => {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  if (!WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured')
  }

  return stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET)
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

// Netlify Functions v2 handler — receives the raw Request object
// This preserves the exact request body bytes for Stripe signature verification
export default async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    console.log('[stripe-webhook] stripe-signature:', signature)

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Read the raw, unmodified request body — critical for signature verification
    const rawBody = await req.text()
    console.log('[stripe-webhook] rawBody length:', rawBody.length)
    console.log('[stripe-webhook] rawBody first 100 chars:', rawBody.substring(0, 100))

    const webhookEvent = verifyWebhookSignature(rawBody, signature)
    console.log('[stripe-webhook] Signature verified, event type:', webhookEvent.type)

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
    console.error('[stripe-webhook] Error stack:', error.stack)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

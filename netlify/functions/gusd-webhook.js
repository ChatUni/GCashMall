import { ObjectId } from 'mongodb'
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

// Netlify Functions v2 handler
// GUSD server callback: http status code = 200 indicates payment success
export default async (req) => {
  try {
    const body = await req.json()
    console.log('[gusd-webhook] Received callback:', JSON.stringify(body))

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

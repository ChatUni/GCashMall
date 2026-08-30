// Shared GUSD top-up finalization, used by BOTH the webhook (notify_url) and the
// pay_order_info reconciliation (redirect + wallet load). A GUSD top-up is recorded as a
// PENDING transaction when the pay order is created; it's flipped to success/fail here.

import { ObjectId } from 'mongodb'
import { get, update } from './db.js'
import { toCredits } from './credits.js'
import { sendTopUpEmail, sendWithdrawCompleteEmail } from './email.js'

// Our order_id format: {referenceId}_{userId}_{timestamp}
export const parseGUSDOrderId = (orderId) => {
  if (!orderId) return { userId: null, referenceId: null }
  const parts = String(orderId).split('_')
  if (parts.length < 3) return { userId: null, referenceId: null }
  return { referenceId: parts[0], userId: parts[1] }
}

// Map a GUSD PayOrderState to an outcome (states per the pay_order_info docs):
//   success  → payment_processed (the only "final success")
//   pending  → create, await_funds, in_review, funds_received, payment_submitted (in progress)
//   fail     → canceled, error, returned, refunded, undeliverable, missing_return_policy
//              (all terminal non-success; returned/refunded mean the funds went back)
const GUSD_SUCCESS_STATES = new Set(['payment_processed'])
const GUSD_FAIL_STATES = new Set([
  'canceled',
  'error',
  'returned',
  'refunded',
  'undeliverable',
  'missing_return_policy',
])
export const gusdOutcome = (state) => {
  const s = String(state || '').toLowerCase()
  if (GUSD_SUCCESS_STATES.has(s)) return 'success'
  if (GUSD_FAIL_STATES.has(s)) return 'fail'
  return 'pending'
}

// Finalize the PENDING GUSD order (top-up or withdrawal) for this order_id, based on the
// order's current state (from a webhook body or a pay_order_info response). Atomic +
// idempotent: the update only matches while the transaction is still 'processing', so the
// webhook and the query path can never double-apply. Balance semantics differ by type:
//   • top-up   success → credit the wallet;  fail → no balance change (never deducted)
//   • withdraw success → no change (deducted at creation);  fail → REFUND the amount
export const finalizeGUSDOrder = async (orderId, info = {}) => {
  const { userId } = parseGUSDOrderId(orderId)
  if (!userId) return { finalized: false, reason: 'bad_order_id' }

  const state = String(info.state || '').toLowerCase()
  const outcome = gusdOutcome(info.state)

  const users = await get('users', { _id: new ObjectId(userId) }, {}, {}, 1)
  if (!users || users.length === 0) return { finalized: false, reason: 'user_not_found' }
  const user = users[0]

  const pending = (user.transactions || []).find(
    (t) => t.order_id === orderId && t.status === 'processing',
  )
  if (!pending) return { finalized: false, alreadyDone: true }
  // The pending row is already in credits. The provider's `info.price` is USD, so the
  // fallback has to be converted or a top-up would credit 1 credit per dollar.
  const amount = Number(pending.amount) || toCredits(info.price)
  const isWithdraw = pending.type === 'withdraw'

  // Only match while still processing — this is the idempotency guard.
  const pendingFilter = {
    _id: new ObjectId(userId),
    transactions: { $elemMatch: { order_id: orderId, status: 'processing' } },
  }

  // A top-up the user never funded → REMOVE it so it doesn't linger in the history. This is
  // what fixes the "click back without paying" case: the order stays in `create` because the
  // user backed out before submitting payment (or `canceled` if explicitly cancelled). We only
  // reconcile from the wallet after the user returned from the pay page, so a `created` order is
  // abandoned. `await_funds`/`funds_received`+ mean a charge is in progress → kept (see below),
  // so a paid top-up is never dropped; withdrawals are always recorded.
  if (!isWithdraw && ['create', 'created', 'canceled'].includes(state)) {
    await update('users', pendingFilter, {
      $pull: { transactions: { order_id: orderId, status: 'processing' } },
      $set: { updatedAt: new Date() },
    })
    console.log(`[gusd] top-up abandoned/cancelled (${state}) — removed:`, orderId)
    return { finalized: 'removed' }
  }

  // Still in progress (funds received / submitted / in review) → leave it processing.
  if (outcome === 'pending') return { finalized: false, pending: true }

  if (outcome === 'success') {
    const set = {
      'transactions.$.status': 'success',
      'transactions.$.pay_time': info.pay_time || Math.floor(Date.now() / 1000),
      'transactions.$.bridge_order_id': info.bridge_order_id || pending.bridge_order_id || null,
      updatedAt: new Date(),
    }
    // Top-up credits the wallet on success; a withdrawal was already deducted at creation.
    const updateDoc = isWithdraw ? { $set: set } : { $inc: { balance: amount }, $set: set }
    const res = await update('users', pendingFilter, updateDoc)
    if (res.matchedCount > 0) {
      console.log(`[gusd] ${pending.type} completed:`, orderId, 'amount:', amount)
      // Best-effort notification — never let email failure affect the balance update.
      const notify = isWithdraw ? sendWithdrawCompleteEmail : sendTopUpEmail
      notify({ email: user.email, nickname: user.nickname }, amount).catch((e) =>
        console.error(`[gusd] ${pending.type} email failed:`, e.message),
      )
      return { finalized: 'success', amount }
    }
    return { finalized: false, alreadyDone: true }
  }

  // outcome === 'fail' (error / returned / refunded / …). Refund a failed withdrawal (the
  // amount was reserved at creation); a failed top-up just records 'failed'.
  const failSet = {
    'transactions.$.status': 'failed',
    'transactions.$.fail_reason': String(info.fail_reason || 'payment failed'),
    updatedAt: new Date(),
  }
  const failDoc = isWithdraw ? { $inc: { balance: amount }, $set: failSet } : { $set: failSet }
  await update('users', pendingFilter, failDoc)
  console.log(`[gusd] ${pending.type} failed${isWithdraw ? ' (refunded)' : ''}:`, orderId)
  return { finalized: 'fail' }
}

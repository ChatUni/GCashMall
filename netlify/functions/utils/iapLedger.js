import { connectDB } from './db.js'

// Global ledger of credited Apple IAP transactions, keyed by transactionId. A unique index
// makes reservation atomic across all users, so a transaction can only ever be credited once
// (covers re-delivery, client retries, and the same transaction reconciled under another user).
const COLLECTION = 'iapTransactions'
let indexEnsured = false

const getCollection = async () => {
  const db = await connectDB()
  const collection = db.collection(COLLECTION)
  if (!indexEnsured) {
    await collection.createIndex({ transactionId: 1 }, { unique: true })
    indexEnsured = true
  }
  return collection
}

// Atomically record a transactionId. Returns true if this is the first time it's seen (caller
// should credit), false if it was already processed (idempotent skip).
const reserveTransaction = async (transactionId, userId, productId, amount) => {
  const collection = await getCollection()
  try {
    await collection.insertOne({
      transactionId,
      userId: String(userId),
      productId,
      amount,
      createdAt: new Date(),
    })
    return true
  } catch (error) {
    if (error && error.code === 11000) return false // duplicate key -> already credited
    throw error
  }
}

// Undo a reservation when crediting fails, so the transaction can be retried.
const releaseTransaction = async (transactionId) => {
  const collection = await getCollection()
  await collection.deleteOne({ transactionId })
}

export { reserveTransaction, releaseTransaction }

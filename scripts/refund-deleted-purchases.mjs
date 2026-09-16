// Refund the two deleted episode purchases.
//
// "Kade" and "Glass & Orchard" were deleted as permanently-pending legacy Quick Create
// series, so the episodes bought against them no longer exist. The purchase records were
// removed with them; this returns the credits.
//
// Amount: the purchases were priced at 0.2 in the pre-redenomination unit, and this account
// has been migrated (x100), so each is worth 20 credits. That is corroborated by the
// account's own arithmetic — its balance sits exactly 140 below what the ledger accounts
// for, across 7 purchases, which is 20 each.
//
// Unlike the original purchases, this DOES write a transaction. An episode purchase writes
// none (see purchaseEpisode in handlers.js), which is why the spend was invisible in the
// first place; a refund with no record would repeat that mistake in the other direction.
//
//   node scripts/refund-deleted-purchases.mjs           # show the arithmetic
//   node scripts/refund-deleted-purchases.mjs --apply   # credit the account

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
for (const l of readFileSync(`${REPO}/.env`, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { ObjectId } = createRequire(`${REPO}/netlify/functions/utils/x.js`)('mongodb')
const { get, update } = await import(`${REPO}/netlify/functions/utils/db.js`)

const apply = process.argv.includes('--apply')
const EMAIL = 'mandyflorkowski@gmail.com'
const REFUNDS = [
  { series: 'Kade', episodeNumber: 1, credits: 20 },
  { series: 'Glass & Orchard', episodeNumber: 1, credits: 20 },
]
const REF = 'refund-deleted-series-kade-glass-orchard'

const generateReferenceId = () =>
  `REF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

const [u] = await get('users', { email: EMAIL }, {}, {}, 1)
if (!u) { console.error(`${EMAIL} not found`); process.exit(1) }

// Idempotent: the marker means this has already run.
if ((u.transactions || []).some((t) => t.refundBatch === REF)) {
  console.log('Already refunded — no change.')
  process.exit(0)
}

const total = REFUNDS.reduce((n, r) => n + r.credits, 0)
console.log(`${EMAIL}`)
console.log(`  balance now:   ${u.balance}`)
for (const r of REFUNDS) console.log(`  refund ${String(r.credits).padStart(3)}  ep${r.episodeNumber} of "${r.series}" (deleted)`)
console.log(`  balance after: ${u.balance + total}`)

if (!apply) {
  console.log('\nDry run — nothing changed. Re-run with --apply.')
  process.exit(0)
}

const transactions = REFUNDS.map((r) => ({
  id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  referenceId: generateReferenceId(),
  type: 'refund',
  amount: r.credits,
  description: `Refund — "${r.series}" Episode ${r.episodeNumber} (series removed)`,
  source: { seriesName: r.series, episodeNumber: r.episodeNumber, episodeTitle: '' },
  status: 'success',
  refundBatch: REF,
  createdAt: new Date(),
}))

await update(
  'users',
  { _id: new ObjectId(String(u._id)) },
  {
    $inc: { balance: total },
    $push: { transactions: { $each: transactions, $position: 0 } },
    $set: { updatedAt: new Date() },
  },
)

const [after] = await get('users', { email: EMAIL }, {}, {}, 1)
console.log(`\nRefunded ${total} credits. Balance ${u.balance} -> ${after.balance}`)
process.exit(0)

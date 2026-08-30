// One-off: redenominate the wallet from GUSD to credits (1 USD = 1 GUSD = 100 credits).
//
//   node scripts/migrate-credits.mjs                      # dry run over everyone
//   node scripts/migrate-credits.mjs --apply               # migrate everyone
//   node scripts/migrate-credits.mjs --only a@b.com,c@d.com [--apply]
//
// --only restricts the run to specific accounts, so the migration can be verified on a few
// before the rest follow.
//
// Multiplies every user's `balance` AND every `transactions[].amount` by 100.
//
// Transaction amounts MUST be migrated alongside balances, even though they are historical:
// getMaxWithdrawAmount() sums transaction amounts and subtracts them from the balance to
// work out the withdrawable cap. Leaving them in the old unit would under-count held funds
// by 100x and let users withdraw money that should still be on hold.
//
// Idempotent guard: each migrated user is stamped with creditsMigratedAt and skipped on a
// re-run, so running this twice cannot multiply a balance by 10,000.
import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'

const ROOT = path.resolve(import.meta.dirname, '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const FACTOR = 100
const APPLY = process.argv.includes('--apply')
const onlyArg = process.argv[process.argv.indexOf('--only') + 1]
const ONLY = process.argv.includes('--only')
  ? onlyArg.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  : null
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db(process.env.VITE_APP_DISPLAY_NAME.toLowerCase())
const users = db.collection('users')

console.log(`database : ${db.databaseName}`)
console.log(`mode     : ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`)
console.log(`scope    : ${ONLY ? ONLY.join(', ') : 'all users'}\n`)

const filter = ONLY ? { email: { $in: ONLY } } : {}
const all = await users.find(filter, { projection: { balance: 1, transactions: 1, creditsMigratedAt: 1, email: 1 } }).toArray()
if (ONLY && all.length !== ONLY.length) {
  const found = all.map((u) => String(u.email || '').toLowerCase())
  const missing = ONLY.filter((e) => !found.includes(e))
  if (missing.length) console.log(`WARNING: no such user: ${missing.join(', ')}\n`)
}

let migrated = 0, skipped = 0, txnCount = 0

for (const u of all) {
  if (u.creditsMigratedAt) { skipped += 1; continue }
  const before = Number(u.balance) || 0
  const after = round2(before * FACTOR)
  const txns = (u.transactions || []).map((t) => ({ ...t, amount: round2(t.amount * FACTOR) }))
  txnCount += txns.length
  console.log(`  ${String(u.email || u._id).padEnd(34)} ${String(before).padStart(10)} -> ${String(after).padStart(10)}  (${txns.length} txn)`)
  if (APPLY) {
    await users.updateOne(
      { _id: u._id, creditsMigratedAt: { $exists: false } },
      { $set: { balance: after, transactions: txns, creditsMigratedAt: new Date() } },
    )
  }
  migrated += 1
}

// ── System settings ──
// Admin-configured prices are stored, and a stored value wins over the code default. A
// stale episodeCost of 0.2 (old GUSD) reads as 0 credits once redenominated, which both
// displays as "0" and makes episodes effectively free. creatorShare and freeEpisodes are
// counts/percentages, not money — they are left alone.
const MONEY_SETTINGS = ['episodeCost', 'nextEpisodeCost', 'welcomeCredit']
const settings = db.collection('settings')
const sys = await settings.findOne({ key: 'system' })
console.log('\nsystem settings:')
if (!sys) {
  console.log('  (no stored settings document — code defaults already in credits)')
} else if (sys.creditsMigratedAt) {
  console.log('  already migrated, skipping')
} else {
  const set = {}
  for (const k of MONEY_SETTINGS) {
    if (typeof sys[k] === 'number') {
      set[k] = round2(sys[k] * FACTOR)
      console.log(`  ${k.padEnd(18)} ${String(sys[k]).padStart(8)} -> ${String(set[k]).padStart(8)}`)
    } else {
      console.log(`  ${k.padEnd(18)} not stored — uses the code default (already credits)`)
    }
  }
  if (APPLY && Object.keys(set).length) {
    await settings.updateOne({ key: 'system', creditsMigratedAt: { $exists: false } },
      { $set: { ...set, creditsMigratedAt: new Date() } })
  } else if (APPLY) {
    await settings.updateOne({ key: 'system' }, { $set: { creditsMigratedAt: new Date() } })
  }
}

console.log(`\nusers migrated : ${migrated}`)
console.log(`users skipped  : ${skipped}  (already stamped creditsMigratedAt)`)
console.log(`txn amounts    : ${txnCount}`)
if (!APPLY) console.log('\nDry run only. Re-run with --apply to write.')
await client.close()

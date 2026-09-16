// Delete two series and unwind the purchases made against them.
//
// These are legacy Quick Create series left permanently pending (they predate Quick Create
// auto-approval), so the episodes bought against them can never be watched. Deleting them
// means the purchase records point at nothing, so the records go too.
//
// The app's own deleteSeries refuses to remove a series with purchases, for good reason —
// this bypasses that deliberately, and only for these two ids.
//
//   node scripts/delete-legacy-purchased-series.mjs           # show what would change
//   node scripts/delete-legacy-purchased-series.mjs --apply   # do it

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
for (const l of readFileSync(`${REPO}/.env`, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { ObjectId } = createRequire(`${REPO}/netlify/functions/utils/x.js`)('mongodb')
const { get, save, remove } = await import(`${REPO}/netlify/functions/utils/db.js`)

const apply = process.argv.includes('--apply')
const TARGETS = {
  '6a87b3297f633b9eba6f5769': 'Kade',
  '6a87e1b27c50e59a53bf86a3': 'Glass & Orchard',
  '6a6ba76485eb9a3e5439482e': 'Galactic Odyssey',
}
const ids = Object.keys(TARGETS)
const names = Object.values(TARGETS)

// Only BUYERS. Scoping by "any transaction mentioning the series" also catches the
// creator's own records — the credits they spent generating episodes, and the revenue share
// they earned — and deleting those would erase spend that really happened to someone who is
// not being refunded. A buyer's purchase record is the only thing this series' removal
// invalidates.
const holders = await get('users', {
  $or: [
    { 'purchases.seriesId': { $in: ids } },
    { 'purchaseHistory.seriesId': { $in: ids } },
  ],
})

console.log(`series to delete: ${names.join(', ')}`)
console.log(`users holding records against them: ${holders.length}\n`)

for (const u of holders) {
  const purchases = (u.purchases || []).filter((p) => ids.includes(String(p.seriesId)))
  const history = (u.purchaseHistory || []).filter((p) => ids.includes(String(p.seriesId)))
  // Only a purchase of one of these series — never a `generate` charge or an `earning`.
  const txns = (u.transactions || []).filter(
    (t) => t.type === 'purchase' && names.includes(t.source?.seriesName || ''),
  )
  console.log(`${u.email}`)
  for (const p of purchases) console.log(`   purchase    ep${p.episodeNumber} "${p.seriesName}"  price=${p.price ?? p.cost}`)
  for (const p of history) console.log(`   history     ep${p.episodeNumber} "${p.seriesName}"  cost=${p.cost}`)
  for (const t of txns) console.log(`   transaction ${t.type} ${t.amount} "${t.description}"`)
  if (!txns.length) console.log(`   (no transactions — episode purchases never wrote one)`)

  if (apply) {
    await save('users', {
      ...u,
      purchases: (u.purchases || []).filter((p) => !ids.includes(String(p.seriesId))),
      purchaseHistory: (u.purchaseHistory || []).filter((p) => !ids.includes(String(p.seriesId))),
      transactions: (u.transactions || []).filter(
        (t) => !(t.type === 'purchase' && names.includes(t.source?.seriesName || '')),
      ),
      updatedAt: new Date(),
    })
    console.log(`   -> removed ${purchases.length} purchase(s), ${history.length} history, ${txns.length} transaction(s)`)
  }
}

for (const id of ids) {
  const [s] = await get('series', { _id: new ObjectId(id) }, {}, {}, 1)
  if (!s) { console.log(`\n"${TARGETS[id]}" — already gone`); continue }
  console.log(`\n${apply ? 'DELETED' : 'would DELETE'} "${s.name}" (${(s.episodes || []).length} episodes)`)
  if (apply) await remove('series', { _id: new ObjectId(id) })
}

console.log(apply ? '\nDone.' : '\nDry run — nothing changed. Re-run with --apply.')
process.exit(0)

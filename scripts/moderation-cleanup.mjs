// Park or remove pending series in bulk, by uploader.
//
// Parking sets `shelvedByUploader`, the explicit hide switch — NOT the derived `shelved`,
// which is already true for anything awaiting review. A parked series is skipped by the
// moderation sweep and by dispatch, so it stops consuming review effort without being
// deleted.
//
//   node scripts/moderation-cleanup.mjs                 # show what would change
//   node scripts/moderation-cleanup.mjs --apply         # do it
//
// Deletion is irreversible and is refused for a series whose episodes someone has bought,
// matching the app's own delete.

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
const statusOf = (d) => d?.moderation?.status || 'pending'
const isPending = (s) => statusOf(s) === 'pending' || (s.episodes || []).some((e) => statusOf(e) === 'pending')

// Who gets what. `except` names series to leave alone.
const PLAN = [
  { email: 'dev2@freshroad.com', action: 'shelve', except: [] },
  { email: 'gcash.mall.tv@gmail.com', action: 'shelve', except: ['Galactic Odyssey'] },
  { email: 'alex@freshroad.com', action: 'delete', except: [] },
]

const purchasedCount = async (seriesId) => {
  const users = await get('users', { 'purchases.seriesId': String(seriesId) })
  return users.length
}

let shelved = 0
let deleted = 0
let refused = 0

for (const { email, action, except } of PLAN) {
  const [u] = await get('users', { email }, {}, {}, 1)
  if (!u) {
    console.log(`\n${email}: no such user — skipped`)
    continue
  }
  const all = await get('series', { uploaderId: u._id }, {}, { createdAt: 1 })
  const targets = all.filter(isPending).filter((s) => !except.includes(s.name))
  const skipped = all.filter(isPending).filter((s) => except.includes(s.name))

  console.log(`\n${email} — ${action.toUpperCase()} ${targets.length} pending series`)
  for (const s of skipped) console.log(`   keep    "${s.name}" (excluded)`)

  for (const s of targets) {
    if (action === 'shelve') {
      console.log(`   ${apply ? 'shelve ' : 'would shelve'}  "${s.name}"`)
      if (apply) {
        // `shelved` stays derived; parking only sets the uploader switch.
        await save('series', { ...s, shelvedByUploader: true, shelved: true, updatedAt: new Date() })
        shelved += 1
      }
    } else {
      const buyers = await purchasedCount(s._id)
      if (buyers > 0) {
        console.log(`   REFUSED  "${s.name}" — ${buyers} user(s) have purchased episodes`)
        refused += 1
        continue
      }
      console.log(`   ${apply ? 'DELETE ' : 'would DELETE'}  "${s.name}"  (${(s.episodes || []).length} episodes)`)
      if (apply) {
        await remove('series', { _id: new ObjectId(String(s._id)) })
        deleted += 1
      }
    }
  }
}

console.log(
  apply
    ? `\nshelved ${shelved}, deleted ${deleted}${refused ? `, refused ${refused}` : ''}`
    : '\nDry run — nothing changed. Re-run with --apply.',
)
process.exit(0)

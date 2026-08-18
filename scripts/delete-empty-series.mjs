// Deletes every series that has no episodes (empty/missing `episodes` array) from the DB.
// Dry-run by default — prints what it WOULD delete. Pass --apply to actually delete.
// Usage:
//   node scripts/delete-empty-series.mjs           # dry run, lists candidates
//   node scripts/delete-empty-series.mjs --apply   # delete them
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Load .env into process.env (db.js reads MONGODB_URI + VITE_APP_DISPLAY_NAME)
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
)
Object.assign(process.env, env)

const { get, remove } = await import(path.join(root, 'netlify/functions/utils/db.js'))

const apply = process.argv.includes('--apply')

// Pull just the name + first episode ($slice keeps the payload small) for every series.
const series = await get('series', {}, { name: 1, episodes: { $slice: 1 } }, { name: 1 })
const empty = series.filter((s) => !Array.isArray(s.episodes) || s.episodes.length === 0)

console.log(`Total series: ${series.length}`)
console.log(`Series with no episodes: ${empty.length}`)
for (const s of empty) console.log(`  - ${s.name || '(untitled)'}  [${s._id}]`)

if (empty.length === 0) {
  console.log('Nothing to delete.')
  process.exit(0)
}

if (!apply) {
  console.log('\nDRY RUN — no changes made. Re-run with --apply to delete the above.')
  process.exit(0)
}

const res = await remove('series', { _id: { $in: empty.map((s) => s._id) } })
console.log(`\nDeleted ${res.deletedCount} series.`)
process.exit(0)

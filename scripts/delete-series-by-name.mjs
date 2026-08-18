// Fully deletes a fixed list of series (by name) and all their traces:
//   • Bunny episode videos (episode.videoId)
//   • Cloudinary assets (covers, thumbnails, production episodeVideo / random frames / refs)
//   • references in every user's favorites[] and watchList[]
//   • linked production docs (the "production list")
//   • the series docs themselves (the "published"/"uploaded" list)
// Dry-run by default — prints the plan. Pass --apply to actually delete.
// Usage:
//   node scripts/delete-series-by-name.mjs           # dry run
//   node scripts/delete-series-by-name.mjs --apply   # execute
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Load .env BEFORE importing modules that read env at import time (bunny.js, cloudinaryUtil.js)
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
)
Object.assign(process.env, env)

const { get, remove, update } = await import(path.join(root, 'netlify/functions/utils/db.js'))
const { deleteBunnyVideo } = await import(path.join(root, 'netlify/functions/utils/bunny.js'))
const { deleteByUrl } = await import(path.join(root, 'netlify/functions/utils/cloudinaryUtil.js'))

// The exact names to delete ("aaa" intentionally matches both series named "aaa").
const NAMES = [
  'AI',
  'AIAI',
  'Bound by Time',
  'GAIA宣传片',
  'Magic',
  'Orphan of Eldoria',
  'Synthetic Hearts',
  'Unseen',
  'aaa',
  's22',
]

const apply = process.argv.includes('--apply')

// ── Gather everything ────────────────────────────────────────────────────────
const series = await get('series', { name: { $in: NAMES } }, {}, { name: 1 })
const seriesIds = series.map((s) => String(s._id))
const seriesObjIds = series.map((s) => s._id)

// Bunny video ids from every episode
const bunnyIds = []
for (const s of series) for (const e of s.episodes || []) if (e.videoId) bunnyIds.push(e.videoId)

// Productions linked to these series (by seriesId)
const allProductions = await get('productions', {}, {}, {})
const productions = allProductions.filter((p) => p.seriesId && seriesIds.includes(String(p.seriesId)))

// Every Cloudinary URL anywhere in the series + production docs (recursive scan)
const cloudUrls = new Set()
const collectCloud = (o) => {
  if (!o) return
  if (typeof o === 'string') {
    if (o.includes('res.cloudinary.com')) cloudUrls.add(o)
    return
  }
  if (Array.isArray(o)) return o.forEach(collectCloud)
  if (typeof o === 'object') return Object.values(o).forEach(collectCloud)
}
series.forEach(collectCloud)
productions.forEach(collectCloud)

// Users whose favorites/watchList reference any target series
const users = await get('users', {}, { favorites: 1, watchList: 1, nickname: 1 }, {})
const usersToClean = users.filter(
  (u) =>
    (u.favorites || []).some((f) => seriesIds.includes(String(f.seriesId))) ||
    (u.watchList || []).some((w) => seriesIds.includes(String(w.seriesId))),
)

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`Series matched: ${series.length}`)
for (const s of series) console.log(`  - "${s.name}"  [${s._id}]  episodes=${(s.episodes || []).length}`)
console.log(`Bunny videos to delete:        ${bunnyIds.length}`)
console.log(`Cloudinary assets to delete:   ${cloudUrls.size}`)
console.log(`Linked productions to delete:  ${productions.length}`)
console.log(`Users to clean (fav/watch):    ${usersToClean.length}`)

if (series.length === 0) {
  console.log('Nothing to delete.')
  process.exit(0)
}
if (!apply) {
  console.log('\nDRY RUN — no changes made. Re-run with --apply to delete everything above.')
  process.exit(0)
}

// ── Execute (best-effort on external storage; DB deletes are authoritative) ────
let bunnyOk = 0
for (const id of bunnyIds) {
  try {
    await deleteBunnyVideo(id)
    bunnyOk++
  } catch (e) {
    console.error(`  bunny ${id}: ${e.message}`)
  }
}
console.log(`Bunny deleted: ${bunnyOk}/${bunnyIds.length}`)

let cloudOk = 0
for (const url of cloudUrls) {
  try {
    const r = await deleteByUrl(url)
    if (!r?.skipped) cloudOk++
  } catch (e) {
    console.error(`  cloudinary ${url.slice(0, 80)}…: ${e.message}`)
  }
}
console.log(`Cloudinary deleted: ${cloudOk}/${cloudUrls.size}`)

let usersCleaned = 0
for (const u of usersToClean) {
  await update(
    'users',
    { _id: u._id },
    { $pull: { favorites: { seriesId: { $in: seriesIds } }, watchList: { seriesId: { $in: seriesIds } } } },
  )
  usersCleaned++
}
console.log(`Users cleaned: ${usersCleaned}`)

if (productions.length) {
  const pr = await remove('productions', { _id: { $in: productions.map((p) => p._id) } })
  console.log(`Productions deleted: ${pr.deletedCount}`)
}

const sr = await remove('series', { _id: { $in: seriesObjIds } })
console.log(`Series deleted: ${sr.deletedCount}`)
process.exit(0)

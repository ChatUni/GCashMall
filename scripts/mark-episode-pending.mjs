// Put an episode back into review, for testing the moderation sweep.
//
// The sweep looks for series with something awaiting review that no job covers. Flipping a
// single approved episode back to pending is the cheapest way to give it something to find.
//
//   node scripts/mark-episode-pending.mjs "Fae Manor Romance"        # the last episode
//   node scripts/mark-episode-pending.mjs "Fae Manor Romance" 12     # a specific one
//   node scripts/mark-episode-pending.mjs "Fae Manor Romance" --apply
//
// Marking an episode pending is not enough on its own to make the scan run again. A video
// keeps its verdict (in `videoModeration`, keyed by videoId), and a verdict from a real scan
// is trusted rather than repeated — which is right in production and unhelpful in a test.
// `--rescan` clears that verdict so the video is judged again. The transcript is KEPT: it is
// the slow, costly half of a scan and does not change when a verdict is re-examined, so a
// re-scan re-runs the text and frame checks without paying to transcribe the video twice.
//
//   node scripts/mark-episode-pending.mjs "Fae Manor Romance" --rescan --apply

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
for (const l of readFileSync(`${REPO}/.env`, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { get, save } = await import(`${REPO}/netlify/functions/utils/db.js`)

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')
const rescan = process.argv.includes('--rescan')
const name = args[0]
const wanted = args[1] ? Number(args[1]) : null
if (!name) {
  console.error('usage: node scripts/mark-episode-pending.mjs "<series name>" [episodeNumber] [--apply]')
  process.exit(1)
}

const [series] = await get('series', { name }, {}, {}, 1)
if (!series) { console.error(`no series named "${name}"`); process.exit(1) }

const episodes = (series.episodes || []).slice().sort((a, b) => a.episodeNumber - b.episodeNumber)
const target = wanted
  ? episodes.find((e) => Number(e.episodeNumber) === wanted)
  : episodes[episodes.length - 1]
if (!target) { console.error(`episode ${wanted} not found`); process.exit(1) }

console.log(`"${series.name}"  ${episodes.length} episodes`)
console.log(`  ep${target.episodeNumber} "${target.title}"  ${target.moderation?.status ?? 'undefined'} -> pending`)
if (rescan) {
  console.log(`  --rescan: will clear the stored verdict for video ${String(target.videoId).slice(0, 8)}`)
}

if (!apply) {
  console.log('\nDry run — nothing changed. Re-run with --apply.')
  process.exit(0)
}

const updated = {
  ...series,
  episodes: (series.episodes || []).map((e) =>
    Number(e.episodeNumber) === Number(target.episodeNumber)
      ? {
          ...e,
          moderation: { status: 'pending', reason: '', reviewedAt: null, reviewedBy: null, pending: null },
        }
      : e,
  ),
  updatedAt: new Date(),
}
// `shelved` is derived, so recompute rather than assume: an episode above the approved run
// does not hide the series, but an episode inside it would shorten what is public.
const statusOf = (d) => d?.moderation?.status || 'pending'
const byNumber = new Map(updated.episodes.map((e) => [Number(e.episodeNumber), statusOf(e)]))
let through = 0
while (byNumber.get(through + 1) === 'approved') through += 1
updated.shelved = !!updated.shelvedByUploader || !(statusOf(updated) === 'approved' && through >= 1)

await save('series', updated)

// Drop the video's verdict so the next run judges it again — but keep the transcript, which
// is unchanged by a re-judgement and expensive to reproduce.
if (rescan && target.videoId) {
  const { update } = await import(`${REPO}/netlify/functions/utils/db.js`)
  const [rec] = await get('videoModeration', { videoId: target.videoId }, {}, {}, 1)
  await update(
    'videoModeration',
    { videoId: target.videoId },
    {
      $set: { status: 'processing', phase: 'awaiting_encode', stage: 'encoding', progress: 5,
              reason: '', categories: [], checked: true, updatedAt: new Date() },
    },
  )
  console.log(
    `  cleared the verdict for ${target.videoId}` +
      (rec?.transcript ? `  (kept the ${rec.transcript.length}-char transcript)` : '  (no stored transcript)'),
  )
}
console.log(`\ndone — public through episode ${through}, shelved=${updated.shelved}`)
console.log('the sweep should now find this series')
process.exit(0)

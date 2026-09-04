// Refund holds on productions that were charged but can never produce an episode.
//
// Settlement only ran on the success path until releaseEpisodeHold existed, so jobs that
// died after the charge left their creator paying for nothing. This sweeps up the ones that
// predate the fix. Uses releaseEpisodeHold, so it obeys the same exactly-once claim as the
// live code and is safe to re-run.
//
//   node scripts/release-stuck-holds.mjs           # dry run
//   node scripts/release-stuck-holds.mjs --apply

import { readFileSync } from 'fs'
for (const l of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { get } = await import('../netlify/functions/utils/db.js')
const { releaseEpisodeHold } = await import('../netlify/functions/utils/episodeBilling.js')

const apply = process.argv.includes('--apply')

// Charged, never settled, and with no episode to show for it.
const candidates = (await get('productions', { chargedCredits: { $gt: 0 }, settledAt: { $exists: false } })).filter(
  (d) => !d.episodeVideo,
)

// A job still working is not stuck — only sweep ones that have finished or died.
const failed = candidates.filter((d) => {
  const calls = d.progress?.calls || []
  const composition = calls.find((c) => c.key === 'composition')
  return d.status === 'error' || composition?.status === 'error' || calls.some((c) => c.status === 'error')
})
const inFlight = candidates.filter((d) => !failed.includes(d))

console.log(`${candidates.length} charged-but-unsettled production(s): ${failed.length} failed, ${inFlight.length} still in flight\n`)
for (const d of inFlight) console.log(`  skip  ${d.jobId}  ${d.chargedCredits} credits — status ${d.status}, still running`)
if (inFlight.length) console.log()

let total = 0
for (const d of failed) {
  const why = d.error || d.audioError || 'Generation failed'
  console.log(`  ${apply ? 'refund' : 'would refund'}  ${d.jobId}  ${d.chargedCredits} credits  (${why})`)
  total += Number(d.chargedCredits || 0)
  if (apply) {
    const r = await releaseEpisodeHold(d.jobId, why)
    console.log(`      -> ${r ? `refunded ${r.refundedCredits}` : 'no-op (already settled)'}`)
  }
}
console.log(`\n${apply ? 'Refunded' : 'Would refund'} ${total} credits across ${failed.length} production(s).`)
if (!apply && failed.length) console.log('Re-run with --apply to post the refunds.')
process.exit(0)

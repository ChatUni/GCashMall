// Re-run composition for productions whose shots rendered but whose stitch failed.
//
// Reuses the rendered shots as they are — nothing is regenerated. Use when a composition
// failure has been fixed at the source (e.g. the OpenRouter 401 on shot downloads) and the
// affected jobs need to reach the episode their creator already paid for.
//
//   node scripts/recompose.mjs                 # list what would run
//   node scripts/recompose.mjs --apply         # compose them
//   node scripts/recompose.mjs --apply <jobId> # just one

import { readFileSync } from 'fs'
for (const l of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { get, update } = await import('../netlify/functions/utils/db.js')
const { runAudioComposition } = await import('../netlify/functions/utils/audioJob.js')

const apply = process.argv.includes('--apply')
const only = process.argv.slice(2).find((a) => !a.startsWith('--'))

const all = await get('productions', { mode: 'v1produce' }, {}, { updatedAt: -1 }, 200)
const stuck = all.filter(
  (d) => !d.episodeVideo && (d.videos || []).some((v) => v.url) && (only ? d.jobId === only : true),
)

console.log(`${stuck.length} production(s) with rendered shots but no episode\n`)
for (const d of stuck) {
  console.log(`  ${d.jobId}  "${d.title || d.ideaTitle}"  ${(d.videos || []).filter((v) => v.url).length} shots  (${d.audioError || d.error || 'no error recorded'})`)
}
if (!apply) {
  console.log('\nRe-run with --apply to compose these.')
  process.exit(0)
}

for (const d of stuck) {
  console.log(`\n── composing ${d.jobId} ──`)
  // Clear the stale compose claim so runAudioComposition can take it.
  await update('productions', { jobId: d.jobId }, { $unset: { 'render.composeRunAt': '' } })
  try {
    await runAudioComposition(d.jobId, d.userId)
    const [after] = await get('productions', { jobId: d.jobId }, {}, {}, 1)
    console.log(after.episodeVideo ? `   OK  ${after.episodeVideo}` : `   still no episode: ${after.audioError}`)
  } catch (e) {
    console.error('   FAILED:', e.message)
  }
}
process.exit(0)

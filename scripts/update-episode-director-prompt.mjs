// One-off: make the Episode Director prompt honour a target episode length instead of a
// hardcoded 30 seconds, so 30s and 60s episodes both plan correctly.
//
//   node scripts/update-episode-director-prompt.mjs            # dry run
//   node scripts/update-episode-director-prompt.mjs --apply
//
// The shot COUNT has to be parameterised alongside the total: 3–5 shots at 5–10s each caps
// out at 50s, so a 60s episode is unreachable without more shots.
import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'

const ROOT = path.resolve(import.meta.dirname, '..')
for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}
const APPLY = process.argv.includes('--apply')

const OLD_SHOTS = '- The episode must contain between 3 and 5 shots. Approximately four shots is ideal.'
const OLD_TOTAL = '- The sum of all shot durations MUST total approximately 30 seconds (between 25 and 32 seconds).'

const NEW_SHOTS =
  '- Use as many shots as are needed to fill `targetDurationSeconds`, at roughly 7–8 seconds per shot ' +
  '(so about `targetDurationSeconds / 7.5` shots — e.g. ~4 shots for 30 seconds, ~8 for 60).'
const NEW_TOTAL =
  '- The sum of all shot durations MUST total approximately `targetDurationSeconds` seconds ' +
  '(within 10% either way). `targetDurationSeconds` is given in the input — never assume a fixed length.'

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db(process.env.VITE_APP_DISPLAY_NAME.toLowerCase())
const col = db.collection('pipelinePromptsV1')
const doc = await col.findOne({ key: 'episodeDirector' })

if (!doc) {
  console.log('episodeDirector prompt not found')
} else if (doc.markdown.includes('targetDurationSeconds')) {
  console.log('already parameterised — nothing to do')
} else {
  let md = doc.markdown
  const missing = [OLD_SHOTS, OLD_TOTAL].filter((s) => !md.includes(s))
  if (missing.length) {
    console.log('WARNING: expected line(s) not found, prompt may have been edited:')
    missing.forEach((s) => console.log('   ' + s.slice(0, 80)))
  }
  md = md.replace(OLD_SHOTS, NEW_SHOTS).replace(OLD_TOTAL, NEW_TOTAL)
  console.log('── before ──')
  console.log('   ' + OLD_SHOTS + '\n   ' + OLD_TOTAL)
  console.log('── after ──')
  console.log('   ' + NEW_SHOTS + '\n   ' + NEW_TOTAL)
  if (APPLY) {
    await col.updateOne({ key: 'episodeDirector' }, { $set: { markdown: md, updatedAt: new Date() } })
    console.log('\napplied')
  } else {
    console.log('\nDry run. Re-run with --apply to write.')
  }
}
await client.close()

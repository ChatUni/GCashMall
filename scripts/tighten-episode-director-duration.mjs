// The episodeDirector prompt already carried targetDurationSeconds, but a 60s job came back
// with 4 shots totalling 50s and two 15s shots — both outside the stated limits. The rule
// was phrased as guidance ("roughly 7-8 seconds per shot"), which left the arithmetic to the
// model. This restates it as an explicit computation with a self-check.
//
// Idempotent: re-running reports that the prompt is already tightened.

import { readFileSync } from 'fs'
for (const l of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { get, update } = await import('../netlify/functions/utils/db.js')

const OLD =
  '- Use as many shots as are needed to fill `targetDurationSeconds`, at roughly 7–8 seconds per shot (so about `targetDurationSeconds / 7.5` shots — e.g. ~4 shots for 30 seconds, ~8 for 60).'
const NEW =
  '- FIRST compute the shot count: `shotCount = round(targetDurationSeconds / 7.5)` — 4 shots for 30 seconds, 8 for 60. Produce EXACTLY that many shots.'

const OLD_TOTAL =
  '- The sum of all shot durations MUST total approximately `targetDurationSeconds` seconds (within 10% either way). `targetDurationSeconds` is given in the input — never assume a fixed length.'
const NEW_TOTAL =
  '- Before returning, ADD UP every shot\'s expectedDurationSeconds. The total MUST land within 10% of `targetDurationSeconds`. If it does not, adjust the shot durations until it does. `targetDurationSeconds` is given in the input — never assume a fixed length, and never fall short of it.'

const [doc] = await get('pipelinePromptsV1', { key: 'episodeDirector' }, {}, {}, 1)
if (!doc) {
  console.error('episodeDirector prompt not found')
  process.exit(1)
}

if (doc.markdown.includes('shotCount = round')) {
  console.log('Already tightened — no change.')
  process.exit(0)
}
if (!doc.markdown.includes(OLD) || !doc.markdown.includes(OLD_TOTAL)) {
  console.error('Expected constraint lines not found; not editing blindly.')
  process.exit(1)
}

const markdown = doc.markdown.replace(OLD, NEW).replace(OLD_TOTAL, NEW_TOTAL)
await update('pipelinePromptsV1', { key: 'episodeDirector' }, { $set: { markdown, updatedAt: new Date() } })

const [after] = await get('pipelinePromptsV1', { key: 'episodeDirector' }, {}, {}, 1)
console.log(after.markdown.includes('shotCount = round') ? 'Tightened.' : 'FAILED to apply')
process.exit(0)

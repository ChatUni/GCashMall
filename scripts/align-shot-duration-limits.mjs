// Align the episodeDirector prompt's shot-duration limits with what the renderer actually
// supports.
//
// The prompt claimed shots MUST be 5-10 seconds. The renderer accepts 4-15 and silently
// clamps anything above, so a plan of 16/14/15/15s for a 60s episode rendered as 15/14/15/15
// = 59s — under target, with no error anywhere. Two rules were fighting: the stated 10s
// ceiling and a shot count derived from 7.5s averages, neither of which the model followed.
//
// This states the renderer's real range, drops the arithmetic the model ignored twice, and
// keeps the one constraint that matters: the total must match targetDurationSeconds.
//
// Idempotent: re-running reports that the prompt is already aligned.

import { readFileSync } from 'fs'
for (const l of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const { get, update } = await import('../netlify/functions/utils/db.js')

const OLD_COUNT =
  '- FIRST compute the shot count: `shotCount = round(targetDurationSeconds / 7.5)` — 4 shots for 30 seconds, 8 for 60. Produce EXACTLY that many shots.'
const OLD_RANGE =
  "- Every shot's expectedDurationSeconds MUST be between 5 and 10 seconds. Never set a shot below 5 seconds — the video renderer cannot render clips shorter than 5 seconds."

const NEW_RANGE =
  "- Every shot's expectedDurationSeconds MUST be a whole number between 5 and 15 seconds. This is the renderer's real range: it cannot render a clip shorter than 5 seconds, and it silently shortens anything longer than 15, so a shot outside this range will not appear as you wrote it."
const NEW_COUNT =
  '- Use at least 3 shots, then as many more as the story needs to fill `targetDurationSeconds` at 5-15 seconds each. Longer, fewer shots and shorter, more numerous ones are both fine — choose what serves the pacing.'

const [doc] = await get('pipelinePromptsV1', { key: 'episodeDirector' }, {}, {}, 1)
if (!doc) {
  console.error('episodeDirector prompt not found')
  process.exit(1)
}
if (doc.markdown.includes('between 5 and 15 seconds')) {
  console.log('Already aligned — no change.')
  process.exit(0)
}
if (!doc.markdown.includes(OLD_COUNT) || !doc.markdown.includes(OLD_RANGE)) {
  console.error('Expected constraint lines not found; not editing blindly.')
  process.exit(1)
}

const markdown = doc.markdown.replace(OLD_COUNT, NEW_COUNT).replace(OLD_RANGE, NEW_RANGE)
await update('pipelinePromptsV1', { key: 'episodeDirector' }, { $set: { markdown, updatedAt: new Date() } })

const [after] = await get('pipelinePromptsV1', { key: 'episodeDirector' }, {}, {}, 1)
console.log(after.markdown.includes('between 5 and 15 seconds') ? 'Aligned.' : 'FAILED to apply')
process.exit(0)

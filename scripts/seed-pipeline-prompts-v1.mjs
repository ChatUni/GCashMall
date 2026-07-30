// Seeds the Quick Create V1 production-pipeline prompts into the DB `pipelinePromptsV1`
// collection. Reads the markdown source from `specs/quick create v1/call-*.md`. Each doc
// holds the full markdown; the server parses the "## System Prompt" and "## Required Output"
// sections at generation time (see utils/pipeline.js buildCallSystemPrompt).
// Usage: node scripts/seed-pipeline-prompts-v1.mjs
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

const { get, save, update } = await import(
  path.join(root, 'netlify/functions/utils/db.js')
)

// filename → { key, title, order }
const CALLS = [
  { file: 'call-1-executive-producer.md', key: 'executiveProducer', title: 'Executive Producer', order: 1 },
  { file: 'call-2-character-director.md', key: 'characterDirector', title: 'Character Director', order: 2 },
  { file: 'call-3-episode-director.md', key: 'episodeDirector', title: 'Episode Director', order: 3 },
  { file: 'call-4a-visual-asset-director.md', key: 'visualAssetDirector', title: 'Visual Asset Director', order: 4 },
  { file: 'call-4b-audio-director.md', key: 'audioDirector', title: 'Audio Director', order: 5 },
  { file: 'call-5-episode-producer.md', key: 'episodeProducer', title: 'Episode Producer', order: 6 },
]

const specsDir = path.join(root, 'specs', 'quick create v1')

for (const call of CALLS) {
  const markdown = fs.readFileSync(path.join(specsDir, call.file), 'utf8')
  const existing = await get('pipelinePromptsV1', { key: call.key }, {}, {}, 1)
  if (existing && existing.length > 0) {
    await update(
      'pipelinePromptsV1',
      { key: call.key },
      { $set: { title: call.title, order: call.order, markdown, updatedAt: new Date() } },
    )
    console.log(`updated  ${call.key}`)
  } else {
    await save('pipelinePromptsV1', {
      key: call.key,
      title: call.title,
      order: call.order,
      markdown,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log(`inserted ${call.key}`)
  }
}

console.log('done')
process.exit(0)

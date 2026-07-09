// Seeds the 6 AI production-pipeline prompts into the DB `pipelinePrompts` collection.
// Reads the markdown source from `specs/quick create/call-*.md`. Each document holds
// the full markdown; the server parses the "## System Prompt" and "## Output" sections
// at generation time. Admins can later edit the markdown from Account → Settings.
// Usage: node scripts/seed-pipeline-prompts.mjs
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
  { file: 'call-2-ai-director.md', key: 'aiDirector', title: 'AI Director', order: 2 },
  { file: 'call-3-character-designer.md', key: 'characterDesigner', title: 'Character Designer', order: 3 },
  { file: 'call-4-production-storyboard-architect.md', key: 'storyboardArchitect', title: 'Production Storyboard Architect', order: 4 },
  { file: 'call-5-story-intelligence-optimizer.md', key: 'storyOptimizer', title: 'Story Intelligence Optimizer', order: 5 },
  { file: 'call-6-production-prompt-compiler.md', key: 'promptCompiler', title: 'Production Prompt Compiler', order: 6 },
]

const specsDir = path.join(root, 'specs', 'quick create')

for (const call of CALLS) {
  const markdown = fs.readFileSync(path.join(specsDir, call.file), 'utf8')
  const existing = await get('pipelinePrompts', { key: call.key }, {}, {}, 1)
  if (existing && existing.length > 0) {
    await update(
      'pipelinePrompts',
      { key: call.key },
      { $set: { title: call.title, order: call.order, markdown, updatedAt: new Date() } },
    )
    console.log(`updated  ${call.key}`)
  } else {
    await save('pipelinePrompts', {
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

console.log('Done seeding pipeline prompts.')
process.exit(0)

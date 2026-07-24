// Shared AI production-pipeline logic used by the pipeline background function.
// Each of the 6 calls' system prompt + output schema lives in the `pipelinePrompts`
// collection (markdown, editable by admins); we parse it and call OpenAI in JSON mode.

import { get } from './db.js'
import { generateImage } from './openaiImage.js'

// Order of the 6 pipeline calls
export const PIPELINE_CALL_KEYS = [
  'executiveProducer',
  'aiDirector',
  'characterDesigner',
  'storyboardArchitect',
  'storyOptimizer',
  'promptCompiler',
  'renderingEngine',
]

// Call OpenAI chat and parse the response as a JSON object (json_object mode)
export const callOpenAIChatJson = async (systemPrompt, userContent) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  return JSON.parse(content)
}

// Extract the first fenced code block that appears after a markdown heading
const parsePromptSection = (md, heading) => {
  const i = md.indexOf(heading)
  if (i < 0) return ''
  const rest = md.slice(i + heading.length)
  const m = rest.match(/```[a-z]*\s*\n([\s\S]*?)```/)
  return m ? m[1].trim() : ''
}

// Generic rules injected into EVERY pipeline call at generation time. Kept in code
// (not in the admin-editable DB prompt) so they always apply and can't be edited away
// or dropped when an admin tweaks a prompt in Settings.
const GENERIC_PROMPT_RULES = [
  'ARRAY RULE: In the JSON output schema, any array shows the structure of ONE example ' +
    'element only. Populate every array with the ACTUAL number of items the content requires ' +
    '— one entry per character, scene, shot, graph node/edge, episode, change, etc. When the ' +
    'input already contains an array, the output must keep an entry for every input item (e.g. ' +
    'every shot in the input shot graph — never fewer). Never collapse an array to a single ' +
    'item, and never drop items that exist in the input.',
].join('\n\n')

// Build the effective system message for a call from its markdown document:
// the "## System Prompt" block, plus the "## Output"/"## Required Output" JSON schema,
// with the hardcoded generic rules injected regardless of what the DB prompt contains.
export const buildCallSystemPrompt = (md) => {
  const systemPrompt = parsePromptSection(md, '## System Prompt')
  if (!systemPrompt) {
    throw new Error('Prompt is missing a "## System Prompt" section')
  }
  const outputSchema =
    parsePromptSection(md, '## Required Output') || parsePromptSection(md, '## Output')
  let msg = systemPrompt + '\n\n' + GENERIC_PROMPT_RULES
  if (outputSchema) {
    msg +=
      '\n\nReturn a single JSON object with this structure. Fill in every field — do not leave placeholders.\n' +
      outputSchema
  }
  return msg
}

// Run one pipeline call: load its prompt from the DB, call OpenAI, return parsed JSON
export const runOneCall = async (callKey, input) => {
  const docs = await get('pipelinePrompts', { key: callKey }, {}, {}, 1)
  if (!docs || docs.length === 0) {
    throw new Error(`Pipeline prompt "${callKey}" is not configured`)
  }
  const systemPrompt = buildCallSystemPrompt(docs[0].markdown)
  return callOpenAIChatJson(systemPrompt, JSON.stringify(input))
}

// Generate an episode cover image (OpenAI) and store it in Cloudinary; return the URL
export const generateCover = (prompt) => generateImage(prompt, 'GCash/quick create/covers')

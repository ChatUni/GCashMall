// Shared AI production-pipeline logic used by the pipeline background function.
// Each of the 6 calls' system prompt + output schema lives in the `pipelinePrompts`
// collection (markdown, editable by admins); we parse it and call OpenAI in JSON mode.

import { get } from './db.js'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
})

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

// Build the effective system message for a call from its markdown document:
// the "## System Prompt" block, plus the "## Output"/"## Required Output" JSON schema.
export const buildCallSystemPrompt = (md) => {
  const systemPrompt = parsePromptSection(md, '## System Prompt')
  if (!systemPrompt) {
    throw new Error('Prompt is missing a "## System Prompt" section')
  }
  const outputSchema =
    parsePromptSection(md, '## Required Output') || parsePromptSection(md, '## Output')
  let msg = systemPrompt
  if (outputSchema) {
    msg +=
      '\n\nReturn a single JSON object with this structure. Fill in every field — do not leave placeholders. ' +
      'Where a field is an array, the example shows the shape of ONE element only: output as many elements as the ' +
      'content actually requires — e.g. one shot_prompt per shot in the shot graph, one node per story beat, one ' +
      'entry per episode/scene. Never collapse an array to a single item or drop items that exist in the input.\n' +
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
export const generateCover = async (prompt) => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI image error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  const data = await res.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('No image was returned')

  const uploaded = await cloudinary.uploader.upload(`data:image/png;base64,${b64}`, {
    folder: 'GCash/quick create/covers',
  })
  return uploaded.secure_url
}

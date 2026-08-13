// Quick Create V1 pipeline logic. Each call's system prompt + output schema lives in the
// `pipelinePromptsV1` collection (seeded from specs/quick create v1/call-*.md). We reuse the
// v0 buildCallSystemPrompt (which injects the shared ARRAY RULE) and callOpenAIChatJson.
//
// The JSON ARRAY RULE is injected here via buildCallSystemPrompt. Subtitles are no longer
// burned into the video (they're delivered as external caption tracks by the transcribe
// step); the renderer adapter (renderV1.js) only passes dialogue as voice-only context.

import { get } from './db.js'
import { buildCallSystemPrompt, callOpenAIChatJson } from './pipeline.js'

// The five model-agnostic GPT calls that produce the Episode Production Package.
// 4A and 4B run in parallel; Call 6 (renderer) is a code adapter, not a GPT prompt.
export const V1_CALL_KEYS = [
  'executiveProducer', // Call 1
  'characterDirector', // Call 2
  'episodeDirector', // Call 3
  'visualAssetDirector', // Call 4A
  'audioDirector', // Call 4B
  'episodeProducer', // Call 5
]

// Load a v1 call's prompt from the DB, call OpenAI in JSON mode, return parsed JSON.
export const runV1Call = async (callKey, input) => {
  if (!callKey) throw new Error('callKey is required')
  const docs = await get('pipelinePromptsV1', { key: callKey }, {}, {}, 1)
  if (!docs || docs.length === 0) {
    throw new Error(`V1 pipeline prompt "${callKey}" is not configured`)
  }
  const systemPrompt = buildCallSystemPrompt(docs[0].markdown)
  return callOpenAIChatJson(systemPrompt, JSON.stringify(input || {}))
}

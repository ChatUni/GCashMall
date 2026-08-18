// Admin-configurable model selection. The chat, image, and video (Seedance) models are read
// from the system settings doc (collection `settings`, key `system`) — env model vars
// (OPENAI_CHAT_MODEL / OPENAI_IMAGE_MODEL / SEEDANCE_MODEL) are intentionally IGNORED. Values
// are cached briefly per warm container so an admin change propagates within ~TTL.
import { get } from './db.js'

const SETTINGS_KEY = 'system'

export const MODEL_DEFAULTS = {
  chatModel: 'gpt-5-mini',
  imageModel: 'gpt-image-1-mini',
  seedanceModel: 'doubao-seedance-2-0-mini-260615',
}

// Allowed values — power the admin dropdowns and the server-side validation. Add ids here.
export const CHAT_MODEL_OPTIONS = ['gpt-5-mini', 'gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o']
export const IMAGE_MODEL_OPTIONS = ['gpt-image-1-mini', 'gpt-image-1']
export const SEEDANCE_MODEL_OPTIONS = [
  'doubao-seedance-2-0-mini-260615',
  'doubao-seedance-2-0-260128',
  'doubao-seedance-1-0-pro-250528',
]

let cache = null
let cacheAt = 0
const TTL_MS = 30 * 1000

const readModels = async () => {
  const now = Date.now()
  if (cache && now - cacheAt < TTL_MS) return cache
  let saved = {}
  try {
    const docs = await get('settings', { key: SETTINGS_KEY }, {}, {}, 1)
    saved = (docs && docs[0]) || {}
  } catch {
    saved = {}
  }
  cache = {
    chatModel: saved.chatModel || MODEL_DEFAULTS.chatModel,
    imageModel: saved.imageModel || MODEL_DEFAULTS.imageModel,
    seedanceModel: saved.seedanceModel || MODEL_DEFAULTS.seedanceModel,
  }
  cacheAt = now
  return cache
}

export const getChatModel = async () => (await readModels()).chatModel
export const getImageModel = async () => (await readModels()).imageModel
export const getSeedanceModel = async () => (await readModels()).seedanceModel

// gpt-5 family + o-series are reasoning models (they reject a custom `temperature`).
export const isReasoningModel = (m) => /^(gpt-5|o\d)/i.test(m || '')

// The right sampling/reasoning knob for a chat model: reasoning models take reasoning_effort
// (minimal — our tasks are structured JSON, so heavy reasoning just burns tokens) and no
// temperature; everything else gets the requested temperature.
export const chatTuning = (model, temperature) =>
  isReasoningModel(model)
    ? { reasoning_effort: 'minimal' }
    : temperature === undefined
      ? {}
      : { temperature }

// Seedance 2.x renders synchronized audio natively, so the separate TTS/mux step is skipped.
export const modelHasNativeAudio = async () => /seedance-2/i.test(await getSeedanceModel())

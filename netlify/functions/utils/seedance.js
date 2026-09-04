// Video generation via OpenRouter's Video Generation API.
//
//   POST /api/v1/videos              -> { id, status, polling_url }
//   GET  {polling_url} | /videos/:id -> { status, unsigned_urls[], error }
//   GET  /videos/:id/content?index=0 -> the MP4 bytes (needs the bearer token)
//
// Docs: https://openrouter.ai/docs/api/api-reference/video-generation
//
// Replaces the direct Volcengine/BytePlus ModelArk integration. The models are the same
// Seedance ones, addressed by OpenRouter slug (bytedance/seedance-2.0-mini | -fast).
//
// Env:
//   OPENROUTER_API_KEY  — required
//   OPENROUTER_BASE_URL — optional override (default https://openrouter.ai/api/v1)
//
// The module's exported surface is unchanged from the ModelArk version so videoJob.js and
// audioJob.js keep working: createVideoTask / getVideoTask / extractVideoUrl / apiProgress
// / generateVideo / modelHasNativeAudio.

import { getSeedanceModel } from './modelConfig.js'

const clean = (v) => String(v || '').trim().replace(/^['"]|['"]$/g, '')

const BASE = (clean(process.env.OPENROUTER_BASE_URL) || 'https://openrouter.ai/api/v1').replace(/\/+$/, '')
const KEY = clean(process.env.OPENROUTER_API_KEY)

const keyFingerprint = () =>
  KEY ? `len=${KEY.length} ${KEY.slice(0, 6)}…${KEY.slice(-4)}` : 'MISSING'

export const describeConfig = () => `base=${BASE}, key=[${keyFingerprint()}]`

// Whether the selected model produces its own audio track (so no separate TTS/mix step is
// needed — only the shots need stitching). Re-exported from modelConfig.
export { modelHasNativeAudio } from './modelConfig.js'

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${KEY}`,
})

// A URL that points back at OpenRouter needs the bearer; a provider CDN URL must NOT get
// it. Exported so callers can apply the right headers — and so they can tell whether a URL
// is fetchable by a third party at all (Bunny's ingest cannot send our token).
export const isOpenRouterUrl = (url) => String(url || '').startsWith('https://openrouter.ai')

export const videoFetchHeaders = (url) =>
  isOpenRouterUrl(url) ? { Authorization: `Bearer ${KEY}` } : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Seedance 2.0 accepts 4–15s. The storyboard's per-shot duration is clamped into range.
const SUPPORTED_DURATIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
const clampDuration = (seconds) => {
  const n = Math.round(Number(seconds) || 5)
  const clamped = Math.max(SUPPORTED_DURATIONS[0], Math.min(SUPPORTED_DURATIONS.at(-1), n))
  // Say so. A silent clamp is why a 16s shot quietly became 15s and the episode landed
  // under the length the creator paid for, with no error recorded anywhere.
  if (clamped !== n) {
    console.warn(`shot duration ${n}s is outside the renderer's ${SUPPORTED_DURATIONS[0]}-${SUPPORTED_DURATIONS.at(-1)}s range; rendering ${clamped}s instead`)
  }
  return clamped
}

// OpenRouter takes structured fields, not the ModelArk "--resolution 480p" prompt suffix.
const buildBody = async (req, { firstFrameUrl, referenceImages, model: modelOverride } = {}) => {
  // The tier the user paid for wins; the admin setting is only the fallback.
  const model = modelOverride || (await getSeedanceModel())
  const body = {
    model,
    prompt: req.prompt,
    duration: clampDuration(req.duration_seconds),
    resolution: req.resolution || '480p', // Quick Create defaults to 480p
    aspect_ratio: req.aspect_ratio || '16:9',
  }
  // Frame chaining: start this clip from the previous shot's last frame, so a scene is
  // continuous. Seedance 2.0 advertises supported_frame_images: [first_frame, last_frame].
  if (firstFrameUrl) body.first_frame_image = firstFrameUrl
  // Canonical character stills, to hold identity across shots.
  const refs = (referenceImages || []).filter(Boolean).slice(0, 4)
  if (refs.length) body.reference_images = refs
  return body
}

// Submit a job. Returns { taskId, base } where `base` carries the polling URL — the shape
// videoJob.js already persists per shot.
export const createVideoTask = async (req, { firstFrameUrl, referenceImages, model } = {}) => {
  if (!KEY) throw new Error('OPENROUTER_API_KEY is not configured')

  const body = await buildBody(req, { firstFrameUrl, referenceImages, model })
  const res = await fetch(`${BASE}/videos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 400)
    // A 400 lists the supported values for whatever field was rejected — keep it visible.
    throw new Error(
      `OpenRouter video create failed (${res.status}) for model ${body.model}: ${detail}`,
    )
  }

  const job = await res.json()
  if (!job.id) throw new Error('OpenRouter did not return a video job id')
  return { taskId: job.id, base: job.polling_url || `${BASE}/videos/${job.id}` }
}

// Current state of a job. `base` is the polling URL captured at submit time.
export const getVideoTask = async (taskId, base) => {
  const url = base
    ? new URL(base, 'https://openrouter.ai').toString()
    : `${BASE}/videos/${taskId}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } })
  if (!res.ok) {
    throw new Error(`OpenRouter video poll failed (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  return res.json()
}

// The finished asset. Prefer unsigned_urls — the /content endpoint needs a bearer, and the
// downloader fetches plainly. videoFetchHeaders() covers the case where an unsigned URL
// still points back at OpenRouter.
export const extractVideoUrl = (task) =>
  task.unsigned_urls?.[0] ||
  task.output?.[0]?.url ||
  task.video_url ||
  (task.id && task.status === 'completed' ? `${BASE}/videos/${task.id}/content?index=0` : '')

// The API's own progress if it reports one (normalized to 0–100), else undefined.
export const apiProgress = (task) => {
  const cand = [task.progress, task.percent].find((x) => typeof x === 'number')
  if (typeof cand !== 'number') return undefined
  return Math.max(0, Math.min(100, cand <= 1 ? Math.round(cand * 100) : Math.round(cand)))
}

// Estimate progress from status + elapsed time when the API doesn't report a percent.
const EXPECTED_MS = 150000 // ~2.5 min for a shot to render
const estimateProgress = (status, elapsedMs) => {
  if (status === 'queued' || status === 'pending' || status === 'submitted') return 8
  return Math.min(95, 10 + Math.round((elapsedMs / EXPECTED_MS) * 85))
}

// OpenRouter's terminal states. 'completed' is the only success.
const TERMINAL_FAILURES = ['failed', 'cancelled', 'canceled', 'expired']

// Submit and poll until the job produces a video URL (or fails/times out). onProgress (if
// given) is called each poll with 0–100.
export const generateVideo = async (
  req,
  { timeoutMs = 8 * 60 * 1000, intervalMs = 6000, onProgress, firstFrameUrl, referenceImages, model } = {},
) => {
  const { taskId, base } = await createVideoTask(req, { firstFrameUrl, referenceImages, model })
  const startedAt = Date.now()
  onProgress?.(6)

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(intervalMs)
    const task = await getVideoTask(taskId, base)
    const status = String(task.status || '').toLowerCase()

    if (status === 'completed' || status === 'succeeded' || status === 'success') {
      const url = extractVideoUrl(task)
      if (!url) throw new Error('OpenRouter reported completed but returned no video URL')
      onProgress?.(100)
      return { url, taskId }
    }
    if (TERMINAL_FAILURES.includes(status)) {
      const msg = task.error?.message || task.error || JSON.stringify(task).slice(0, 200)
      throw new Error(`OpenRouter video job ${status}: ${msg}`)
    }
    onProgress?.(apiProgress(task) ?? estimateProgress(status, Date.now() - startedAt))
  }
  throw new Error('OpenRouter video job timed out')
}

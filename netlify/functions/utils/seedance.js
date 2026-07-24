// Seedance video generation (Volcengine / BytePlus ModelArk style async API).
// Flow: create a generation task, then poll the task until it succeeds and returns
// a video URL. Configure via env:
//   SEEDANCE_API_KEY   (required) — the ARK/ModelArk API key
//   SEEDANCE_BASE_URL  — API base; if unset/unknown we auto-detect the region
//   SEEDANCE_MODEL     — model id (e.g. seedance-1-0-pro-...)
//
// ARK keys are region-scoped: a key from one region returns 401 "API key doesn't
// exist" on another. So on a 401 we transparently retry the known regions and cache
// whichever one authenticates.

import { createHash } from 'node:crypto'

// Netlify env vars are often pasted with surrounding quotes or a trailing newline;
// those would be sent literally in the request and rejected, so sanitize them.
const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '')

const MODEL = clean(process.env.SEEDANCE_MODEL) || 'doubao-seedance-1-0-pro-250528'
const KEY = clean(process.env.SEEDANCE_API_KEY)

// Safe key fingerprint — length, first/last chars, and a short hash so the exact key
// (including the middle) can be compared between dev and prod without leaking the secret.
const keyFingerprint = () => {
  if (!KEY) return 'MISSING'
  const hash = createHash('sha256').update(KEY).digest('hex').slice(0, 10)
  return `${KEY.length} chars, ${KEY.slice(0, 4)}…${KEY.slice(-4)}, sha256:${hash}`
}

// One-time config log on cold start so the function logs explain any auth failure
console.log(
  `[seedance] config — key: [${keyFingerprint()}], model: ${MODEL}, base: ${
    clean(process.env.SEEDANCE_BASE_URL) || '(auto-detect)'
  }`,
)

// Seedance 2.0 renders synchronized audio in the same pass, so no separate TTS/mux
// step is needed — only the shots need stitching.
export const modelHasNativeAudio = () => /seedance-2/i.test(MODEL)

// Known ARK video-generation bases; the configured one (if any) is tried first.
const KNOWN_BASES = [
  'https://ark.cn-beijing.volces.com/api/v3', // Volcengine (China)
  'https://ark.ap-southeast.bytepluses.com/api/v3', // BytePlus (International)
]

const candidateBases = () => {
  const list = []
  const configured = clean(process.env.SEEDANCE_BASE_URL).replace(/\/+$/, '')
  if (configured) list.push(configured)
  for (const b of KNOWN_BASES) if (!list.includes(b)) list.push(b)
  return list
}

// Once a region authenticates, reuse it for the rest of the process
let resolvedBase = null

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${KEY}`,
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Seedance renders fixed-length clips; snap the shot duration to 5 or 10 seconds
const clampDuration = (seconds) => (Number(seconds) >= 8 ? 10 : 5)

// Seedance takes a single text prompt with command-style parameters appended
const buildText = (req) => {
  const dur = clampDuration(req.duration_seconds)
  const ratio = req.aspect_ratio || '16:9'
  const res = req.resolution || '1080p'
  return `${req.prompt} --resolution ${res} --ratio ${ratio} --duration ${dur} --watermark false`
}

// Build the ARK `content` array.
// - firstFrameUrl → image-to-video: the clip starts from that frame (role: first_frame),
//   giving shot-to-shot continuity within a scene.
// - referenceImages → canonical character reference images (role: reference_image) so the
//   character's identity stays consistent, especially on the opening shot of a scene.
// With neither, it's plain text-to-video.
const buildContent = (req, { firstFrameUrl, referenceImages } = {}) => {
  const content = [{ type: 'text', text: buildText(req) }]
  if (firstFrameUrl) {
    content.push({ type: 'image_url', image_url: { url: firstFrameUrl }, role: 'first_frame' })
  }
  for (const url of (referenceImages || []).slice(0, 4)) {
    if (url) content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' })
  }
  return content
}

// Create a video-generation task; returns { taskId, base }. Auto-detects the region
// by retrying known bases when a base rejects the key with 401/403. firstFrameUrl seeds
// the shot from a start image (frame chaining); referenceImages anchor character identity.
export const createVideoTask = async (req, { firstFrameUrl, referenceImages } = {}) => {
  if (!KEY) throw new Error('SEEDANCE_API_KEY is not configured')
  const bases = resolvedBase ? [resolvedBase] : candidateBases()
  let lastAuthError = ''

  for (const base of bases) {
    const res = await fetch(`${base}/contents/generations/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        model: MODEL,
        content: buildContent(req, { firstFrameUrl, referenceImages }),
      }),
    })

    if (res.status === 401 || res.status === 403) {
      lastAuthError = (await res.text()).slice(0, 300)
      continue // key not valid on this region — try the next
    }
    if (!res.ok) {
      throw new Error(`Seedance create error (${res.status}): ${(await res.text()).slice(0, 300)}`)
    }

    const data = await res.json()
    const id = data.id || data.task_id || data.data?.id
    if (!id) throw new Error('Seedance did not return a task id')
    resolvedBase = base
    return { taskId: id, base }
  }

  throw new Error(
    `Seedance auth failed on all regions [${bases.join(', ')}] — check SEEDANCE_API_KEY / SEEDANCE_BASE_URL. Key: [${keyFingerprint()}], model: ${MODEL}. ${lastAuthError}`,
  )
}

// Fetch a task's current state (on the base the task was created on)
export const getVideoTask = async (taskId, base) => {
  const b = base || resolvedBase || candidateBases()[0]
  const res = await fetch(`${b}/contents/generations/tasks/${taskId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    throw new Error(`Seedance query error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  return res.json()
}

const extractVideoUrl = (task) =>
  task.content?.video_url ||
  task.content?.video_urls?.[0] ||
  task.video_url ||
  task.data?.video_url ||
  ''

// Use the API's own progress if it reports one (normalized to 0–100), else undefined
const apiProgress = (task) => {
  const cand = [task.progress, task.percent, task.content?.progress, task.data?.progress].find(
    (x) => typeof x === 'number',
  )
  if (typeof cand !== 'number') return undefined
  return Math.max(0, Math.min(100, cand <= 1 ? Math.round(cand * 100) : Math.round(cand)))
}

// Estimate progress from status + elapsed time when the API doesn't report a percent
const EXPECTED_MS = 150000 // ~2.5 min for a shot to render
const estimateProgress = (status, elapsedMs) => {
  if (status === 'queued' || status === 'pending' || status === 'submitted') return 8
  return Math.min(95, 10 + Math.round((elapsedMs / EXPECTED_MS) * 85))
}

// Create a task and poll until it produces a video URL (or errors/times out). onProgress
// (if given) is called each poll with the task's progress 0–100.
export const generateVideo = async (
  req,
  { timeoutMs = 8 * 60 * 1000, intervalMs = 6000, onProgress, firstFrameUrl, referenceImages } = {},
) => {
  const { taskId, base } = await createVideoTask(req, { firstFrameUrl, referenceImages })
  const startedAt = Date.now()
  onProgress?.(6)

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(intervalMs)
    const task = await getVideoTask(taskId, base)
    const status = String(task.status || '').toLowerCase()

    if (status === 'succeeded' || status === 'success' || status === 'completed') {
      const url = extractVideoUrl(task)
      if (!url) throw new Error('Seedance succeeded but returned no video URL')
      onProgress?.(100)
      return { url, taskId }
    }
    if (status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled') {
      const msg = task.error?.message || JSON.stringify(task.error || {}).slice(0, 200)
      throw new Error(`Seedance task ${status}: ${msg}`)
    }
    // queued / running / pending → report progress and keep polling
    onProgress?.(apiProgress(task) ?? estimateProgress(status, Date.now() - startedAt))
  }
  throw new Error('Seedance task timed out')
}

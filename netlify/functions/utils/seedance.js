// SeedDance video generation (Volcengine / BytePlus ModelArk style async API).
// Flow: create a generation task, then poll the task until it succeeds and returns
// a video URL. Configure via env:
//   SEEDDANCE_API_KEY   (required) — the ARK/ModelArk API key
//   SEEDDANCE_BASE_URL  — API base; if unset/unknown we auto-detect the region
//   SEEDDANCE_MODEL     — model id (e.g. seedance-1-0-pro-...)
//
// ARK keys are region-scoped: a key from one region returns 401 "API key doesn't
// exist" on another. So on a 401 we transparently retry the known regions and cache
// whichever one authenticates.

const MODEL = process.env.SEEDDANCE_MODEL || 'seedance-1-0-pro-250528'
const KEY = process.env.SEEDDANCE_API_KEY

// Known ARK video-generation bases; the configured one (if any) is tried first.
const KNOWN_BASES = [
  'https://ark.cn-beijing.volces.com/api/v3', // Volcengine (China)
  'https://ark.ap-southeast.bytepluses.com/api/v3', // BytePlus (International)
]

const candidateBases = () => {
  const list = []
  const configured = (process.env.SEEDDANCE_BASE_URL || '').replace(/\/+$/, '')
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

// SeedDance renders fixed-length clips; snap the shot duration to 5 or 10 seconds
const clampDuration = (seconds) => (Number(seconds) >= 8 ? 10 : 5)

// SeedDance takes a single text prompt with command-style parameters appended
const buildText = (req) => {
  const dur = clampDuration(req.duration_seconds)
  const ratio = req.aspect_ratio || '16:9'
  const res = req.resolution || '1080p'
  return `${req.prompt} --resolution ${res} --ratio ${ratio} --duration ${dur} --watermark false`
}

// Create a video-generation task; returns { taskId, base }. Auto-detects the region
// by retrying known bases when a base rejects the key with 401/403.
export const createVideoTask = async (req) => {
  if (!KEY) throw new Error('SEEDDANCE_API_KEY is not configured')
  const bases = resolvedBase ? [resolvedBase] : candidateBases()
  let lastAuthError = ''

  for (const base of bases) {
    const res = await fetch(`${base}/contents/generations/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ model: MODEL, content: [{ type: 'text', text: buildText(req) }] }),
    })

    if (res.status === 401 || res.status === 403) {
      lastAuthError = (await res.text()).slice(0, 300)
      continue // key not valid on this region — try the next
    }
    if (!res.ok) {
      throw new Error(`SeedDance create error (${res.status}): ${(await res.text()).slice(0, 300)}`)
    }

    const data = await res.json()
    const id = data.id || data.task_id || data.data?.id
    if (!id) throw new Error('SeedDance did not return a task id')
    resolvedBase = base
    return { taskId: id, base }
  }

  throw new Error(
    `SeedDance auth failed on all regions [${bases.join(', ')}] — check SEEDDANCE_API_KEY / SEEDDANCE_BASE_URL. ${lastAuthError}`,
  )
}

// Fetch a task's current state (on the base the task was created on)
export const getVideoTask = async (taskId, base) => {
  const b = base || resolvedBase || candidateBases()[0]
  const res = await fetch(`${b}/contents/generations/tasks/${taskId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    throw new Error(`SeedDance query error (${res.status}): ${(await res.text()).slice(0, 300)}`)
  }
  return res.json()
}

const extractVideoUrl = (task) =>
  task.content?.video_url ||
  task.content?.video_urls?.[0] ||
  task.video_url ||
  task.data?.video_url ||
  ''

// Create a task and poll until it produces a video URL (or errors/times out)
export const generateVideo = async (req, { timeoutMs = 8 * 60 * 1000, intervalMs = 6000 } = {}) => {
  const { taskId, base } = await createVideoTask(req)
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(intervalMs)
    const task = await getVideoTask(taskId, base)
    const status = String(task.status || '').toLowerCase()

    if (status === 'succeeded' || status === 'success' || status === 'completed') {
      const url = extractVideoUrl(task)
      if (!url) throw new Error('SeedDance succeeded but returned no video URL')
      return { url, taskId }
    }
    if (status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled') {
      const msg = task.error?.message || JSON.stringify(task.error || {}).slice(0, 200)
      throw new Error(`SeedDance task ${status}: ${msg}`)
    }
    // queued / running / pending → keep polling
  }
  throw new Error('SeedDance task timed out')
}

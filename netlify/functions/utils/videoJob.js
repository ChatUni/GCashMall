// Shared runner for the video-generation phase. Reads the RIE output already saved
// on a production doc, renders each shot via Seedance, and writes the results +
// progress back to the same doc. Used by the dedicated pipeline-video-background
// function (and as an inline fallback if the hand-off trigger ever fails).

import { get, update } from './db.js'
import { generateVideo } from './seedance.js'

const updateJob = (jobId, fields) =>
  update('productions', { jobId }, { $set: { ...fields, updatedAt: new Date() } })

const percentOf = (progress) => {
  const steps = progress.calls || []
  const done = steps.filter((c) => c.status === 'done').length
  return steps.length ? Math.round((done / steps.length) * 100) : 0
}

// Generate a video for every shot in the production's RIE output and persist them.
export const runVideoGeneration = async (jobId, userId) => {
  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) throw new Error('production not found')
  const doc = docs[0]
  if (userId && String(doc.userId) !== String(userId)) {
    throw new Error('not authorized for this production')
  }

  const progress = doc.progress || { calls: [], coverStatus: 'done' }
  let vIdx = (progress.calls || []).findIndex((c) => c.key === 'videoGeneration')
  if (vIdx < 0) {
    progress.calls = [...(progress.calls || []), { key: 'videoGeneration', status: 'pending' }]
    vIdx = progress.calls.length - 1
  }

  const requests = doc.calls?.renderingEngine?.rendering_plan?.provider_requests || []
  progress.calls[vIdx].status = 'running'
  // Mark the whole production 'running' again (matters when this is a retry of a
  // previously-finished job) so the client keeps polling until videos complete.
  // Keep shots that already rendered successfully; only (re)generate the rest.
  const kept = new Map(
    (doc.videos || []).filter((v) => v && v.url).map((v) => [v.shot_id, v]),
  )
  const videos = []
  const total = requests.length
  const shotPct = new Array(total).fill(0) // per-shot progress 0–100 (shots run in parallel)
  let completed = 0
  let lastWrite = 0

  const avgPct = () => Math.round(shotPct.reduce((a, b) => a + b, 0) / (total || 1))
  // Throttled, fire-and-forget write of the averaged progress (mid-render updates)
  const pushProgress = () => {
    const now = Date.now()
    if (now - lastWrite < 3000) return
    lastWrite = now
    updateJob(jobId, { videoProgress: { percent: avgPct(), done: completed, total } }).catch(() => {})
  }

  await updateJob(jobId, {
    status: 'running',
    progress,
    percent: percentOf(progress),
    videoProgress: { percent: 0, done: 0, total },
  })

  await Promise.all(
    requests.map(async (req, i) => {
      const cached = kept.get(req.shot_id)
      if (cached) {
        videos.push(cached)
        shotPct[i] = 100
      } else {
        try {
          const { url } = await generateVideo(req, {
            onProgress: (p) => {
              shotPct[i] = p
              pushProgress()
            },
          })
          videos.push({ shot_id: req.shot_id, shot_number: req.shot_number ?? null, url })
          shotPct[i] = 100
        } catch (error) {
          console.error(`Video ${req.shot_id} failed:`, error.message)
          videos.push({
            shot_id: req.shot_id,
            shot_number: req.shot_number ?? null,
            error: String(error.message || error),
          })
          shotPct[i] = 100 // count a failed shot as "done" for the bar
        }
      }
      // Surface each shot + the averaged progress as soon as it finishes
      completed++
      const sorted = [...videos].sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))
      await updateJob(jobId, {
        videos: sorted,
        videoProgress: { percent: avgPct(), done: completed, total },
      })
    }),
  )
  videos.sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))

  // Video is done, but leave overall status 'running' — the audio/composition step
  // runs next and is what finalizes the production as 'done'.
  progress.calls[vIdx].status = 'done'
  await updateJob(jobId, { progress, videos, percent: percentOf(progress) })
}

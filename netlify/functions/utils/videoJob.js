// Shared runner for the video-generation phase. Reads the RIE output already saved
// on a production doc, renders each shot via SeedDance, and writes the results +
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
  await updateJob(jobId, { status: 'running', progress, percent: percentOf(progress) })

  // Keep shots that already rendered successfully; only (re)generate the rest.
  const kept = new Map(
    (doc.videos || []).filter((v) => v && v.url).map((v) => [v.shot_id, v]),
  )
  const videos = []
  await Promise.all(
    requests.map(async (req) => {
      const done = kept.get(req.shot_id)
      if (done) {
        videos.push(done)
        return
      }
      try {
        const { url } = await generateVideo(req)
        videos.push({ shot_id: req.shot_id, shot_number: req.shot_number ?? null, url })
      } catch (error) {
        console.error(`Video ${req.shot_id} failed:`, error.message)
        videos.push({
          shot_id: req.shot_id,
          shot_number: req.shot_number ?? null,
          error: String(error.message || error),
        })
      }
    }),
  )
  videos.sort((a, b) => (a.shot_number ?? 0) - (b.shot_number ?? 0))

  progress.calls[vIdx].status = 'done'
  await updateJob(jobId, { progress, videos, status: 'done', percent: 100 })
}
